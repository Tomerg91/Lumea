import { Types } from 'mongoose';
import { CoachingSession, ICoachingSession } from '../models/CoachingSession';
import { SessionFeedback } from '../models/SessionFeedback';
import { NotificationService } from './notificationService';
import { NotificationPreferences } from '../models/NotificationPreferences';
import { User, IUser } from '../models/User';
import { NotificationChannel } from '../models/Notification';
import * as cron from 'node-cron';

export interface FeedbackTriggerConfig {
  initialDelayHours: number; // Default: 24 hours
  reminderIntervals: number[]; // Follow-up reminders in hours [48, 72, 168]
  maxReminders: number; // Maximum number of reminders
  optOutEnabled: boolean;
  abTestEnabled: boolean;
  abTestGroups: ABTestGroup[];
}

export interface ABTestGroup {
  name: string;
  percentage: number; // 0-100
  config: {
    delayHours: number;
    subject: string;
    message: string;
  };
}

export interface FeedbackRequest {
  sessionId: string;
  recipientId: string;
  recipientType: 'coach' | 'client';
  triggerType: 'initial' | 'reminder';
  reminderNumber?: number;
  abTestGroup?: string;
  scheduledAt: Date;
  sentAt?: Date;
  status: 'pending' | 'sent' | 'completed' | 'opted_out' | 'failed';
}

export class FeedbackTriggerService {
  private static instance: FeedbackTriggerService;
  private defaultConfig: FeedbackTriggerConfig = {
    initialDelayHours: 24,
    reminderIntervals: [48, 72, 168], // 2 days, 3 days, 1 week
    maxReminders: 3,
    optOutEnabled: true,
    abTestEnabled: false,
    abTestGroups: [
      {
        name: 'standard',
        percentage: 50,
        config: {
          delayHours: 24,
          subject: 'How was your coaching session?',
          message: 'We\'d love to hear about your experience in today\'s session.'
        }
      },
      {
        name: 'early',
        percentage: 50,
        config: {
          delayHours: 2,
          subject: 'Quick feedback on your session',
          message: 'While the session is still fresh, could you share your thoughts?'
        }
      }
    ]
  };

  private feedbackRequests: Map<string, FeedbackRequest[]> = new Map();
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();

  public static getInstance(): FeedbackTriggerService {
    if (!FeedbackTriggerService.instance) {
      FeedbackTriggerService.instance = new FeedbackTriggerService();
    }
    return FeedbackTriggerService.instance;
  }

  /**
   * Initialize the feedback trigger service with cron jobs
   */
  public async initialize(): Promise<void> {
    console.log('Initializing Feedback Trigger Service...');
    
         // Run every hour to check for pending feedback requests
     const hourlyJob = cron.schedule('0 * * * *', async () => {
       await this.processPendingRequests();
     });

     // Run daily to clean up completed/expired requests
     const dailyJob = cron.schedule('0 2 * * *', async () => {
       await this.cleanupExpiredRequests();
     });

    this.cronJobs.set('hourly', hourlyJob);
    this.cronJobs.set('daily', dailyJob);

    // Start the jobs
    hourlyJob.start();
    dailyJob.start();

    // Load pending requests from database on startup
    await this.loadPendingRequests();

    console.log('Feedback Trigger Service initialized successfully');
  }

  /**
   * Trigger feedback requests when a session is completed
   */
  public async onSessionCompleted(session: ICoachingSession): Promise<void> {
    try {
      console.log(`Session completed: ${session._id}, triggering feedback requests...`);

      // Check if feedback has already been requested for this session
      const existingFeedback = await this.checkExistingFeedback(session._id.toString());
      if (existingFeedback.coachRequested && existingFeedback.clientRequested) {
        console.log(`Feedback already requested for session ${session._id}`);
        return;
      }

      // Get user preferences for both coach and client
      const coach = await User.findById(session.coachId);
      const client = await User.findById(session.clientId);

      if (!coach || !client) {
        console.error(`Could not find coach or client for session ${session._id}`);
        return;
      }

      const coachPrefs = await NotificationPreferences.findOne({ userId: coach._id });
      const clientPrefs = await NotificationPreferences.findOne({ userId: client._id });

      // Create feedback requests for both coach and client
      if (!existingFeedback.coachRequested && this.shouldRequestFeedback(coachPrefs, 'coach')) {
        await this.createFeedbackRequest(session, coach._id.toString(), 'coach');
      }

      if (!existingFeedback.clientRequested && this.shouldRequestFeedback(clientPrefs, 'client')) {
        await this.createFeedbackRequest(session, client._id.toString(), 'client');
      }

    } catch (error) {
      console.error('Error triggering feedback requests:', error);
    }
  }

