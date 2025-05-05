import { Request } from 'express';

// Types for pagination parameters
export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

// Types for sort parameters
export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * Parse and validate pagination parameters from request query
 * @param req - Express request object
 * @param defaultLimit - Default items per page (default: 10)
 * @param maxLimit - Maximum allowed items per page (default: 100)
 * @returns Pagination parameters object
 */
export const getPaginationParams = (
  req: Request,
  defaultLimit = 10,
  maxLimit = 100
): PaginationParams => {
  // Parse page and limit from query params
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  let limit = parseInt(req.query.limit as string) || defaultLimit;

  // Ensure limit doesn't exceed maximum
  limit = Math.min(limit, maxLimit);

  // Calculate skip value for pagination
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Parse and validate sort parameters from request query
 * @param req - Express request object
 * @param defaultField - Default field to sort by
 * @param defaultOrder - Default sort order
 * @param allowedFields - Array of fields allowed for sorting
 * @returns Sort parameters object
 */
export const getSortParams = (
  req: Request,
  defaultField: string,
  defaultOrder: 'asc' | 'desc' = 'asc',
  allowedFields: string[] = []
): SortParams => {
  const field = (req.query.sortBy as string) || defaultField;
  const order = (req.query.order as string)?.toLowerCase() === 'desc' ? 'desc' : defaultOrder;

  // Validate sort field if allowedFields is provided
  if (allowedFields.length > 0 && !allowedFields.includes(field)) {
    return { field: defaultField, order };
  }

  return { field, order };
};

/**
 * Parse field selection (projection) from request query
 * @param req - Express request object
 * @param defaultFields - Default fields to select
 * @param allowedFields - Array of fields allowed for selection
 * @returns Object with selected fields for Prisma select
 */
export const getFieldSelection = (
  req: Request,
  defaultFields: string[] = [],
  allowedFields: string[] = []
): Record<string, boolean> => {
  // Parse fields from query parameter (e.g., fields=id,name,email)
  const requestedFields = (req.query.fields as string)?.split(',').filter(Boolean) || [];

  // If no fields requested, use defaults
  if (requestedFields.length === 0) {
    return defaultFields.reduce((acc, field) => ({ ...acc, [field]: true }), {});
  }

  // Filter requested fields against allowed fields if provided
  const fieldsToSelect =
    allowedFields.length > 0
      ? requestedFields.filter((field) => allowedFields.includes(field))
      : requestedFields;

  // If all requested fields were invalid, fall back to defaults
  if (fieldsToSelect.length === 0) {
    return defaultFields.reduce((acc, field) => ({ ...acc, [field]: true }), {});
  }

  // Create projection object for Prisma
  return fieldsToSelect.reduce((acc, field) => ({ ...acc, [field]: true }), {});
};

/**
 * Generate metadata for paginated responses
 * @param total - Total count of items
 * @param pagination - Pagination parameters
 * @returns Pagination metadata object
 */
export const getPaginationMetadata = (total: number, pagination: PaginationParams) => {
  const { page, limit } = pagination;
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    totalItems: total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

/**
 * Generate standardized paginated response
 * @param data - Array of data items
 * @param total - Total count of items
 * @param pagination - Pagination parameters
 * @returns Formatted response object with data and pagination metadata
 */
export const createPaginatedResponse = <T>(
  data: T[],
  total: number,
  pagination: PaginationParams
) => {
  return {
    data,
    pagination: getPaginationMetadata(total, pagination),
  };
};
