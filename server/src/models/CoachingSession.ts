import { Schema, model, Document, Types } from 'mongoose';
import { IUser } from './User';

export type SessionStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';

export interface ICoachingSession extends Document {
  coachId: Types.ObjectId | IUser;
  clientId: Types.ObjectId | IUser;
  date: Date;
  status: SessionStatus;
  notes: string;
  // Status change timestamps for audit trail
  pendingAt?: Date;
  'in-progressAt'?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

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
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'cancelled'],
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
