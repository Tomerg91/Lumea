import { Schema, model, Document, Types } from 'mongoose';
import { IUser } from './User';
import { ICoachingSession } from './CoachingSession';

export type NotificationType = 
  | 'session_cancelled' 
  | 'session_rescheduled' 
  | 'session_reminder'
  | 'session_confirmation'
  | 'cancellation_request'
  | 'reschedule_request'
  | 'feedback_request';

export type NotificationChannel = 'email' | 'in_app' | 'sms' | 'push';

export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read';

export interface INotificationTemplate {
  subject: string;
  htmlBody: string;
  textBody: string;
  variables: string[]; // Array of variable names that can be substituted
}

export interface INotificationPreferences {
  email: boolean;
  inApp: boolean;
  sms: boolean;
  push: boolean;
  reminderHoursBefore: number;
  confirmationEnabled: boolean;
}

export interface INotification extends Document {
  recipientId: Types.ObjectId | IUser;
  senderId?: Types.ObjectId | IUser;
  sessionId?: Types.ObjectId | ICoachingSession;
  
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  
  // Content
  subject: string;
  htmlBody: string;
  textBody: string;
  
  // Metadata
  variables: Record<string, string>; // Key-value pairs for template substitution
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Delivery tracking
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  
  // External IDs for tracking
  emailMessageId?: string; // From email service provider
  smsMessageId?: string;
  pushNotificationId?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'CoachingSession',
      index: true,
    },
    type: {
      type: String,
      enum: ['session_cancelled', 'session_rescheduled', 'session_reminder', 'session_confirmation', 'cancellation_request', 'reschedule_request', 'feedback_request'],
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ['email', 'in_app', 'sms', 'push'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed', 'read'],
      default: 'pending',
      index: true,
    },
    subject: {
      type: String,
      required: true,
    },
    htmlBody: {
      type: String,
      required: true,
    },
    textBody: {
      type: String,
      required: true,
    },
    variables: {
      type: Map,
      of: String,
      default: new Map(),
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    scheduledAt: {
      type: Date,
    },
    sentAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    readAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },
    failureReason: {
      type: String,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    emailMessageId: {
      type: String,
    },
    smsMessageId: {
      type: String,
    },
    pushNotificationId: {
      type: String,
    },
  },
  { timestamps: true }
);

// Indexes for efficient querying
NotificationSchema.index({ recipientId: 1, status: 1 });
NotificationSchema.index({ type: 1, scheduledAt: 1 });
NotificationSchema.index({ sessionId: 1, type: 1 });
NotificationSchema.index({ status: 1, retryCount: 1 });

export const Notification = model<INotification>('Notification', NotificationSchema);

