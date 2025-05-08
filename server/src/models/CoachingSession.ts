import { Schema, model, Document, Types } from 'mongoose';
import { IUser } from './User';

export interface ICoachingSession extends Document {
  coachId: Types.ObjectId | IUser;
  clientId: Types.ObjectId | IUser;
  date: Date;
  notes: string;
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
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Add compound index for efficient querying by coach and date
CoachingSessionSchema.index({ coachId: 1, date: -1 });
// Add compound index for efficient querying by client and date
CoachingSessionSchema.index({ clientId: 1, date: -1 });

export const CoachingSession = model<ICoachingSession>('CoachingSession', CoachingSessionSchema);
