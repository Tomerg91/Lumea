import { Types } from 'mongoose';

// Adjust this interface to accurately represent the object attached to req.user
// by your authentication middleware (e.g., passport after finding user in DB).
export interface AuthenticatedUserPayload {
  id: string; // Usually converted from ObjectId to string
  email: string;
  role: string; // Ensure your middleware provides role as a string
  name?: string;
  // Add any other properties consistently attached to req.user
}
