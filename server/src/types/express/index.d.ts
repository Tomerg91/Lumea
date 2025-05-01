declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      name: string | null;
      role: string;
      // Add any other fields attached to req.user during authentication
    }
  }
}

// If this file doesn't contain any top-level imports or exports,
// you might need to add an empty export to make it a module.
export {};