  /**
   * Create a feedback request for a user
   */
  private async createFeedbackRequest(
    session: ICoachingSession,
    recipientId: string,
    recipientType: 'coach' | 'client'
  ): Promise<void> {
    try {
      const config = this.getConfigForUser(recipientId);
      const abTestGroup = this.selectABTestGroup();
      
      const delayHours = config.abTestEnabled && abTestGroup 
        ? abTestGroup.config.delayHours 
        : config.initialDelayHours;

      const scheduledAt = new Date(session.completedAt || new Date());
      scheduledAt.setHours(scheduledAt.getHours() + delayHours);

      const request: FeedbackRequest = {
        sessionId: session._id.toString(),
        recipientId,
        recipientType,
        triggerType: 'initial',
        abTestGroup: abTestGroup?.name,
        scheduledAt,
        status: 'pending'
      };

      // Store the request
      const sessionKey = session._id.toString();
      if (!this.feedbackRequests.has(sessionKey)) {
        this.feedbackRequests.set(sessionKey, []);
      }
      this.feedbackRequests.get(sessionKey)!.push(request);

      // Schedule follow-up reminders
      await this.scheduleReminders(session, recipientId, recipientType, config);

      console.log(`Feedback request created for ${recipientType} ${recipientId}, scheduled for ${scheduledAt}`);

    } catch (error) {
      console.error('Error creating feedback request:', error);
    }
  }

  /**
   * Schedule reminder notifications
   */
  private async scheduleReminders(
    session: ICoachingSession,
    recipientId: string,
    recipientType: 'coach' | 'client',
    config: FeedbackTriggerConfig
  ): Promise<void> {
    const sessionKey = session._id.toString();
    const baseTime = new Date(session.completedAt || new Date());

    for (let i = 0; i < Math.min(config.reminderIntervals.length, config.maxReminders); i++) {
      const reminderTime = new Date(baseTime);
      reminderTime.setHours(reminderTime.getHours() + config.reminderIntervals[i]);

      const reminderRequest: FeedbackRequest = {
        sessionId: session._id.toString(),
        recipientId,
        recipientType,
        triggerType: 'reminder',
        reminderNumber: i + 1,
        scheduledAt: reminderTime,
        status: 'pending'
      };

      this.feedbackRequests.get(sessionKey)!.push(reminderRequest);
    }
  }

  /**
   * Process all pending feedback requests
   */
  private async processPendingRequests(): Promise<void> {
    const now = new Date();
    let processedCount = 0;

    for (const [sessionId, requests] of this.feedbackRequests.entries()) {
      for (const request of requests) {
        if (request.status === 'pending' && request.scheduledAt <= now) {
          try {
            // Check if feedback was already submitted
            const feedbackExists = await this.checkFeedbackSubmitted(
              request.sessionId,
              request.recipientId,
              request.recipientType
            );

            if (feedbackExists) {
              request.status = 'completed';
              continue;
            }

            // Send the feedback request
            await this.sendFeedbackRequest(request);
            request.status = 'sent';
            request.sentAt = now;
            processedCount++;

          } catch (error) {
            console.error(`Error processing feedback request for session ${sessionId}:`, error);
            request.status = 'failed';
          }
        }
      }
    }

    if (processedCount > 0) {
      console.log(`Processed ${processedCount} feedback requests`);
    }
  }

