import mongoose, { Document } from 'mongoose';

export interface IFile extends Document {
  userId: mongoose.Types.ObjectId;
  url: string;
  filename: string;
  mimetype: string;
  size: number;
  context?: 'profile' | 'resource' | 'audio_note';
  createdAt: Date;
  updatedAt: Date;
}

const fileSchema = new mongoose.Schema<IFile>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    mimetype: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    context: {
      type: String,
      enum: ['profile', 'resource', 'audio_note'],
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
fileSchema.index({ userId: 1, context: 1 });

export const File = mongoose.model<IFile>('File', fileSchema); 