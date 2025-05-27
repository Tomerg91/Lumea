// @ts-nocheck
import { Notification, NotificationTemplates, NotificationType, NotificationChannel, INotification } from '../models/Notification';
import { ICoachingSession } from '../models/CoachingSession';
import { IUser } from '../models/User';
import { Types } from 'mongoose';
import { EmailService } from './emailService';

interface NotificationContext {
  recipient: IUser;
  sender?: IUser;
  session?: ICoachingSession;
  variables?: Record<string, string>;
}

export interface NotificationRequest {
  recipientId: string;
  senderId?: string;
  sessionId?: string;
  type: NotificationType;
  channels: NotificationChannel[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  scheduledAt?: Date;
  variables?: Record<string, string>;
}

export class NotificationService {
  private static emailService = new EmailService();

  /**
   * Create and schedule notifications for a session event
   */
  static async createSessionNotification(request: NotificationRequest): Promise<INotification[]> {
    const notifications: INotification[] = [];

    // Get template for the notification type
    const template = NotificationTemplates[request.type];
    if (!template) {
      throw new Error(`Unknown notification type: ${request.type}`);
    }

    // Create notification for each requested channel
    for (const channel of request.channels) {
      const notification = new Notification({
        recipientId: new Types.ObjectId(request.recipientId),
        senderId: request.senderId ? new Types.ObjectId(request.senderId) : undefined,
        sessionId: request.sessionId ? new Types.ObjectId(request.sessionId) : undefined,
        type: request.type,
        channel,
        priority: request.priority || 'medium',
        subject: template.subject,
        htmlBody: template.htmlBody,
        textBody: template.textBody,
        variables: request.variables || {},
        scheduledAt: request.scheduledAt || new Date(),
        retryCount: 0,
        maxRetries: 3,
      });

      await notification.save();
      notifications.push(notification);
    }

    return notifications;
  }