  /**
   * Send a feedback request notification
   */
  private async sendFeedbackRequest(request: FeedbackRequest): Promise<void> {
    try {
      const session = await CoachingSession.findById(request.sessionId)
        .populate('coachId clientId');
      
      if (!session) {
        throw new Error(`Session not found: ${request.sessionId}`);
      }

      const recipient = request.recipientType === 'coach' ? session.coachId : session.clientId;
      const coach = typeof session.coachId === 'object' ? session.coachId : null;
      const client = typeof session.clientId === 'object' ? session.clientId : null;

      if (!recipient || !coach || !client) {
        throw new Error('Invalid session data for feedback request');
      }

      // Get user preferences to determine notification channels
      const prefs = await NotificationPreferences.findOne({ userId: recipient._id });
      const channels = this.getNotificationChannels(prefs);

      if (channels.length === 0) {
        console.log(`No notification channels enabled for user ${recipient._id}`);
        return;
      }

      // Get messaging based on A/B test group or default
      const config = this.getConfigForUser(request.recipientId);
      const messaging = this.getFeedbackRequestMessaging(request, config);

             // Create notification variables
       const variables = {
         recipientName: (recipient as IUser).firstName,
         sessionDate: session.date.toLocaleDateString(),
         coachName: (coach as IUser).firstName,
         clientName: (client as IUser).firstName,
         feedbackUrl: `${process.env.CLIENT_URL}/feedback/${request.sessionId}?type=${request.recipientType}`,
         optOutUrl: `${process.env.CLIENT_URL}/feedback/opt-out?token=${this.generateOptOutToken(request)}`
       };

      // Send notification
      await NotificationService.createSessionNotification({
        recipientId: recipient._id.toString(),
        sessionId: session._id.toString(),
        type: 'feedback_request' as any, // We'll need to add this type
        channels,
        priority: request.triggerType === 'reminder' ? 'high' : 'medium',
        variables: {
          ...variables,
          subject: messaging.subject,
          message: messaging.message,
          isReminder: request.triggerType === 'reminder' ? 'true' : 'false',
          reminderNumber: request.reminderNumber?.toString() || '0'
        }
      });

      console.log(`Feedback request sent to ${request.recipientType} ${request.recipientId} for session ${request.sessionId}`);

    } catch (error) {
      console.error('Error sending feedback request:', error);
      throw error;
    }
  }

     /**
    * Get notification channels based on user preferences
    */
   private getNotificationChannels(prefs: any): NotificationChannel[] {
     if (!prefs) {
       return ['email', 'in_app']; // Default channels
     }

     const channels: NotificationChannel[] = [];
     if (prefs.channels?.email) channels.push('email');
     if (prefs.channels?.inApp) channels.push('in_app');
     if (prefs.channels?.sms) channels.push('sms');
     if (prefs.channels?.push) channels.push('push');

     return channels.length > 0 ? channels : ['email', 'in_app'];
   }

  /**
   * Get messaging for feedback request based on A/B test group
   */
  private getFeedbackRequestMessaging(request: FeedbackRequest, config: FeedbackTriggerConfig) {
    if (config.abTestEnabled && request.abTestGroup) {
      const group = config.abTestGroups.find(g => g.name === request.abTestGroup);
      if (group) {
        return {
          subject: group.config.subject,
          message: group.config.message
        };
      }
    }

    // Default messaging
    if (request.triggerType === 'reminder') {
      return {
        subject: `Reminder: Share your feedback on recent session`,
        message: `We noticed you haven't shared feedback on your recent coaching session yet. Your input helps us improve the experience.`
      };
    }

    return {
      subject: 'How was your coaching session?',
      message: 'We\'d love to hear about your experience in your recent coaching session. Your feedback helps us provide better service.'
    };
  }

  /**
   * Check if feedback has already been submitted
   */
  private async checkFeedbackSubmitted(
    sessionId: string,
    recipientId: string,
    recipientType: 'coach' | 'client'
  ): Promise<boolean> {
    const feedback = await SessionFeedback.findOne({
      sessionId: new Types.ObjectId(sessionId),
      submittedBy: new Types.ObjectId(recipientId),
      feedbackType: recipientType,
      status: { $in: ['submitted', 'reviewed'] }
    });

    return !!feedback;
  }

  /**
   * Check if feedback has already been requested for this session
   */
  private async checkExistingFeedback(sessionId: string): Promise<{
    coachRequested: boolean;
    clientRequested: boolean;
  }> {
    const session = await CoachingSession.findById(sessionId);
    if (!session) {
      return { coachRequested: false, clientRequested: false };
    }

    // Check if we already have requests for this session
    const requests = this.feedbackRequests.get(sessionId) || [];
    
    const coachRequested = requests.some(r => r.recipientType === 'coach');
    const clientRequested = requests.some(r => r.recipientType === 'client');

    return { coachRequested, clientRequested };
  }

  /**
   * Determine if feedback should be requested for a user
   */
  private shouldRequestFeedback(prefs: any, userType: 'coach' | 'client'): boolean {
    if (!prefs) {
      return true; // Default to requesting feedback if no preferences
    }

    // Check if feedback notifications are enabled
    return prefs.notificationTypes?.sessionFeedback !== false;
  }

