import { Schema, model, Document, Types } from 'mongoose';
import { IUser } from './User';

export type SessionStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled' | 'rescheduled';

export type CancellationReason = 
  | 'coach_emergency' 
  | 'client_request' 
  | 'illness' 
  | 'scheduling_conflict' 
  | 'technical_issues' 
  | 'weather'
  | 'personal_emergency'
  | 'other';

export interface ICancellationInfo {
  reason: CancellationReason;
  reasonText?: string; // Additional explanation
  cancelledBy: Types.ObjectId; // User who cancelled
  cancelledAt: Date;
  refundEligible: boolean;
  cancellationFee: number; // Amount in cents/smallest currency unit
  notificationSent: boolean;
}

export interface IReschedulingInfo {
  originalDate: Date;
  rescheduleReason: string;
  rescheduledBy: Types.ObjectId;
  rescheduledAt: Date;
  rescheduleCount: number; // Track how many times this session has been rescheduled
  isFromCancellation: boolean; // Whether this reschedule came from a cancelled session
}

export interface ICoachingSession extends Document {
  coachId: Types.ObjectId | IUser;
  clientId: Types.ObjectId | IUser;
  date: Date;
  duration: number; // Duration in minutes
  status: SessionStatus;
  notes: string;
  
  // Status change timestamps for audit trail
  pendingAt?: Date;
  'in-progressAt'?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  rescheduledAt?: Date;
  
  // Cancellation details
  cancellationInfo?: ICancellationInfo;
  
  // Rescheduling details  
  reschedulingInfo?: IReschedulingInfo;
  
  // Notification tracking
  reminderSent: boolean;
  confirmationSent: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const CancellationInfoSchema = new Schema({
  reason: {
    type: String,
    enum: ['coach_emergency', 'client_request', 'illness', 'scheduling_conflict', 'technical_issues', 'weather', 'personal_emergency', 'other'],
    required: true,
  },
  reasonText: {
    type: String,
    maxlength: 500,
  },
  cancelledBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  cancelledAt: {
    type: Date,
    required: true,
  },
  refundEligible: {
    type: Boolean,
    default: false,
  },
  cancellationFee: {
    type: Number,
    default: 0,
    min: 0,
  },
  notificationSent: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

const ReschedulingInfoSchema = new Schema({
  originalDate: {
    type: Date,
    required: true,
  },
  rescheduleReason: {
    type: String,
    required: true,
    maxlength: 500,
  },
  rescheduledBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  rescheduledAt: {
    type: Date,
    required: true,
  },
  rescheduleCount: {
    type: Number,
    default: 1,
    min: 1,
  },
  isFromCancellation: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

const CoachingSessionSchema = new Schema<ICoachingSession>(
  {
    coachId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    duration: {
      type: Number,
      required: true,
      default: 60, // Default 60 minutes
      min: 15,
      max: 240,
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'cancelled', 'rescheduled'],
      default: 'pending',
      index: true,
    },
    notes: {
      type: String,
      default: '',
    },
    // Status change timestamps for audit trail
    pendingAt: {
      type: Date,
    },
    'in-progressAt': {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    rescheduledAt: {
      type: Date,
    },
    // Cancellation details
    cancellationInfo: {
      type: CancellationInfoSchema,
    },
    // Rescheduling details
    reschedulingInfo: {
      type: ReschedulingInfoSchema,
    },
    // Notification tracking
    reminderSent: {
      type: Boolean,
      default: false,
    },
    confirmationSent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Add compound index for efficient querying by coach and date
CoachingSessionSchema.index({ coachId: 1, date: -1 });
// Add compound index for efficient querying by client and date
CoachingSessionSchema.index({ clientId: 1, date: -1 });
// Add compound index for efficient querying by status and date
CoachingSessionSchema.index({ status: 1, date: -1 });

export const CoachingSession = model<ICoachingSession>('CoachingSession', CoachingSessionSchema);
