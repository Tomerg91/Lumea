import * as cron from 'node-cron';
import { CoachingSession } from '../models/CoachingSession';
import { NotificationService } from './notificationService';
import { NotificationPreferences } from '../models/NotificationPreferences';
import { User } from '../models/User';

interface ScheduledReminder {
  sessionId: string;
  recipientId: string;
  scheduledFor: Date;
  type: 'reminder' | 'confirmation';
  sent: boolean;
}

export class NotificationSchedulerService {
  private static instance: NotificationSchedulerService;
  private scheduledReminders: Map<string, ScheduledReminder> = new Map();
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private isRunning: boolean = false;

  constructor() {
    if (NotificationSchedulerService.instance) {
      return NotificationSchedulerService.instance;
    }
    NotificationSchedulerService.instance = this;
  }

  /**
   * Initialize the scheduler and start background tasks
   */
  public async initialize(): Promise<void> {
    if (this.isRunning) {
      console.log('Notification scheduler is already running');
      return;
    }

    console.log('Initializing notification scheduler...');
    
    // Schedule session reminder checks every 15 minutes
    const reminderTask = cron.schedule('*/15 * * * *', async () => {
      await this.processUpcomingSessionReminders();
    }, {
      timezone: 'UTC'
    });

    // Schedule session confirmation checks every hour
    const confirmationTask = cron.schedule('0 * * * *', async () => {
      await this.processSessionConfirmations();
    }, {
      timezone: 'UTC'
    });

    // Schedule cleanup of old scheduled reminders every day at midnight
    const cleanupTask = cron.schedule('0 0 * * *', async () => {
      await this.cleanupOldReminders();
    }, {
      timezone: 'UTC'
    });

    // Start all cron jobs
    reminderTask.start();
    confirmationTask.start();
    cleanupTask.start();

    this.cronJobs.set('reminders', reminderTask);
    this.cronJobs.set('confirmations', confirmationTask);
    this.cronJobs.set('cleanup', cleanupTask);

    this.isRunning = true;
    console.log('Notification scheduler started successfully');

    // Process any pending reminders immediately
    await this.processUpcomingSessionReminders();
    await this.processSessionConfirmations();
  }

  /**
   * Stop the scheduler and cleanup resources
   */
  public async shutdown(): Promise<void> {
    console.log('Shutting down notification scheduler...');
    
    this.cronJobs.forEach((task, name) => {
      task.stop();
      console.log(`Stopped cron job: ${name}`);
    });
    
    this.cronJobs.clear();
    this.scheduledReminders.clear();
    this.isRunning = false;
    
    console.log('Notification scheduler stopped');
  }

  /**
   * Schedule reminders for a new session
   */
  public async scheduleSessionReminders(session: any): Promise<void> {
    try {
      // Get coach and client details
      const coach = await User.findById(session.coachId);
      const client = await User.findById(session.clientId);

      if (!coach || !client) {
        console.error('Cannot schedule reminders: coach or client not found');
        return;
      }

      // Schedule reminders for both coach and client
      await this.scheduleUserReminders(session, coach);
      await this.scheduleUserReminders(session, client);

      console.log(`Scheduled reminders for session ${session._id}`);
    } catch (error) {
      console.error('Error scheduling session reminders:', error);
    }
  }

  /**
   * Schedule reminders for a specific user based on their preferences
   */
  private async scheduleUserReminders(session: any, user: any): Promise<void> {
    try {
      // Get user's notification preferences
      const preferences = await (NotificationPreferences as any).getOrCreateForUser(user._id);
      
      // Check if session reminders are enabled
      if (!preferences.notificationTypes.sessionReminders) {
        return;
      }

      // Get reminder times based on user preferences
      const sessionDate = new Date(session.date);
      const reminderTimes = preferences.getReminderTimes(sessionDate);

      // Schedule each reminder
      for (const reminderTime of reminderTimes) {
        // Only schedule future reminders
        if (reminderTime > new Date()) {
          const reminderId = `${session._id}_${user._id}_${reminderTime.getTime()}`;
          
          const reminder: ScheduledReminder = {
            sessionId: session._id.toString(),
            recipientId: user._id.toString(),
            scheduledFor: reminderTime,
            type: 'reminder',
            sent: false
          };

          this.scheduledReminders.set(reminderId, reminder);
        }
      }
    } catch (error) {
      console.error('Error scheduling user reminders:', error);
    }
  }

