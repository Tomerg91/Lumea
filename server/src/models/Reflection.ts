import { Schema, model, Document, Types } from 'mongoose';

export interface IReflection extends Document {
  sessionId: Types.ObjectId;
  clientId: Types.ObjectId;
  coachId: Types.ObjectId;
  userId?: Types.ObjectId;
  user?: Types.ObjectId;
  title?: string;
  content?: string;
  visibility?: 'private' | 'shared' | 'public';
  text?: string;
  audioUrl?: string;
  sharedWithCoach?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReflectionSchema = new Schema<IReflection>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    coachId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Backwards compatibility with tests
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    title: {
      type: String,
      trim: true,
    },
    content: {
      type: String,
      trim: true,
    },
    visibility: {
      type: String,
      enum: ['private', 'shared', 'public'],
      default: 'private',
    },
    text: {
      type: String,
      trim: true,
    },
    audioUrl: {
      type: String,
      trim: true,
    },
    sharedWithCoach: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for faster querying by sessionId
ReflectionSchema.index({ sessionId: 1 });
// Index for faster querying by clientId
ReflectionSchema.index({ clientId: 1 });
// Index for faster querying by coachId
ReflectionSchema.index({ coachId: 1 });
// Index for faster querying by userId (for backward compatibility)
ReflectionSchema.index({ userId: 1 });
ReflectionSchema.index({ user: 1 });
// Index for faster querying shared reflections
ReflectionSchema.index({ sharedWithCoach: 1 });

export const Reflection = model<IReflection>('Reflection', ReflectionSchema);
