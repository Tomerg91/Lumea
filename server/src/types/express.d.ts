import { IUser } from '../models/User';
import mongoose from 'mongoose';

declare global {
  namespace Express {
    // Define a proper User interface that matches our model
    interface User {
      id: string; // Force id to be string
      firstName: string;
      lastName: string;
      email: string;
      role: string | mongoose.Types.ObjectId | { name: string } | null;
      isActive: boolean;
      status: string;
      profilePicture?: string;
      [key: string]: any; // Allow other properties
    }

    // Explicitly augment the Request interface
    interface Request {
      user?: User;
    }
  }
}

export {};
