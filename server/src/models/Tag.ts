import mongoose, { Schema, Document } from 'mongoose';

export interface ITag extends Document {
  name: string;
  color?: string;
  description?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const tagSchema = new Schema<ITag>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
    },
    description: {
      type: String,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Index for faster queries by user
tagSchema.index({ createdBy: 1 });

export const Tag = mongoose.model<ITag>('Tag', tagSchema); 