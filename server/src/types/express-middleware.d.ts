import 'express';

// Type fix for middleware compatibility issues
// This uses a more flexible definition to avoid type conflicts
declare namespace Express {
  interface Request {
    user?: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
      role?: string;
      roleName?: string;
      isActive?: boolean;
      [key: string]: any;
    };
  }
}

export {};
