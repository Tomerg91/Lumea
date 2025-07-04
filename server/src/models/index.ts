import { PrismaClient } from '@prisma/client';

// Create a singleton Prisma client instance
const prisma = new PrismaClient();

// Export the Prisma client instance as default
export default prisma;

// Export the Prisma client class for direct instantiation if needed
export { PrismaClient };

// Re-export Prisma types for convenience
export type { Prisma } from '@prisma/client'; 