  /**
   * Cancel reminders for a session (when session is cancelled or rescheduled)
   */
  public async cancelSessionReminders(sessionId: string): Promise<void> {
    const keysToRemove: string[] = [];
    
    this.scheduledReminders.forEach((reminder, key) => {
      if (reminder.sessionId === sessionId && !reminder.sent) {
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach(key => {
      this.scheduledReminders.delete(key);
    });

    console.log(`Cancelled ${keysToRemove.length} reminders for session ${sessionId}`);
  }

  /**
   * Process upcoming session reminders
   */
  private async processUpcomingSessionReminders(): Promise<void> {
    try {
      const now = new Date();
      const upcomingReminders: ScheduledReminder[] = [];

      // Find reminders that should be sent now
      this.scheduledReminders.forEach((reminder, key) => {
        if (!reminder.sent && reminder.scheduledFor <= now) {
          upcomingReminders.push(reminder);
        }
      });

      console.log(`Processing ${upcomingReminders.length} upcoming reminders`);

      // Send each reminder
      for (const reminder of upcomingReminders) {
        await this.sendScheduledReminder(reminder);
      }
    } catch (error) {
      console.error('Error processing upcoming session reminders:', error);
    }
  }

  /**
   * Send a scheduled reminder
   */
  private async sendScheduledReminder(reminder: ScheduledReminder): Promise<void> {
    try {
      // Get session details
      const session = await CoachingSession.findById(reminder.sessionId)
        .populate('coachId clientId');

      if (!session) {
        console.error(`Session not found for reminder: ${reminder.sessionId}`);
        this.markReminderAsSent(reminder.sessionId, reminder.recipientId);
        return;
      }

      // Check if session is still active (not cancelled)
      if (session.status === 'cancelled') {
        console.log(`Skipping reminder for cancelled session: ${reminder.sessionId}`);
        this.markReminderAsSent(reminder.sessionId, reminder.recipientId);
        return;
      }

      // Get recipient details
      const recipient = await User.findById(reminder.recipientId);
      if (!recipient) {
        console.error(`Recipient not found for reminder: ${reminder.recipientId}`);
        this.markReminderAsSent(reminder.sessionId, reminder.recipientId);
        return;
      }

      // Get user preferences to determine channels
      const preferences = await (NotificationPreferences as any).getOrCreateForUser(reminder.recipientId);
      const channels = [];
      
      if (preferences.channels.email) channels.push('email');
      if (preferences.channels.inApp) channels.push('in_app');
      if (preferences.channels.push) channels.push('push');

      if (channels.length === 0) {
        console.log(`No notification channels enabled for user ${reminder.recipientId}`);
        this.markReminderAsSent(reminder.sessionId, reminder.recipientId);
        return;
      }

      // Send the reminder
      await NotificationService.sendSessionReminders(session, preferences.reminderTiming.hoursBefore);
      
      // Mark as sent
      this.markReminderAsSent(reminder.sessionId, reminder.recipientId);

      console.log(`Sent session reminder for session ${reminder.sessionId} to user ${reminder.recipientId}`);
    } catch (error) {
      console.error('Error sending scheduled reminder:', error);
    }
  }

  /**
   * Mark a reminder as sent
   */
  private markReminderAsSent(sessionId: string, recipientId: string): void {
    this.scheduledReminders.forEach((reminder, key) => {
      if (reminder.sessionId === sessionId && reminder.recipientId === recipientId) {
        reminder.sent = true;
      }
    });
  }

  /**
   * Process session confirmations (send confirmations for newly booked sessions)
   */
  private async processSessionConfirmations(): Promise<void> {
    try {
      // Find sessions that were created in the last hour and need confirmation
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const newSessions = await CoachingSession.find({
        createdAt: { $gte: oneHourAgo },
        status: 'scheduled',
        // Add a field to track if confirmation was sent
        confirmationSent: { $ne: true }
      }).populate('coachId clientId');

      console.log(`Processing ${newSessions.length} session confirmations`);

      for (const session of newSessions) {
        await this.sendSessionConfirmation(session);
      }
    } catch (error) {
      console.error('Error processing session confirmations:', error);
    }
  }

  /**
   * Send session confirmation
   */
  private async sendSessionConfirmation(session: any): Promise<void> {
    try {
      const coach = session.coachId;
      const client = session.clientId;

      if (!coach || !client) {
        console.error('Cannot send confirmation: coach or client not found');
        return;
      }

      // Send confirmation to both coach and client
      await NotificationService.sendSessionConfirmation(session, coach);
      await NotificationService.sendSessionConfirmation(session, client);

      // Mark confirmation as sent (add this field to the schema if needed)
      await CoachingSession.findByIdAndUpdate(session._id, {
        confirmationSent: true
      });

      console.log(`Sent session confirmation for session ${session._id}`);
    } catch (error) {
      console.error('Error sending session confirmation:', error);
    }
  }

  /**
   * Cleanup old reminders (remove sent reminders older than 7 days)
   */
  private async cleanupOldReminders(): Promise<void> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const keysToRemove: string[] = [];

      this.scheduledReminders.forEach((reminder, key) => {
        if (reminder.sent && reminder.scheduledFor < sevenDaysAgo) {
          keysToRemove.push(key);
        }
      });

      keysToRemove.forEach(key => {
        this.scheduledReminders.delete(key);
      });

      console.log(`Cleaned up ${keysToRemove.length} old reminders`);
    } catch (error) {
      console.error('Error cleaning up old reminders:', error);
    }
  }

  /**
   * Get scheduled reminders (for admin interface)
   */
  public getScheduledReminders(): ScheduledReminder[] {
    return Array.from(this.scheduledReminders.values());
  }

  /**
   * Get reminder statistics (for admin interface)
   */
  public getReminderStats(): {
    total: number;
    pending: number;
    sent: number;
    upcoming: number;
  } {
    const reminders = this.getScheduledReminders();
    const now = new Date();
    
    return {
      total: reminders.length,
      pending: reminders.filter(r => !r.sent).length,
      sent: reminders.filter(r => r.sent).length,
      upcoming: reminders.filter(r => !r.sent && r.scheduledFor > now).length
    };
  }

  /**
   * Force process reminders (for admin interface)
   */
  public async forceProcessReminders(): Promise<void> {
    await this.processUpcomingSessionReminders();
    await this.processSessionConfirmations();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): NotificationSchedulerService {
    if (!NotificationSchedulerService.instance) {
      NotificationSchedulerService.instance = new NotificationSchedulerService();
    }
    return NotificationSchedulerService.instance;
  }
}

// Export singleton instance
export const notificationScheduler = NotificationSchedulerService.getInstance();
export default notificationScheduler; 