// Notification Templates
export const NotificationTemplates: Record<NotificationType, INotificationTemplate> = {
  session_cancelled: {
    subject: 'Session Cancelled - {{sessionDate}}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">Session Cancelled</h2>
        <p>Dear {{recipientName}},</p>
        <p>Your coaching session scheduled for <strong>{{sessionDate}}</strong> has been cancelled.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Cancellation Details:</h3>
          <p><strong>Reason:</strong> {{cancellationReason}}</p>
          {{#if cancellationReasonText}}
          <p><strong>Additional Notes:</strong> {{cancellationReasonText}}</p>
          {{/if}}
          <p><strong>Cancelled By:</strong> {{cancelledBy}}</p>
          <p><strong>Cancelled At:</strong> {{cancelledAt}}</p>
        </div>
        
        {{#if refundEligible}}
        <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
          <p style="margin: 0; color: #155724;"><strong>Good news!</strong> You are eligible for a full refund for this session.</p>
        </div>
        {{else}}
        {{#if cancellationFee}}
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p style="margin: 0; color: #856404;"><strong>Please note:</strong> A cancellation fee of \${{cancellationFee}} applies to this session.</p>
        </div>
        {{/if}}
        {{/if}}
        
        <p>If you would like to reschedule, please contact {{coachName}} or log into your account to book a new session.</p>
        
        <p>Best regards,<br>The Satya Coaching Team</p>
      </div>
    `,
    textBody: `
Session Cancelled

Dear {{recipientName}},

Your coaching session scheduled for {{sessionDate}} has been cancelled.

Cancellation Details:
- Reason: {{cancellationReason}}
{{#if cancellationReasonText}}- Additional Notes: {{cancellationReasonText}}{{/if}}
- Cancelled By: {{cancelledBy}}
- Cancelled At: {{cancelledAt}}

{{#if refundEligible}}You are eligible for a full refund for this session.{{else}}{{#if cancellationFee}}A cancellation fee of $` + `{{cancellationFee}} applies to this session.{{/if}}{{/if}}

If you would like to reschedule, please contact {{coachName}} or log into your account to book a new session.

Best regards,
The Satya Coaching Team
    `,
    variables: ['recipientName', 'sessionDate', 'cancellationReason', 'cancellationReasonText', 'cancelledBy', 'cancelledAt', 'refundEligible', 'cancellationFee', 'coachName']
  },
  
  session_rescheduled: {
    subject: 'Session Rescheduled - New Date: {{newSessionDate}}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3498db;">Session Rescheduled</h2>
        <p>Dear {{recipientName}},</p>
        <p>Your coaching session has been rescheduled to a new date and time.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Rescheduling Details:</h3>
          <p><strong>Original Date:</strong> {{originalDate}}</p>
          <p><strong>New Date:</strong> {{newSessionDate}}</p>
          <p><strong>Reason:</strong> {{rescheduleReason}}</p>
          <p><strong>Rescheduled By:</strong> {{rescheduledBy}}</p>
          <p><strong>Rescheduled At:</strong> {{rescheduledAt}}</p>
        </div>
        
        <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
          <p style="margin: 0; color: #155724;">Please update your calendar with the new session time: <strong>{{newSessionDate}}</strong></p>
        </div>
        
        <p>If you have any concerns about this change, please contact {{coachName}} as soon as possible.</p>
        
        <p>Best regards,<br>The Satya Coaching Team</p>
      </div>
    `,
    textBody: `
Session Rescheduled

Dear {{recipientName}},

Your coaching session has been rescheduled to a new date and time.

Rescheduling Details:
- Original Date: {{originalDate}}
- New Date: {{newSessionDate}}
- Reason: {{rescheduleReason}}
- Rescheduled By: {{rescheduledBy}}
- Rescheduled At: {{rescheduledAt}}

Please update your calendar with the new session time: {{newSessionDate}}

If you have any concerns about this change, please contact {{coachName}} as soon as possible.

Best regards,
The Satya Coaching Team
    `,
    variables: ['recipientName', 'originalDate', 'newSessionDate', 'rescheduleReason', 'rescheduledBy', 'rescheduledAt', 'coachName']
  },
  
  session_reminder: {
    subject: 'Session Reminder - {{sessionDate}}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f39c12;">Session Reminder</h2>
        <p>Dear {{recipientName}},</p>
        <p>This is a friendly reminder about your upcoming coaching session.</p>
        
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h3>Session Details:</h3>
          <p><strong>Date & Time:</strong> {{sessionDate}}</p>
          <p><strong>Duration:</strong> {{duration}} minutes</p>
          <p><strong>Coach:</strong> {{coachName}}</p>
          {{#if sessionNotes}}<p><strong>Notes:</strong> {{sessionNotes}}</p>{{/if}}
        </div>
        
        <p>Please be ready to join your session at the scheduled time. If you need to reschedule or cancel, please do so at least {{minimumNoticeHours}} hours in advance.</p>
        
        <p>Best regards,<br>The Satya Coaching Team</p>
      </div>
    `,
    textBody: `
Session Reminder

Dear {{recipientName}},

This is a friendly reminder about your upcoming coaching session.

Session Details:
- Date & Time: {{sessionDate}}
- Duration: {{duration}} minutes
- Coach: {{coachName}}
{{#if sessionNotes}}- Notes: {{sessionNotes}}{{/if}}

Please be ready to join your session at the scheduled time. If you need to reschedule or cancel, please do so at least {{minimumNoticeHours}} hours in advance.

Best regards,
The Satya Coaching Team
    `,
    variables: ['recipientName', 'sessionDate', 'duration', 'coachName', 'sessionNotes', 'minimumNoticeHours']
  },
  
  session_confirmation: {
    subject: 'Session Confirmation - {{sessionDate}}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #27ae60;">Session Confirmed</h2>
        <p>Dear {{recipientName}},</p>
        <p>Your coaching session has been confirmed!</p>
        
        <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h3>Session Details:</h3>
          <p><strong>Date & Time:</strong> {{sessionDate}}</p>
          <p><strong>Duration:</strong> {{duration}} minutes</p>
          <p><strong>Coach:</strong> {{coachName}}</p>
          {{#if sessionNotes}}<p><strong>Notes:</strong> {{sessionNotes}}</p>{{/if}}
        </div>
        
        <p>We look forward to your session. You will receive a reminder {{reminderHours}} hours before your scheduled time.</p>
        
        <p>Best regards,<br>The Satya Coaching Team</p>
      </div>
    `,
    textBody: `
Session Confirmed

Dear {{recipientName}},

Your coaching session has been confirmed!

Session Details:
- Date & Time: {{sessionDate}}
- Duration: {{duration}} minutes
- Coach: {{coachName}}
{{#if sessionNotes}}- Notes: {{sessionNotes}}{{/if}}

We look forward to your session. You will receive a reminder {{reminderHours}} hours before your scheduled time.

Best regards,
The Satya Coaching Team
    `,
    variables: ['recipientName', 'sessionDate', 'duration', 'coachName', 'sessionNotes', 'reminderHours']
  },
  
  cancellation_request: {
    subject: 'Cancellation Request - {{sessionDate}}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">Cancellation Request</h2>
        <p>Dear {{recipientName}},</p>
        <p>{{requesterName}} has requested to cancel the session scheduled for {{sessionDate}}.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Request Details:</h3>
          <p><strong>Reason:</strong> {{cancellationReason}}</p>
          {{#if reasonText}}<p><strong>Additional Notes:</strong> {{reasonText}}</p>{{/if}}
          <p><strong>Requested By:</strong> {{requesterName}}</p>
        </div>
        
        <p>Please log into your account to approve or decline this cancellation request.</p>
        
        <p>Best regards,<br>The Satya Coaching Team</p>
      </div>
    `,
    textBody: `
Cancellation Request

Dear {{recipientName}},

{{requesterName}} has requested to cancel the session scheduled for {{sessionDate}}.

Request Details:
- Reason: {{cancellationReason}}
{{#if reasonText}}- Additional Notes: {{reasonText}}{{/if}}
- Requested By: {{requesterName}}

Please log into your account to approve or decline this cancellation request.

Best regards,
The Satya Coaching Team
    `,
    variables: ['recipientName', 'sessionDate', 'requesterName', 'cancellationReason', 'reasonText']
  },
  
  reschedule_request: {
    subject: 'Reschedule Request - {{sessionDate}}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3498db;">Reschedule Request</h2>
        <p>Dear {{recipientName}},</p>
        <p>{{requesterName}} has requested to reschedule the session from {{originalDate}} to {{newDate}}.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Request Details:</h3>
          <p><strong>Current Date:</strong> {{originalDate}}</p>
          <p><strong>Requested New Date:</strong> {{newDate}}</p>
          <p><strong>Reason:</strong> {{rescheduleReason}}</p>
          <p><strong>Requested By:</strong> {{requesterName}}</p>
        </div>
        
        <p>Please log into your account to approve or decline this reschedule request.</p>
        
        <p>Best regards,<br>The Satya Coaching Team</p>
      </div>
    `,
    textBody: `
Reschedule Request

Dear {{recipientName}},

{{requesterName}} has requested to reschedule the session from {{originalDate}} to {{newDate}}.

Request Details:
- Current Date: {{originalDate}}
- Requested New Date: {{newDate}}
- Reason: {{rescheduleReason}}
- Requested By: {{requesterName}}

Please log into your account to approve or decline this reschedule request.

Best regards,
The Satya Coaching Team
    `,
    variables: ['recipientName', 'originalDate', 'newDate', 'rescheduleReason', 'requesterName']
  },
  
  feedback_request: {
    subject: '{{subject}}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3498db;">{{#if isReminder}}Feedback Reminder{{else}}Share Your Feedback{{/if}}</h2>
        <p>Dear {{recipientName}},</p>
        <p>{{message}}</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Session Details:</h3>
          <p><strong>Date:</strong> {{sessionDate}}</p>
          <p><strong>Coach:</strong> {{coachName}}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{feedbackUrl}}" style="background-color: #3498db; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            {{#if isReminder}}Complete Your Feedback{{else}}Share Your Feedback{{/if}}
          </a>
        </div>
        
        <p style="font-size: 14px; color: #666;">
          Your feedback is important to us and helps improve the coaching experience. 
          {{#if isReminder}}This is reminder #{{reminderNumber}}.{{/if}}
        </p>
        
        <p style="font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 15px; margin-top: 30px;">
          Don't want to receive feedback requests? <a href="{{optOutUrl}}" style="color: #999;">Unsubscribe here</a>
        </p>
        
        <p>Best regards,<br>The Satya Coaching Team</p>
      </div>
    `,
    textBody: `
{{#if isReminder}}Feedback Reminder{{else}}Share Your Feedback{{/if}}

Dear {{recipientName}},

{{message}}

Session Details:
- Date: {{sessionDate}}
- Coach: {{coachName}}

Please share your feedback at: {{feedbackUrl}}

Your feedback is important to us and helps improve the coaching experience.
{{#if isReminder}}This is reminder #{{reminderNumber}}.{{/if}}

Don't want to receive feedback requests? Unsubscribe here: {{optOutUrl}}

Best regards,
The Satya Coaching Team
    `,
    variables: ['recipientName', 'sessionDate', 'coachName', 'subject', 'message', 'feedbackUrl', 'optOutUrl', 'isReminder', 'reminderNumber']
  }
}; 