  /**
   * Process template variables and substitute them in content
   */
  static substituteVariables(content: string, variables: Record<string, string>): string {
    let result = content;
    
    // Simple template substitution - replace {{variableName}} with actual values
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value || '');
    });

    // Handle conditional blocks like {{#if variable}}...{{/if}}
    result = result.replace(/{{#if\s+(\w+)}}(.*?){{\/if}}/gs, (match, variable, content) => {
      return variables[variable] && variables[variable] !== 'false' ? content : '';
    });

    // Handle else blocks {{#if variable}}...{{else}}...{{/if}}
    result = result.replace(/{{#if\s+(\w+)}}(.*?){{else}}(.*?){{\/if}}/gs, (match, variable, ifContent, elseContent) => {
      return variables[variable] && variables[variable] !== 'false' ? ifContent : elseContent;
    });

    return result;
  }

  /**
   * Send pending notifications
   */
  static async processPendingNotifications(): Promise<void> {
    const pendingNotifications = await Notification.find({
      status: 'pending',
      scheduledAt: { $lte: new Date() },
      retryCount: { $lt: 3 }, // Don't process notifications that have exceeded retry limit
    }).populate('recipientId sessionId');

    for (const notification of pendingNotifications) {
      try {
        await this.sendNotification(notification);
      } catch (error) {
        console.error(`Failed to send notification ${notification._id}:`, error);
        
        // Update retry count and status
        notification.retryCount += 1;
        if (notification.retryCount >= notification.maxRetries) {
          notification.status = 'failed';
          notification.failedAt = new Date();
          notification.failureReason = error instanceof Error ? error.message : 'Unknown error';
        }
        await notification.save();
      }
    }
  }

  /**
   * Send a specific notification
   */
  static async sendNotification(notification: INotification): Promise<void> {
    // Substitute variables in content
    const variables = notification.variables instanceof Map 
      ? Object.fromEntries(notification.variables) 
      : notification.variables || {};
    const subject = this.substituteVariables(notification.subject, variables);
    const htmlBody = this.substituteVariables(notification.htmlBody, variables);
    const textBody = this.substituteVariables(notification.textBody, variables);

    try {
      switch (notification.channel) {
        case 'email':
          await this.sendEmailNotification(notification, subject, htmlBody, textBody);
          break;
        case 'in_app':
          await this.sendInAppNotification(notification, subject, textBody);
          break;
        case 'sms':
          await this.sendSMSNotification(notification, textBody);
          break;
        case 'push':
          await this.sendPushNotification(notification, subject, textBody);
          break;
        default:
          throw new Error(`Unsupported notification channel: ${notification.channel}`);
      }

      // Mark as sent
      notification.status = 'sent';
      notification.sentAt = new Date();
      await notification.save();

    } catch (error) {
      console.error(`Failed to send ${notification.channel} notification:`, error);
      throw error;
    }
  }

  /**
   * Send email notification
   */
  private static async sendEmailNotification(
    notification: INotification,
    subject: string,
    htmlBody: string,
    textBody: string
  ): Promise<void> {
    try {
      // Get recipient email - handle both populated and non-populated cases
      let recipientEmail: string;
      if (typeof notification.recipientId === 'object' && 'email' in notification.recipientId) {
        recipientEmail = (notification.recipientId as IUser).email;
      } else {
        // If not populated, we need to fetch the user
        const { User } = await import('../models/User.js');
        const user = await User.findById(notification.recipientId).select('email');
        if (!user) {
          throw new Error(`User not found: ${notification.recipientId}`);
        }
        recipientEmail = user.email;
      }

      await this.emailService.sendEmail({
        to: recipientEmail,
        subject,
        html: htmlBody,
        text: textBody,
      });

      // Generate a unique message ID for tracking
      notification.emailMessageId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
    } catch (error) {
      console.error('Failed to send email notification:', error);
      throw error;
    }
  }

  /**
   * Send in-app notification
   */
  private static async sendInAppNotification(
    notification: INotification,
    subject: string,
    content: string
  ): Promise<void> {
    // In a real implementation, you would:
    // - Store in-app notifications in a collection
    // - Use WebSocket/Server-Sent Events to push real-time notifications
    // - Integrate with push notification services for mobile apps
    
    console.log('Sending in-app notification:', {
      recipientId: notification.recipientId,
      subject,
      content: content.substring(0, 100) + '...',
    });

    // Simulate in-app notification
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  /**
   * Send SMS notification
   */
  private static async sendSMSNotification(
    notification: INotification,
    content: string
  ): Promise<void> {
    // In a real implementation, you would integrate with SMS services like:
    // - Twilio
    // - AWS SNS
    // - MessageBird
    
    console.log('Sending SMS notification:', {
      to: (notification.recipientId as any).phone,
      content: content.substring(0, 100) + '...',
    });

    // Simulate SMS sending
    await new Promise(resolve => setTimeout(resolve, 100));
    
    notification.smsMessageId = `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Send push notification
   */
  private static async sendPushNotification(
    notification: INotification,
    title: string,
    content: string
  ): Promise<void> {
    // In a real implementation, you would integrate with push services like:
    // - Firebase Cloud Messaging (FCM)
    // - Apple Push Notification Service (APNs)
    // - OneSignal
    // - Pusher
    
    console.log('Sending push notification:', {
      recipientId: notification.recipientId,
      title,
      content: content.substring(0, 100) + '...',
    });

    // Simulate push notification
    await new Promise(resolve => setTimeout(resolve, 50));
    
    notification.pushNotificationId = `push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create notification variables from session context
   */
  static createSessionVariables(
    session: ICoachingSession,
    recipient: IUser,
    sender?: IUser,
    extraVariables?: Record<string, string>
  ): Record<string, string> {
    // Safely extract populated user data
    const coach = session.coachId && typeof session.coachId === 'object' && 'firstName' in session.coachId 
      ? session.coachId as IUser 
      : null;
    const client = session.clientId && typeof session.clientId === 'object' && 'firstName' in session.clientId 
      ? session.clientId as IUser 
      : null;
    
    const baseVariables: Record<string, string> = {
      recipientName: `${recipient.firstName} ${recipient.lastName}`,
      sessionDate: new Date(session.date).toLocaleString(),
      duration: (session.duration || 60).toString(),
      coachName: coach ? `${coach.firstName} ${coach.lastName}` : 'Your coach',
      clientName: client ? `${client.firstName} ${client.lastName}` : 'Your client',
      sessionNotes: session.notes || '',
      minimumNoticeHours: '24', // Could be configurable
      reminderHours: '24', // Could be configurable
    };

    // Add sender information if provided
    if (sender) {
      baseVariables.senderName = `${sender.firstName} ${sender.lastName}`;
      baseVariables.requesterName = `${sender.firstName} ${sender.lastName}`;
    }

    // Add cancellation-specific variables
    if (session.cancellationInfo) {
      baseVariables.cancellationReason = session.cancellationInfo.reason;
      baseVariables.cancellationReasonText = session.cancellationInfo.reasonText || '';
      baseVariables.cancelledAt = session.cancellationInfo.cancelledAt.toLocaleString();
      baseVariables.refundEligible = session.cancellationInfo.refundEligible.toString();
      baseVariables.cancellationFee = (session.cancellationInfo.cancellationFee / 100).toFixed(2); // Convert cents to dollars
      
      // Safely extract cancelled by user info
      const cancelledBy = session.cancellationInfo.cancelledBy && 
        typeof session.cancellationInfo.cancelledBy === 'object' && 
        'firstName' in session.cancellationInfo.cancelledBy
        ? session.cancellationInfo.cancelledBy as IUser
        : null;
      baseVariables.cancelledBy = cancelledBy 
        ? `${cancelledBy.firstName} ${cancelledBy.lastName}` 
        : 'Unknown';
    }

    // Add rescheduling-specific variables
    if (session.reschedulingInfo) {
      baseVariables.originalDate = session.reschedulingInfo.originalDate.toLocaleString();
      baseVariables.newSessionDate = new Date(session.date).toLocaleString();
      baseVariables.rescheduleReason = session.reschedulingInfo.rescheduleReason;
      baseVariables.rescheduledAt = session.reschedulingInfo.rescheduledAt.toLocaleString();
      
      // Safely extract rescheduled by user info
      const rescheduledBy = session.reschedulingInfo.rescheduledBy && 
        typeof session.reschedulingInfo.rescheduledBy === 'object' && 
        'firstName' in session.reschedulingInfo.rescheduledBy
        ? session.reschedulingInfo.rescheduledBy as IUser
        : null;
      baseVariables.rescheduledBy = rescheduledBy 
        ? `${rescheduledBy.firstName} ${rescheduledBy.lastName}` 
        : 'Unknown';
    }

    return { ...baseVariables, ...extraVariables };
  }

  /**
   * Send cancellation notification to both coach and client
   */
  static async sendCancellationNotifications(
    session: ICoachingSession,
    cancelledBy: IUser
  ): Promise<void> {
    // Safely extract populated user data
    const coach = session.coachId && typeof session.coachId === 'object' && 'firstName' in session.coachId 
      ? session.coachId as IUser 
      : null;
    const client = session.clientId && typeof session.clientId === 'object' && 'firstName' in session.clientId 
      ? session.clientId as IUser 
      : null;

    if (!coach || !client) {
      throw new Error('Session must have populated coach and client');
    }

    // Notify the other party (not the one who cancelled)
    const recipient = cancelledBy._id.toString() === coach._id.toString() ? client : coach;
    
    const variables = this.createSessionVariables(session, recipient, cancelledBy);

    await this.createSessionNotification({
      recipientId: recipient._id.toString(),
      senderId: cancelledBy._id.toString(),
      sessionId: session._id.toString(),
      type: 'session_cancelled',
      channels: ['email', 'in_app'],
      priority: 'high',
      variables,
    });
  }

  /**
   * Send rescheduling notification to both coach and client
   */
  static async sendReschedulingNotifications(
    session: ICoachingSession,
    rescheduledBy: IUser
  ): Promise<void> {
    const coach = typeof session.coachId === 'object' ? session.coachId : null;
    const client = typeof session.clientId === 'object' ? session.clientId : null;

    if (!coach || !client) {
      throw new Error('Session must have populated coach and client');
    }

    // Notify the other party (not the one who rescheduled)
    const recipient = rescheduledBy._id.equals(coach._id) ? client : coach;
    
    const variables = this.createSessionVariables(session, recipient, rescheduledBy);

    await this.createSessionNotification({
      recipientId: recipient._id.toString(),
      senderId: rescheduledBy._id.toString(),
      sessionId: session._id.toString(),
      type: 'session_rescheduled',
      channels: ['email', 'in_app'],
      priority: 'high',
      variables,
    });
  }

  /**
   * Send session reminder notifications
   */
  static async sendSessionReminders(
    session: ICoachingSession,
    hoursBefore: number = 24
  ): Promise<void> {
    const coach = typeof session.coachId === 'object' ? session.coachId : null;
    const client = typeof session.clientId === 'object' ? session.clientId : null;

    if (!coach || !client) {
      throw new Error('Session must have populated coach and client');
    }

    const scheduledAt = new Date(session.date);
    scheduledAt.setHours(scheduledAt.getHours() - hoursBefore);

    // Send reminder to both coach and client
    for (const recipient of [coach, client]) {
      const variables = this.createSessionVariables(session, recipient);

      await this.createSessionNotification({
        recipientId: recipient._id.toString(),
        sessionId: session._id.toString(),
        type: 'session_reminder',
        channels: ['email', 'in_app'],
        priority: 'medium',
        scheduledAt,
        variables,
      });
    }
  }

  /**
   * Send session confirmation notification
   */
  static async sendSessionConfirmation(
    session: ICoachingSession,
    recipient: IUser
  ): Promise<void> {
    const variables = this.createSessionVariables(session, recipient);

    await this.createSessionNotification({
      recipientId: recipient._id.toString(),
      sessionId: session._id.toString(),
      type: 'session_confirmation',
      channels: ['email', 'in_app'],
      priority: 'medium',
      variables,
    });
  }

  /**
   * Get notifications for a user
   */
  static async getUserNotifications(
    userId: string,
    options: {
      status?: string;
      type?: NotificationType;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ notifications: INotification[]; total: number }> {
    const filter: any = { recipientId: new Types.ObjectId(userId) };
    
    if (options.status) filter.status = options.status;
    if (options.type) filter.type = options.type;

    const total = await Notification.countDocuments(filter);
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(options.limit || 50)
      .skip(options.offset || 0)
      .populate('senderId sessionId', 'firstName lastName date');

    return { notifications, total };
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    await Notification.findOneAndUpdate(
      { 
        _id: new Types.ObjectId(notificationId),
        recipientId: new Types.ObjectId(userId)
      },
      { 
        status: 'read',
        readAt: new Date()
      }
    );
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllNotificationsAsRead(userId: string): Promise<void> {
    await Notification.updateMany(
      { 
        recipientId: new Types.ObjectId(userId),
        status: { $in: ['sent', 'delivered'] }
      },
      { 
        status: 'read',
        readAt: new Date()
      }
    );
  }
}

export default NotificationService; 