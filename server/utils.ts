import type { Request } from 'express';
import { z } from 'zod';

/**
 * Gets a numeric user ID from the request object
 * This handles cases where the user ID might be stored as a string or number
 */
export function getNumericUserId(req: any): number {
  const id = req.user?.id;
  
  if (typeof id === 'number') {
    return id;
  }
  
  if (typeof id === 'string') {
    return parseInt(id, 10);
  }
  
  throw new Error('User ID not found or invalid');
}

/**
 * Validates data against a Zod schema
 * @param schema The Zod schema to validate against
 * @param data The data to validate
 * @returns The validated data
 */
export function validateWithSchema<T>(schema: any, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safely converts a string ID to a number
 * @param id The ID to convert
 * @returns The numeric ID
 */
export function safeParseId(id: string | number | undefined): number | undefined {
  if (id === undefined) return undefined;
  if (typeof id === 'number') return id;
  return parseInt(id, 10);
}

/**
 * Safely gets a property from an object with type checking
 * @param obj The object to get the property from
 * @param key The key of the property
 * @returns The property value or undefined
 */
export function safeGet<T, K extends keyof T>(obj: T | null | undefined, key: K): T[K] | undefined {
  if (obj == null) return undefined;
  return obj[key];
}
