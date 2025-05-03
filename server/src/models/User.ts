import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

// User interface definition
export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  role: mongoose.Types.ObjectId | { name: string } | null;
  isActive: boolean;
  status: 'active' | 'pending' | 'inactive';
  profilePicture?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  verifyPassword(candidatePassword: string): Promise<boolean>;
  toObject(): Record<string, unknown>;
}

// Define schema with encryption methods
const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    passwordSalt: { type: String, required: true },
    role: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      required: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['active', 'pending', 'inactive'],
      default: 'pending',
    },
    profilePicture: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

// Pre-save hook to hash passwords
userSchema.pre<IUser>('save', async function (next) {
  // Only hash the password if it's modified
  if (!this.isModified('passwordHash')) return next();

  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password with the salt
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to verify password
userSchema.methods.verifyPassword = async function (candidatePassword: string): Promise<boolean> {
  // No need for try/catch here - let caller handle any errors
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Export the User model
export const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
