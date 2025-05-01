import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

// Encryption key and IV for field-level encryption
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ENCRYPTION_IV = process.env.ENCRYPTION_IV || crypto.randomBytes(16).toString('hex');

export interface ICoachNote extends Document {
  sessionId: mongoose.Types.ObjectId;
  coachId: mongoose.Types.ObjectId;
  textContent: string;
  audioFileId?: mongoose.Types.ObjectId;
  tags?: mongoose.Types.ObjectId[];
  isEncrypted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const coachNoteSchema = new Schema<ICoachNote>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    coachId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    textContent: {
      type: String,
      required: true,
    },
    audioFileId: {
      type: Schema.Types.ObjectId,
      ref: 'File',
    },
    tags: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Tag',
      },
    ],
    isEncrypted: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
coachNoteSchema.index({ sessionId: 1 });
coachNoteSchema.index({ coachId: 1 });

// Pre-save middleware to encrypt text content
coachNoteSchema.pre('save', function (next) {
  if (this.isModified('textContent') && this.isEncrypted) {
    try {
      const cipher = crypto.createCipheriv(
        'aes-256-cbc',
        Buffer.from(ENCRYPTION_KEY, 'hex'),
        Buffer.from(ENCRYPTION_IV, 'hex')
      );
      let encrypted = cipher.update(this.textContent, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      this.textContent = encrypted;
    } catch (error) {
      console.error('Error encrypting coach note text:', error);
      next(error as Error);
      return;
    }
  }
  next();
});

// Method to decrypt text content
coachNoteSchema.methods.decryptText = function (): string {
  if (!this.isEncrypted) {
    return this.textContent;
  }

  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      Buffer.from(ENCRYPTION_IV, 'hex')
    );
    let decrypted = decipher.update(this.textContent, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Error decrypting coach note text:', error);
    return 'Error decrypting content';
  }
};

export const CoachNote = mongoose.model<ICoachNote>('CoachNote', coachNoteSchema);
