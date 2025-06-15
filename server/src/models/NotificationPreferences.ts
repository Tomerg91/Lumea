import mongoose, { Document, Schema, Model } from 'mongoose';
import { NotificationType, NotificationChannel } from './Notification';

// Notification preferences interface
export interface INotificationPreferences extends Document {
  userId: mongoose.Types.ObjectId;
  
  // Channel preferences - which channels are enabled
  channels: {
    email: boolean;
    inApp: boolean;
    sms: boolean;
    push: boolean;
  };
  
  // Notification type preferences - which types of notifications to receive
  notificationTypes: {
    sessionReminders: boolean;
    sessionConfirmations: boolean;
    sessionCancellations: boolean;
    sessionRescheduling: boolean;
    cancellationRequests: boolean;
    rescheduleRequests: boolean;
    feedbackRequests: boolean;
  };
  
  // Timing preferences
  reminderTiming: {
    hoursBefore: number; // How many hours before session to send reminder
    enableMultipleReminders: boolean;
    additionalReminderHours: number[]; // Additional reminder times (e.g., [24, 2] for 24h and 2h before)
  };
  
  // Quiet hours - when not to send notifications
  quietHours: {
    enabled: boolean;
    startTime: string; // Format: "HH:MM" (24-hour format)
    endTime: string; // Format: "HH:MM" (24-hour format)
    timezone: string; // User's timezone
  };
  
  // Email preferences
  emailPreferences: {
    digestEnabled: boolean; // Send daily/weekly digest instead of individual emails
    digestFrequency: 'daily' | 'weekly' | 'disabled';
    digestTime: string; // Format: "HH:MM"
    htmlFormat: boolean; // Send HTML emails vs plain text
  };
  
  // Language and localization
  language: string; // ISO language code (e.g., 'en', 'he')
  timezone: string; // User's timezone for scheduling notifications
  
  // Advanced preferences
  advanced: {
    groupSimilarNotifications: boolean; // Group similar notifications together
    maxNotificationsPerHour: number; // Rate limiting
    enableReadReceipts: boolean; // Track when notifications are read
  };
  
  createdAt: Date;
  updatedAt: Date;
}

// Default preferences function
export const getDefaultNotificationPreferences = (): Partial<INotificationPreferences> => ({
  channels: {
    email: true,
    inApp: true,
    sms: false,
    push: true,
  },
  notificationTypes: {
    sessionReminders: true,
    sessionConfirmations: true,
    sessionCancellations: true,
    sessionRescheduling: true,
    cancellationRequests: true,
    rescheduleRequests: true,
    feedbackRequests: true,
  },
  reminderTiming: {
    hoursBefore: 24,
    enableMultipleReminders: false,
    additionalReminderHours: [],
  },
  quietHours: {
    enabled: false,
    startTime: "22:00",
    endTime: "08:00",
    timezone: "UTC",
  },
  emailPreferences: {
    digestEnabled: false,
    digestFrequency: 'disabled',
    digestTime: "09:00",
    htmlFormat: true,
  },
  language: 'en',
  timezone: 'UTC',
  advanced: {
    groupSimilarNotifications: true,
    maxNotificationsPerHour: 10,
    enableReadReceipts: true,
  },
});

// Define the schema
const notificationPreferencesSchema = new Schema<INotificationPreferences>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // One preferences document per user
    },
    
    channels: {
      email: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true },
    },
    
    notificationTypes: {
      sessionReminders: { type: Boolean, default: true },
      sessionConfirmations: { type: Boolean, default: true },
      sessionCancellations: { type: Boolean, default: true },
      sessionRescheduling: { type: Boolean, default: true },
      cancellationRequests: { type: Boolean, default: true },
      rescheduleRequests: { type: Boolean, default: true },
      feedbackRequests: { type: Boolean, default: true },
    },
    
    reminderTiming: {
      hoursBefore: { type: Number, default: 24, min: 1, max: 168 }, // 1 hour to 1 week
      enableMultipleReminders: { type: Boolean, default: false },
      additionalReminderHours: [{ type: Number, min: 1, max: 168 }],
    },
    
    quietHours: {
      enabled: { type: Boolean, default: false },
      startTime: { 
        type: String, 
        default: "22:00",
        validate: {
          validator: function(v: string) {
            return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
          },
          message: 'Start time must be in HH:MM format'
        }
      },
      endTime: { 
        type: String, 
        default: "08:00",
        validate: {
          validator: function(v: string) {
            return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
          },
          message: 'End time must be in HH:MM format'
        }
      },
      timezone: { type: String, default: "UTC" },
    },
    
    emailPreferences: {
      digestEnabled: { type: Boolean, default: false },
      digestFrequency: { 
        type: String, 
        enum: ['daily', 'weekly', 'disabled'], 
        default: 'disabled' 
      },
      digestTime: { 
        type: String, 
        default: "09:00",
        validate: {
          validator: function(v: string) {
            return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
          },
          message: 'Digest time must be in HH:MM format'
        }
      },
      htmlFormat: { type: Boolean, default: true },
    },
    
    language: { 
      type: String, 
      default: 'en',
      validate: {
        validator: function(v: string) {
          return /^[a-z]{2}$/.test(v);
        },
        message: 'Language must be a 2-letter ISO code'
      }
    },
    
    timezone: { type: String, default: 'UTC' },
    
    advanced: {
      groupSimilarNotifications: { type: Boolean, default: true },
      maxNotificationsPerHour: { type: Number, default: 10, min: 1, max: 100 },
      enableReadReceipts: { type: Boolean, default: true },
    },
  },
  { 
    timestamps: true,
  }
);

