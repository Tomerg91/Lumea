import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  id?: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  name: string;
  role: 'admin' | 'coach' | 'client';
  status?: 'active' | 'pending' | 'inactive';
  profilePicture?: string;
  phoneNumber?: string;
  timezone?: string;
  language?: 'he' | 'en';
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    passwordSalt: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'coach', 'client'],
      default: 'client',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'inactive'],
      default: 'active',
    },
    profilePicture: {
      type: String,
    },
    phoneNumber: {
      type: String,
    },
    timezone: {
      type: String,
      default: 'Asia/Jerusalem', // Default to Israel timezone
    },
    language: {
      type: String,
      enum: ['he', 'en'],
      default: 'he', // Default to Hebrew
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', userSchema); 