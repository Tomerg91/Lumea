import mongoose, { Document, Schema } from 'mongoose';

export interface IInviteToken extends Document {
  token: string;
  coachId: mongoose.Types.ObjectId;
  email: string;
  expires: Date;
  createdAt: Date;
}

const InviteTokenSchema = new Schema<IInviteToken>({
  token: {
    type: String,
    required: true,
    unique: true,
  },
  coachId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  expires: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// TTL index for automatic expiry handling
InviteTokenSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });

export const InviteToken = mongoose.model<IInviteToken>('InviteToken', InviteTokenSchema);
