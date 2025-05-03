import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
  coachId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  dateTime: Date;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  paymentStatus: 'pending' | 'paid' | 'overdue';
  tags?: mongoose.Types.ObjectId[];
  clientReflectionReminderSent: boolean;
  coachReflectionReminderSent: boolean;
  isRecurring: boolean;
  recurrenceRule?: string;
  recurrenceEndDate?: Date;
  // Fields from auth session
  user?: mongoose.Types.ObjectId;
  refreshToken?: string;
  expiresAt?: Date;
  issuedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    coachId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dateTime: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
      default: 'scheduled',
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'overdue'],
      default: 'pending',
      required: true,
    },
    tags: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Tag',
      },
    ],
    clientReflectionReminderSent: {
      type: Boolean,
      default: false,
    },
    coachReflectionReminderSent: {
      type: Boolean,
      default: false,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurrenceRule: {
      type: String,
    },
    recurrenceEndDate: {
      type: Date,
    },
    // Fields for auth session
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    refreshToken: {
      type: String,
    },
    expiresAt: {
      type: Date,
    },
    issuedAt: {
      type: Date,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
sessionSchema.index({ coachId: 1, dateTime: 1 });
sessionSchema.index({ clientId: 1, dateTime: 1 });
sessionSchema.index({ paymentStatus: 1 });
sessionSchema.index({ user: 1, refreshToken: 1 });

export const Session = mongoose.model<ISession>('Session', sessionSchema);
