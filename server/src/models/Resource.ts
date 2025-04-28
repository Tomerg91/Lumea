import mongoose, { Schema, Document } from 'mongoose';

export interface IResource extends Document {
  title: string;
  description: string;
  fileId: mongoose.Types.ObjectId;
  coachId: mongoose.Types.ObjectId;
  tags?: mongoose.Types.ObjectId[];
  assignedClientIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const resourceSchema = new Schema<IResource>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    fileId: {
      type: Schema.Types.ObjectId,
      ref: 'File',
      required: true,
    },
    coachId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tags: [{
      type: Schema.Types.ObjectId,
      ref: 'Tag',
    }],
    assignedClientIds: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
resourceSchema.index({ coachId: 1 });
resourceSchema.index({ assignedClientIds: 1 });
resourceSchema.index({ tags: 1 });

export const Resource = mongoose.model<IResource>('Resource', resourceSchema); 