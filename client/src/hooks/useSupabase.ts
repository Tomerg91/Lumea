import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeTable } from './useRealtime';
import { useEffect, useCallback } from 'react';

// Type definitions for Supabase operations - updated to match actual database schema
export type SupabaseTable = 
  | 'users'
  | 'sessions'
  | 'reflections' 
  | 'coach_notes' 
  | 'resources' 
  | 'resource_users'
  | 'files'
  | 'notifications'
  | 'calendar_integrations'
  | 'calendar_events'
  | 'payments'
  | 'audit_logs'
  | 'consents' // Fixed: was 'consent_records'
  | 'session_feedback'
  | 'performance_metrics'
  | 'password_reset_tokens';

export type SupabaseQueryBuilder = ReturnType<typeof supabase.from>;

// Enhanced error type for better error handling
export interface SupabaseError extends Error {
  code?: string;
  details?: string;
  hint?: string;
}

// Context type for mutation operations
interface MutationContext {
  previousData?: Record<string, any>;
}

// Options for useSupabaseQuery hook
export interface UseSupabaseQueryOptions<TData = any> extends Omit<UseQueryOptions<TData, SupabaseError>, 'queryKey' | 'queryFn'> {
  // Real-time options
  realtime?: {
    enabled?: boolean;
    table?: SupabaseTable;
    filter?: string;
    schema?: string;
  };
  // Authentication requirement
  requireAuth?: boolean;
}

// Options for useSupabaseMutation hook
export interface UseSupabaseMutationOptions<TData = any, TVariables = any> extends UseMutationOptions<TData, SupabaseError, TVariables, MutationContext> {
  // Optimistic update configuration
  optimistic?: {
    enabled: boolean;
    updateFn: (oldData: any, variables: TVariables) => any;
    rollbackFn?: (oldData: any, variables: TVariables) => any;
  };
  // Cache invalidation
  invalidateQueries?: string[];
}

/**
 * Enhanced useSupabaseQuery hook that integrates Supabase with React Query
 * Provides caching, background updates, and optional real-time subscriptions
 */
export function useSupabaseQuery<TData = any>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<{ data: TData | null; error: any }>,
  options: UseSupabaseQueryOptions<TData> = {}
) {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  // Check authentication requirement
  const canExecute = options.requireAuth === false || !!session;

  // Enhanced query function with error handling
  const enhancedQueryFn = useCallback(async (): Promise<TData> => {
    if (!canExecute) {
      throw new Error('Authentication required for this query');
    }

    const result = await queryFn();
    
    if (result.error) {
      const error: SupabaseError = new Error(result.error.message || 'Supabase query failed');
      error.code = result.error.code;
      error.details = result.error.details;
      error.hint = result.error.hint;
      throw error;
    }

    return result.data as TData;
  }, [queryFn, canExecute]);

  // Setup real-time subscription if enabled
  useRealtimeTable(
    options.realtime?.table || '',
    options.realtime?.filter || null,
    (payload) => {
      // Invalidate related queries on real-time updates
      if (options.realtime?.enabled && canExecute) {
        queryClient.invalidateQueries({ queryKey });
      }
    }
  );

  return useQuery({
    queryKey: [...queryKey, 'supabase-query'],
    queryFn: enhancedQueryFn,
    enabled: canExecute,
    ...options,
  });
}

/**
 * Enhanced useSupabaseMutation hook for Supabase mutations with optimistic updates
 */
export function useSupabaseMutation<TData = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<{ data: TData | null; error: any }>,
  options: UseSupabaseMutationOptions<TData, TVariables> = {}
) {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  // Enhanced mutation function with error handling
  const enhancedMutationFn = useCallback(async (variables: TVariables): Promise<TData> => {
    const result = await mutationFn(variables);
    
    if (result.error) {
      const error: SupabaseError = new Error(result.error.message || 'Supabase mutation failed');
      error.code = result.error.code;
      error.details = result.error.details;
      error.hint = result.error.hint;
      throw error;
    }

    return result.data as TData;
  }, [mutationFn]);

  return useMutation({
    mutationFn: enhancedMutationFn,
    onMutate: async (variables) => {
      // Handle optimistic updates
      if (options.optimistic?.enabled) {
        // Cancel outgoing refetches
        if (options.invalidateQueries) {
          await Promise.all(
            options.invalidateQueries.map(queryKey =>
              queryClient.cancelQueries({ queryKey: [queryKey] })
            )
          );
        }

        // Snapshot previous values
        const previousData: Record<string, any> = {};
        if (options.invalidateQueries) {
          options.invalidateQueries.forEach(queryKey => {
            previousData[queryKey] = queryClient.getQueryData([queryKey]);
          });
        }

        // Apply optimistic updates
        if (options.invalidateQueries && options.optimistic.updateFn) {
          options.invalidateQueries.forEach(queryKey => {
            queryClient.setQueryData([queryKey], (oldData: any) =>
              options.optimistic!.updateFn(oldData, variables)
            );
          });
        }

        return { previousData };
      }

      // Call original onMutate if provided
      return options.onMutate?.(variables);
    },
    onError: (error, variables, context) => {
      // Rollback optimistic updates on error
      if (options.optimistic?.enabled && context?.previousData) {
        Object.entries(context.previousData).forEach(([queryKey, data]) => {
          queryClient.setQueryData([queryKey], data);
        });
      }

      // Call original onError if provided
      options.onError?.(error, variables, context);
    },
    onSettled: (data, error, variables, context) => {
      // Invalidate queries after mutation completes
      if (options.invalidateQueries) {
        options.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey: [queryKey] });
        });
      }

      // Call original onSettled if provided
      options.onSettled?.(data, error, variables, context);
    },
    onSuccess: options.onSuccess,
  });
}

/**
 * Utility hook for common Supabase query patterns
 */
export function useSupabaseSelect<TData = any>(
  table: SupabaseTable,
  select: string = '*',
  filters?: Record<string, any>,
  options: UseSupabaseQueryOptions<TData[]> = {}
) {
  return useSupabaseQuery(
    [table, select, filters],
    async () => {
      let query = supabase.from(table).select(select);
      
      // Apply filters
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      return query;
    },
    {
      requireAuth: true,
      realtime: {
        enabled: true,
        table,
      },
      ...options,
    }
  );
}

/**
 * Utility hook for Supabase insert operations
 */
export function useSupabaseInsert(
  table: SupabaseTable,
  options: UseSupabaseMutationOptions<any, any> = {}
) {
  return useSupabaseMutation(
    async (data: any) => supabase.from(table).insert(data).select(),
    {
      invalidateQueries: [table],
      ...options,
    }
  );
}

/**
 * Utility hook for Supabase update operations
 */
export function useSupabaseUpdate(
  table: SupabaseTable,
  options: UseSupabaseMutationOptions<any, { id: string; data: any }> = {}
) {
  return useSupabaseMutation(
    async ({ id, data }) => supabase.from(table).update(data).eq('id', id).select(),
    {
      invalidateQueries: [table],
      ...options,
    }
  );
}

/**
 * Utility hook for Supabase delete operations
 */
export function useSupabaseDelete(
  table: SupabaseTable,
  options: UseSupabaseMutationOptions<any, string> = {}
) {
  return useSupabaseMutation(
    async (id: string) => supabase.from(table).delete().eq('id', id),
    {
      invalidateQueries: [table],
      ...options,
    }
  );
} 