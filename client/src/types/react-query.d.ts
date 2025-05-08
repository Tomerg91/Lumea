import { ReactNode } from 'react';
import { Reflection } from '../types';

declare module '@tanstack/react-query' {
  export interface UseQueryOptions<TQueryFnData, TError, TData, TQueryKey> {
    queryKey: TQueryKey;
    queryFn?: (context: QueryFunctionContext<TQueryKey>) => Promise<TQueryFnData>;
    // Add other properties as needed
  }

  export interface InvalidateQueryFilters<TQueryKey> {
    queryKey?: TQueryKey;
    // Add other properties as needed
  }

  // Fix for useQuery and invalidateQueries
  export function useQuery<TQueryFnData = unknown[], TError = Error, TData = TQueryFnData>(
    queryKey: string[],
    queryFn?: () => Promise<TQueryFnData>,
    options?: Omit<UseQueryOptions<TQueryFnData, TError, TData, string[]>, 'queryKey' | 'queryFn'>
  ): UseQueryResult<TData, TError>;

  export function invalidateQueries(
    queryClient: QueryClient,
    filters: string[] | any[]
  ): Promise<void>;

  // Add a type declaration that ensures data from useQuery for Reflection[] can be used with array methods
  export interface UseQueryResult<TData = unknown, TError = unknown> {
    data: TData;
    status: 'loading' | 'error' | 'success';
    error: TError | null;
    isLoading: boolean;
    isError: boolean;
    isSuccess: boolean;
    // Add other properties as needed
  }
}
