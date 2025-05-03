import { Schema, model, Document, Types } from 'mongoose';

export interface IReflection extends Document {
  sessionId: Types.ObjectId;
  clientId: Types.ObjectId;
  coachId: Types.ObjectId;
  text?: string;
  audioUrl?: string;
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
    text: {
      type: String,
      trim: true,
    },
    audioUrl: {
      type: String,
      trim: true,
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

export const Reflection = model<IReflection>('Reflection', ReflectionSchema);
