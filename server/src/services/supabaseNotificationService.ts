import { serverTables, supabase } from '../lib/supabase';
import * as cron from 'node-cron';

// Types for notifications
type NotificationType = 'session_reminder' | 'session_confirmation' | 'session_cancelled' | 'reflection_submitted';
type NotificationChannel = 'email' | 'in_app' | 'sms' | 'push';
type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

interface NotificationData {
  recipient_id: string;
  sender_id?: string;
  session_id?: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject: string;
  html_body: string;
  text_body: string;
  variables?: Record<string, any>;
  priority?: NotificationPriority;
  scheduled_at?: string;
}

interface SessionReminderData {
  session_id: string;
  client_id: string;
  coach_id: string;
  session_date: string;
  hours_before?: number;
}

export class SupabaseNotificationService {
  private static instance: SupabaseNotificationService;
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private isInitialized = false;

  constructor() {
    if (SupabaseNotificationService.instance) {
      return SupabaseNotificationService.instance;
    }
    SupabaseNotificationService.instance = this;
  }

  public static getInstance(): SupabaseNotificationService {
    if (!SupabaseNotificationService.instance) {
      SupabaseNotificationService.instance = new SupabaseNotificationService();
    }
    return SupabaseNotificationService.instance;
  }

  /**
   * Initialize the notification service and start cron jobs
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[NotificationService] Already initialized');
      return;
    }

    console.log('[NotificationService] Initializing...');

    // Schedule reminder processing every 15 minutes
    const reminderTask = cron.schedule('*/15 * * * *', async () => {
      await this.processScheduledReminders();
    }, {
      timezone: 'UTC'
    });

    // Start the cron job
    reminderTask.start();
    this.cronJobs.set('reminders', reminderTask);

    this.isInitialized = true;
    console.log('[NotificationService] Initialized successfully');

    // Process any pending reminders immediately
    await this.processScheduledReminders();
  }

  /**
   * Create a notification record in the database
   */
  public async createNotification(data: NotificationData): Promise<string | null> {
    try {
      const { data: notification, error } = await serverTables.notifications()
        .insert({
          recipient_id: data.recipient_id,
          sender_id: data.sender_id || null,
          session_id: data.session_id || null,
          type: data.type,
          channel: data.channel,
          status: 'pending' as NotificationStatus,
          subject: data.subject,
          html_body: data.html_body,
          text_body: data.text_body,
          variables: data.variables || {},
          priority: data.priority || 'medium',
          scheduled_at: data.scheduled_at || new Date().toISOString(),
          retry_count: 0,
          max_retries: 3,
        })
        .select('id')
        .single();

      if (error) {
        console.error('[NotificationService] Error creating notification:', error);
        return null;
      }

      console.log(`[NotificationService] Created notification ${notification.id}`);
      return notification.id;
    } catch (error) {
      console.error('[NotificationService] Error creating notification:', error);
      return null;
    }
  }

  /**
   * Schedule session reminders for both client and coach
   */
  public async scheduleSessionReminders(data: SessionReminderData): Promise<boolean> {
    try {
      const { session_id, client_id, coach_id, session_date, hours_before = 24 } = data;
      
      // Calculate reminder time (24 hours before session by default)
      const sessionDateTime = new Date(session_date);
      const reminderDateTime = new Date(sessionDateTime.getTime() - (hours_before * 60 * 60 * 1000));

      // Don't schedule reminders for past times
      if (reminderDateTime <= new Date()) {
        console.log(`[NotificationService] Skipping reminder for session ${session_id} - reminder time is in the past`);
        return false;
      }

      // Create reminder notifications for both client and coach
      const clientNotificationId = await this.createNotification({
        recipient_id: client_id,
        sender_id: coach_id,
        session_id,
        type: 'session_reminder',
        channel: 'email',
        subject: 'Upcoming Coaching Session Reminder',
        html_body: `<p>You have a coaching session scheduled for ${new Date(session_date).toLocaleString()}</p>`,
        text_body: `You have a coaching session scheduled for ${new Date(session_date).toLocaleString()}`,
        priority: 'medium',
        scheduled_at: reminderDateTime.toISOString(),
      });

      const coachNotificationId = await this.createNotification({
        recipient_id: coach_id,
        sender_id: client_id,
        session_id,
        type: 'session_reminder',
        channel: 'email',
        subject: 'Upcoming Coaching Session Reminder',
        html_body: `<p>You have a coaching session scheduled for ${new Date(session_date).toLocaleString()}</p>`,
        text_body: `You have a coaching session scheduled for ${new Date(session_date).toLocaleString()}`,
        priority: 'medium',
        scheduled_at: reminderDateTime.toISOString(),
      });

      const success = !!(clientNotificationId && coachNotificationId);
      console.log(`[NotificationService] Scheduled reminders for session ${session_id}: ${success ? 'SUCCESS' : 'FAILED'}`);
      return success;
    } catch (error) {
      console.error('[NotificationService] Error scheduling session reminders:', error);
      return false;
    }
  }

  /**
   * Process scheduled reminders that are due to be sent
   */
  public async processScheduledReminders(): Promise<void> {
    try {
      const now = new Date().toISOString();

      // Get all pending notifications that are scheduled to be sent now
      const { data: pendingNotifications, error } = await serverTables.notifications()
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_at', now);

      if (error) {
        console.error('[NotificationService] Error fetching pending notifications:', error);
        return;
      }

      if (!pendingNotifications || pendingNotifications.length === 0) {
        return;
      }

      console.log(`[NotificationService] Processing ${pendingNotifications.length} pending notifications`);

      for (const notification of pendingNotifications) {
        await this.sendNotification(notification);
      }
    } catch (error) {
      console.error('[NotificationService] Error processing scheduled reminders:', error);
    }
  }

  /**
   * Send a notification (placeholder - integrate with email service)
   */
  private async sendNotification(notification: any): Promise<void> {
    try {
      // TODO: Integrate with actual email service (Resend) and push notification service (OneSignal)
      
      // For now, just mark as sent and log
      console.log(`[NotificationService] Sending ${notification.type} to ${notification.recipient_id}`);
      
      // Update notification status to sent
      const { error } = await serverTables.notifications()
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', notification.id);

      if (error) {
        console.error(`[NotificationService] Error updating notification ${notification.id}:`, error);
      } else {
        console.log(`[NotificationService] Successfully sent notification ${notification.id}`);
      }
    } catch (error) {
      console.error(`[NotificationService] Error sending notification ${notification.id}:`, error);
    }
  }

  /**
   * Cancel reminders for a session (when session is cancelled or rescheduled)
   */
  public async cancelSessionReminders(sessionId: string): Promise<boolean> {
    try {
      const { error } = await serverTables.notifications()
        .update({ status: 'failed', failure_reason: 'Session cancelled' })
        .eq('session_id', sessionId)
        .eq('status', 'pending');

      if (error) {
        console.error('[NotificationService] Error cancelling session reminders:', error);
        return false;
      }

      console.log(`[NotificationService] Cancelled reminders for session ${sessionId}`);
      return true;
    } catch (error) {
      console.error('[NotificationService] Error cancelling session reminders:', error);
      return false;
    }
  }
}

// Create singleton instance
export const supabaseNotificationService = SupabaseNotificationService.getInstance(); 