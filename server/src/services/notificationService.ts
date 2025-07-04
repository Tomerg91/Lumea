import { EmailService } from './emailService';

interface INotification { // Placeholder interface
  _id: string;
  recipientId: string;
  senderId?: string;
  sessionId?: string;
  type: string;
  channel: string;
  priority: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  variables: Record<string, string>;
  scheduledAt: Date;
  retryCount: number;
  maxRetries: number;
  status: string;
  sentAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  emailMessageId?: string;
  smsMessageId?: string;
  pushNotificationId?: string;
}

interface ICoachingSession { // Placeholder interface
  _id: string;
  coachId: string | any;
  clientId: string | any;
  date: Date;
  duration?: number;
  status: string;
  completedAt?: Date;
  notes?: string;
  cancellationInfo?: any;
  reschedulingInfo?: any;
}

interface IUser { // Placeholder interface
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
}

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
    console.warn('createSessionNotification is a placeholder. Implement with Supabase.');
    return [];
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
    console.warn('processPendingNotifications is a placeholder. Implement with Supabase.');
  }

  /**
   * Send a specific notification
   */
  static async sendNotification(notification: INotification): Promise<void> {
    console.warn('sendNotification is a placeholder. Implement with Supabase.');
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
    console.warn('getUserNotifications is a placeholder. Implement with Supabase.');
    return { notifications: [], total: 0 };
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    console.warn('markNotificationAsRead is a placeholder. Implement with Supabase.');
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllNotificationsAsRead(userId: string): Promise<void> {
    console.warn('markAllNotificationsAsRead is a placeholder. Implement with Supabase.');
  }
}

export default NotificationService; 