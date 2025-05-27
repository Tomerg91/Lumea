import mongoose, { Schema, Document, Types } from 'mongoose';

export type SessionHistoryAction = 
  | 'created'
  | 'updated' 
  | 'status_changed'
  | 'cancelled'
  | 'rescheduled'
  | 'completed'
  | 'reminder_sent'
  | 'confirmation_sent'
  | 'notes_updated';

export interface ISessionHistory extends Document {
  sessionId: Types.ObjectId;
  action: SessionHistoryAction;
  actionBy: Types.ObjectId; // User who performed the action
  timestamp: Date;
  
  // Previous and new values for tracking changes
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  
  // Specific metadata for different actions
  metadata?: {
    // For cancellations
    cancellationReason?: string;
    cancellationReasonText?: string;
    cancellationFee?: number;
    refundEligible?: boolean;
    
    // For rescheduling
    originalDate?: Date;
    newDate?: Date;
    rescheduleReason?: string;
    rescheduleCount?: number;
    
    // For general changes
    field?: string; // Which field was changed
    reason?: string; // Why the change was made
    
    // System metadata
    ipAddress?: string;
    userAgent?: string;
    source?: 'web' | 'mobile' | 'api' | 'system';
  };
  
  // Context information
  description: string; // Human-readable description of the change
  systemGenerated: boolean; // Whether this was a system-generated event
  
  // Additional audit fields
  createdAt: Date;
  updatedAt: Date;
}

const SessionHistorySchema = new Schema<ISessionHistory>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'CoachingSession',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: [
        'created',
        'updated',
        'status_changed',
        'cancelled',
        'rescheduled',
        'completed',
        'reminder_sent',
        'confirmation_sent',
        'notes_updated'
      ],
      required: true,
      index: true,
    },
    actionBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    previousValues: {
      type: Schema.Types.Mixed,
    },
    newValues: {
      type: Schema.Types.Mixed,
    },
    metadata: {
      // Cancellation fields
      cancellationReason: {
        type: String,
        enum: ['coach_emergency', 'client_request', 'illness', 'scheduling_conflict', 'technical_issues', 'weather', 'personal_emergency', 'other'],
      },
      cancellationReasonText: {
        type: String,
        maxlength: 500,
      },
      cancellationFee: {
        type: Number,
        min: 0,
      },
      refundEligible: {
        type: Boolean,
      },
      
      // Rescheduling fields
      originalDate: {
        type: Date,
      },
      newDate: {
        type: Date,
      },
      rescheduleReason: {
        type: String,
        maxlength: 500,
      },
      rescheduleCount: {
        type: Number,
        min: 1,
      },
      
      // General fields
      field: {
        type: String,
      },
      reason: {
        type: String,
        maxlength: 500,
      },
      
      // System metadata
      ipAddress: {
        type: String,
      },
      userAgent: {
        type: String,
      },
      source: {
        type: String,
        enum: ['web', 'mobile', 'api', 'system'],
        default: 'web',
      },
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    systemGenerated: {
      type: Boolean,
      default: false,
    },
  },
  { 
    timestamps: true,
    // Optimize for time-series queries
    optimisticConcurrency: true,
  }
);

// Compound indexes for efficient querying
SessionHistorySchema.index({ sessionId: 1, timestamp: -1 });
SessionHistorySchema.index({ actionBy: 1, timestamp: -1 });
SessionHistorySchema.index({ action: 1, timestamp: -1 });
SessionHistorySchema.index({ systemGenerated: 1, timestamp: -1 });

// TTL index to automatically delete old history entries after 2 years
SessionHistorySchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 }); // 2 years

export const SessionHistory = mongoose.model<ISessionHistory>('SessionHistory', SessionHistorySchema); 