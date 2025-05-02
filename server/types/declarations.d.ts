// Type declarations for the server

import { Request } from 'express';

// Type for objects that can decrypt text
export interface Decryptable {
  decryptText(): string;
}

// DB query type - a generic type for database query objects
export type DatabaseQuery = unknown;

// This makes the TypeScript compiler happy for now
// Later we can replace with proper types from the ORM
export type QueryBuilder = unknown;

// Declare global types like these to help with typings
declare global {
  namespace Express {
    // Express specific augmentations - already defined in express.d.ts
  }
} 