import mongoose, { Schema, Document } from 'mongoose';

export interface IResource extends Document {
  title: string;
  description: string;
  fileId?: mongoose.Types.ObjectId;
  coachId?: mongoose.Types.ObjectId;
  // Test properties
  url?: string;
  resourceType?: 'article' | 'video' | 'document' | 'exercise';
  addedBy?: mongoose.Types.ObjectId;
  sharedWithRoles?: ('admin' | 'coach' | 'client')[];
  tags?: mongoose.Types.ObjectId[] | string[];
  assignedClientIds?: mongoose.Types.ObjectId[];
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
    },
    coachId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    // Test fields
    url: {
      type: String,
      trim: true,
    },
    resourceType: {
      type: String,
      enum: ['article', 'video', 'document', 'exercise'],
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    sharedWithRoles: [
      {
        type: String,
        enum: ['admin', 'coach', 'client'],
      },
    ],
    tags: [
      {
        type: Schema.Types.Mixed, // Allow both ObjectId and string
      },
    ],
    assignedClientIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
resourceSchema.index({ coachId: 1 });
resourceSchema.index({ assignedClientIds: 1 });
resourceSchema.index({ tags: 1 });
resourceSchema.index({ addedBy: 1 });
resourceSchema.index({ resourceType: 1 });

export const Resource = mongoose.model<IResource>('Resource', resourceSchema);
