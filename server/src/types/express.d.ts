import 'express';
import { IUser } from '../models/User';

// Properly augment the Express namespace
declare global {
  namespace Express {
    interface User {
      id: string | number;
      _id?: string;
      name: string;
      email: string;
      role: 'coach' | 'client' | 'admin';
      [key: string]: unknown;
    }
  }
}

export {};
