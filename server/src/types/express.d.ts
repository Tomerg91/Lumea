import { IUser } from '../models/User';
import mongoose from 'mongoose';
import { AuthenticatedUserPayload } from './user';

declare global {
  namespace Express {
    // Explicitly define Express.User to match AuthenticatedUserPayload structure
    interface User {
      id: string;       // Ensure id is string
      email: string;
      role: string;     // Ensure role is string
      name?: string;    // Optional name
      // Ensure this interface contains all fields expected by passport on the User object
      // and that these fields are present in AuthenticatedUserPayload.
      [key: string]: any; // Added back index signature for Passport compatibility
    }

    // Explicitly augment the Request interface
    interface Request {
      user?: AuthenticatedUserPayload; // req.user should be AuthenticatedUserPayload
    }
  }
}

export {};