  /**
   * Get configuration for a specific user (for A/B testing)
   */
  private getConfigForUser(userId: string): FeedbackTriggerConfig {
    // For now, return default config
    // In the future, this could be personalized based on user behavior
    return this.defaultConfig;
  }

  /**
   * Select A/B test group based on percentages
   */
  private selectABTestGroup(): ABTestGroup | null {
    if (!this.defaultConfig.abTestEnabled) {
      return null;
    }

    const random = Math.random() * 100;
    let cumulative = 0;

    for (const group of this.defaultConfig.abTestGroups) {
      cumulative += group.percentage;
      if (random <= cumulative) {
        return group;
      }
    }

    return this.defaultConfig.abTestGroups[0]; // Fallback
  }

  /**
   * Generate opt-out token for unsubscribe links
   */
  private generateOptOutToken(request: FeedbackRequest): string {
    // Simple token generation - in production, use proper JWT or secure tokens
    return Buffer.from(`${request.sessionId}:${request.recipientId}:${Date.now()}`).toString('base64');
  }

  /**
   * Handle feedback opt-out
   */
  public async handleOptOut(token: string): Promise<boolean> {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [sessionId, recipientId] = decoded.split(':');

      // Update user preferences to disable feedback notifications
      await NotificationPreferences.findOneAndUpdate(
        { userId: new Types.ObjectId(recipientId) },
        { 
          $set: { 
            'notificationTypes.sessionFeedback': false 
          }
        },
        { upsert: true }
      );

      // Mark all pending requests for this user as opted out
      for (const [, requests] of this.feedbackRequests.entries()) {
        requests
          .filter(r => r.recipientId === recipientId && r.status === 'pending')
          .forEach(r => r.status = 'opted_out');
      }

      console.log(`User ${recipientId} opted out of feedback notifications`);
      return true;

    } catch (error) {
      console.error('Error handling opt-out:', error);
      return false;
    }
  }

  /**
   * Load pending requests from database on startup
   */
  private async loadPendingRequests(): Promise<void> {
    // In a production system, you'd store pending requests in database
    // For now, this is a placeholder for in-memory storage
    console.log('Loading pending feedback requests from storage...');
  }

  /**
   * Clean up expired and completed requests
   */
  private async cleanupExpiredRequests(): Promise<void> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    let cleanedCount = 0;

    for (const [sessionId, requests] of this.feedbackRequests.entries()) {
      // Remove completed, failed, or very old requests
      const filteredRequests = requests.filter(r => {
        const shouldRemove = r.status === 'completed' || 
                           r.status === 'failed' || 
                           r.scheduledAt < oneWeekAgo;
        if (shouldRemove) cleanedCount++;
        return !shouldRemove;
      });

      if (filteredRequests.length === 0) {
        this.feedbackRequests.delete(sessionId);
      } else {
        this.feedbackRequests.set(sessionId, filteredRequests);
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired feedback requests`);
    }
  }

  /**
   * Get statistics about feedback trigger performance
   */
  public getStatistics(): {
    totalRequests: number;
    pendingRequests: number;
    sentRequests: number;
    completedRequests: number;
    optedOutRequests: number;
    failedRequests: number;
  } {
    let totalRequests = 0;
    let pendingRequests = 0;
    let sentRequests = 0;
    let completedRequests = 0;
    let optedOutRequests = 0;
    let failedRequests = 0;

    for (const [, requests] of this.feedbackRequests.entries()) {
      for (const request of requests) {
        totalRequests++;
        switch (request.status) {
          case 'pending': pendingRequests++; break;
          case 'sent': sentRequests++; break;
          case 'completed': completedRequests++; break;
          case 'opted_out': optedOutRequests++; break;
          case 'failed': failedRequests++; break;
        }
      }
    }

    return {
      totalRequests,
      pendingRequests,
      sentRequests,
      completedRequests,
      optedOutRequests,
      failedRequests
    };
  }

  /**
   * Shutdown the service gracefully
   */
  public shutdown(): void {
    console.log('Shutting down Feedback Trigger Service...');
    
    for (const [name, job] of this.cronJobs.entries()) {
      job.stop();
      job.destroy();
      console.log(`Stopped cron job: ${name}`);
    }

    this.cronJobs.clear();
    console.log('Feedback Trigger Service shutdown complete');
  }
}

// Export singleton instance
export const feedbackTriggerService = FeedbackTriggerService.getInstance(); 