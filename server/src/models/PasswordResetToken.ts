import mongoose, { Document, Schema } from 'mongoose';

export interface IPasswordResetToken extends Document {
  token: string;
  userId: mongoose.Types.ObjectId;
  expires: Date;
  createdAt: Date;
}

const PasswordResetTokenSchema = new Schema<IPasswordResetToken>({
  token: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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
PasswordResetTokenSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetToken = mongoose.model<IPasswordResetToken>(
  'PasswordResetToken',
  PasswordResetTokenSchema
);