// Removed redundant single-field index on userId; the unique constraint on userId already creates an index.
// If future queries need additional compound indexes, add them here.

// Static method to get or create preferences for a user
notificationPreferencesSchema.statics.getOrCreateForUser = async function(
  userId: string | mongoose.Types.ObjectId
): Promise<INotificationPreferences> {
  let preferences = await this.findOne({ userId });
  
  if (!preferences) {
    const defaultPrefs = getDefaultNotificationPreferences();
    preferences = await this.create({
      userId,
      ...defaultPrefs,
    });
  }
  
  return preferences;
};

// Instance method to check if a notification should be sent based on preferences
notificationPreferencesSchema.methods.shouldSendNotification = function(
  type: NotificationType,
  channel: NotificationChannel,
  scheduledTime?: Date
): boolean {
  // Check if the channel is enabled
  if (!this.channels[channel]) {
    return false;
  }
  
  // Check if the notification type is enabled
  const typeMapping: Record<NotificationType, keyof INotificationPreferences['notificationTypes']> = {
    'session_reminder': 'sessionReminders',
    'session_confirmation': 'sessionConfirmations',
    'session_cancelled': 'sessionCancellations',
    'session_rescheduled': 'sessionRescheduling',
    'cancellation_request': 'cancellationRequests',
    'reschedule_request': 'rescheduleRequests',
    'feedback_request': 'feedbackRequests',
  };
  
  const typeKey = typeMapping[type];
  if (typeKey && !this.notificationTypes[typeKey]) {
    return false;
  }
  
  // Check quiet hours if a scheduled time is provided
  if (scheduledTime && this.quietHours.enabled) {
    const hour = scheduledTime.getHours();
    const minute = scheduledTime.getMinutes();
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    
    const startTime = this.quietHours.startTime;
    const endTime = this.quietHours.endTime;
    
    // Handle quiet hours that span midnight
    if (startTime > endTime) {
      if (timeString >= startTime || timeString <= endTime) {
        return false;
      }
    } else {
      if (timeString >= startTime && timeString <= endTime) {
        return false;
      }
    }
  }
  
  return true;
};

// Instance method to get reminder times for a session
notificationPreferencesSchema.methods.getReminderTimes = function(sessionDate: Date): Date[] {
  const reminderTimes: Date[] = [];
  const sessionTime = new Date(sessionDate);
  
  // Primary reminder
  const primaryReminder = new Date(sessionTime);
  primaryReminder.setHours(primaryReminder.getHours() - this.reminderTiming.hoursBefore);
  reminderTimes.push(primaryReminder);
  
  // Additional reminders if enabled
  if (this.reminderTiming.enableMultipleReminders) {
    for (const hours of this.reminderTiming.additionalReminderHours) {
      const additionalReminder = new Date(sessionTime);
      additionalReminder.setHours(additionalReminder.getHours() - hours);
      
      // Only add if it's in the future and different from primary reminder
      if (additionalReminder > new Date() && additionalReminder.getTime() !== primaryReminder.getTime()) {
        reminderTimes.push(additionalReminder);
      }
    }
  }
  
  // Sort by time (earliest first)
  return reminderTimes.sort((a, b) => a.getTime() - b.getTime());
};

// Export the model
export const NotificationPreferences: Model<INotificationPreferences> = mongoose.model<INotificationPreferences>(
  'NotificationPreferences', 
  notificationPreferencesSchema
); 