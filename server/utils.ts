import type { Request } from 'express';

/**
 * Extracts and converts the user ID from the request to a number
 * @param req - Express request object
 * @returns User ID as a number
 * @throws Error if user ID is missing or not numeric
 */
export function getNumericUserId(req: Request): number {
  const id = Number((req.user as { id: unknown })?.id);
  if (Number.isNaN(id)) {
    throw new Error('Corrupt session: user id missing or non-numeric');
  }
  return id;
}
