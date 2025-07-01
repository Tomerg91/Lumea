import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRealtimeTable } from './useRealtime';
import { 
  Session, 
  SessionWithUsers, 
  CreateSessionData, 
  UpdateSessionData, 
  SessionFilters 
} from '../types/session';

// ====================== QUERY OPTIONS ======================

/**
 * Default query options for sessions
 */
const DEFAULT_SESSIONS_QUERY_OPTIONS = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  retry: (failureCount: number, error: any) => {
    // Retry up to 3 times for network errors
    if (failureCount >= 3) return false;
    
    // Don't retry for auth errors
    if (error?.message?.includes('JWT') || error?.status === 401) {
      return false;
    }
    
    return true;
  },
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
};

/**
 * Background refetch options for sessions
 */
const BACKGROUND_REFETCH_OPTIONS = {
  refetchInterval: 30 * 1000, // 30 seconds
  refetchIntervalInBackground: false,
};

// ====================== HOOKS ======================

/**
 * Get all sessions with optional filtering - optimized version
 */
export function useSessions(filters: SessionFilters = {}) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['sessions', 'list', filters, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('sessions')
        .select(`
          *,
          client:client_id (
            id,
            name,
            email
          ),
          coach:coach_id (
            id,
            name,
            email
          )
        `)
        .order('date', { ascending: false });

      // Apply user-based filtering
      if (user?.role === 'client') {
        query = query.eq('client_id', user.id);
      } else if (user?.role === 'coach') {
        query = query.eq('coach_id', user.id);
      }

      // Apply additional filters
      if (filters.coach_id) query = query.eq('coach_id', filters.coach_id);
      if (filters.client_id) query = query.eq('client_id', filters.client_id);
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }
      if (filters.start_date) query = query.gte('date', filters.start_date);
      if (filters.end_date) query = query.lte('date', filters.end_date);
      if (filters.limit) query = query.limit(filters.limit);
      if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);

      const { data, error } = await query;
      if (error) {
        console.error('Sessions query error:', error);
        throw error;
      }
      return data as SessionWithUsers[];
    },
    enabled: !!user,
    ...DEFAULT_SESSIONS_QUERY_OPTIONS,
    // Add background refetch for live data
    ...(filters.live ? BACKGROUND_REFETCH_OPTIONS : {}),
  });
}

/**
 * Get upcoming sessions for the current user - optimized
 */
export function useUpcomingSessions() {
  const now = new Date().toISOString();
  return useSessions({ 
    status: 'Upcoming',
    start_date: now,
    limit: 20, // Limit for performance
    live: true // Enable background refetch for upcoming sessions
  });
}

/**
 * Get a specific session by ID - optimized
 */
export function useSession(sessionId: string) {
  return useQuery({
    queryKey: ['sessions', 'detail', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          client:client_id (
            id,
            name,
            email
          ),
          coach:coach_id (
            id,
            name,
            email
          )
        `)
        .eq('id', sessionId)
        .single();
      
      if (error) {
        console.error('Session detail query error:', error);
        throw error;
      }
      return data as SessionWithUsers;
    },
    enabled: !!sessionId,
    ...DEFAULT_SESSIONS_QUERY_OPTIONS,
  });
}

/**
 * Create a new session - optimized with error handling
 */
export function useCreateSession() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateSessionData) => {
      const sessionData = {
        ...data,
        coach_id: data.coach_id || user?.id,
        status: data.status || 'upcoming' as const,
      };

      const { data: newSession, error } = await supabase
        .from('sessions')
        .insert(sessionData)
        .select(`
          *,
          client:client_id (
            id,
            name,
            email
          ),
          coach:coach_id (
            id,
            name,
            email
          )
        `)
        .single();

      if (error) {
        console.error('Create session error:', error);
        throw error;
      }
      return newSession as SessionWithUsers;
    },
    onSuccess: (newSession) => {
      // Optimistically update cache
      queryClient.setQueryData(['sessions', 'detail', newSession.id], newSession);
      
      // Invalidate list queries to refetch
      queryClient.invalidateQueries({ queryKey: ['sessions', 'list'] });
      
      // Update stats if they exist
      queryClient.invalidateQueries({ queryKey: ['sessions', 'stats'] });
    },
    onError: (error) => {
      console.error('Failed to create session:', error);
    },
    retry: 2,
    retryDelay: 1000,
  });
}

/**
 * Update an existing session - optimized with optimistic updates
 */
export function useUpdateSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ sessionId, data }: { sessionId: string; data: UpdateSessionData }) => {
      const { data: updatedSession, error } = await supabase
        .from('sessions')
        .update(data)
        .eq('id', sessionId)
        .select(`
          *,
          client:client_id (
            id,
            name,
            email
          ),
          coach:coach_id (
            id,
            name,
            email
          )
        `)
        .single();

      if (error) {
        console.error('Update session error:', error);
        throw error;
      }
      return updatedSession as SessionWithUsers;
    },
    onMutate: async ({ sessionId, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['sessions', 'detail', sessionId] });
      
      // Snapshot the previous value
      const previousSession = queryClient.getQueryData(['sessions', 'detail', sessionId]);
      
      // Optimistically update to the new value
      if (previousSession) {
        queryClient.setQueryData(['sessions', 'detail', sessionId], {
          ...(previousSession as object),
          ...data,
        });
      }
      
      return { previousSession };
    },
    onSuccess: (updatedSession) => {
      // Update the cache with the server response
      queryClient.setQueryData(['sessions', 'detail', updatedSession.id], updatedSession);
      
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: ['sessions', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', 'stats'] });
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousSession) {
        queryClient.setQueryData(
          ['sessions', 'detail', variables.sessionId], 
          context.previousSession
        );
      }
      console.error('Failed to update session:', error);
    },
    retry: 2,
    retryDelay: 1000,
  });
}

/**
 * Cancel a session - enhanced with optimistic updates
 */
export function useCancelSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase
        .from('sessions')
        .update({ status: 'cancelled' })
        .eq('id', sessionId)
        .select(`
          *,
          client:client_id (
            id,
            name,
            email
          ),
          coach:coach_id (
            id,
            name,
            email
          )
        `)
        .single();

      if (error) {
        console.error('Cancel session error:', error);
        throw error;
      }
      return data as SessionWithUsers;
    },
    onMutate: async (sessionId) => {
      await queryClient.cancelQueries({ queryKey: ['sessions', 'detail', sessionId] });
      
      const previousSession = queryClient.getQueryData(['sessions', 'detail', sessionId]);
      
      if (previousSession) {
        queryClient.setQueryData(['sessions', 'detail', sessionId], {
          ...(previousSession as object),
          status: 'cancelled',
        });
      }
      
      return { previousSession };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['sessions', 'detail', data.id], data);
      queryClient.invalidateQueries({ queryKey: ['sessions', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', 'stats'] });
    },
    onError: (error, sessionId, context) => {
      if (context?.previousSession) {
        queryClient.setQueryData(['sessions', 'detail', sessionId], context.previousSession);
      }
      console.error('Failed to cancel session:', error);
    },
    retry: 2,
  });
}

/**
 * Reschedule a session - enhanced with optimistic updates
 */
export function useRescheduleSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ sessionId, newDate }: { sessionId: string; newDate: string }) => {
      const { data, error } = await supabase
        .from('sessions')
        .update({ 
          date: newDate,
          status: 'upcoming', // Reset status when rescheduling
        })
        .eq('id', sessionId)
        .select(`
          *,
          client:client_id (
            id,
            name,
            email
          ),
          coach:coach_id (
            id,
            name,
            email
          )
        `)
        .single();

      if (error) {
        console.error('Reschedule session error:', error);
        throw error;
      }
      return data as SessionWithUsers;
    },
    onMutate: async ({ sessionId, newDate }) => {
      await queryClient.cancelQueries({ queryKey: ['sessions', 'detail', sessionId] });
      
      const previousSession = queryClient.getQueryData(['sessions', 'detail', sessionId]);
      
      if (previousSession) {
        queryClient.setQueryData(['sessions', 'detail', sessionId], {
          ...(previousSession as object),
          date: newDate,
          status: 'upcoming',
        });
      }
      
      return { previousSession };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['sessions', 'detail', data.id], data);
      queryClient.invalidateQueries({ queryKey: ['sessions', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', 'stats'] });
    },
    onError: (error, variables, context) => {
      if (context?.previousSession) {
        queryClient.setQueryData(['sessions', 'detail', variables.sessionId], context.previousSession);
      }
      console.error('Failed to reschedule session:', error);
    },
    retry: 2,
  });
}

/**
 * Complete a session - enhanced with optimistic updates
 */
export function useCompleteSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ sessionId, notes }: { sessionId: string; notes?: string }) => {
      const updateData: UpdateSessionData = { 
        status: 'Completed',
        ...(notes && { notes }) 
      };
      
      const { data, error } = await supabase
        .from('sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select(`
          *,
          client:client_id (
            id,
            name,
            email
          ),
          coach:coach_id (
            id,
            name,
            email
          )
        `)
        .single();

      if (error) {
        console.error('Complete session error:', error);
        throw error;
      }
      return data as SessionWithUsers;
    },
    onMutate: async ({ sessionId, notes }) => {
      await queryClient.cancelQueries({ queryKey: ['sessions', 'detail', sessionId] });
      
      const previousSession = queryClient.getQueryData(['sessions', 'detail', sessionId]);
      
      if (previousSession) {
        queryClient.setQueryData(['sessions', 'detail', sessionId], {
          ...(previousSession as object),
          status: 'Completed',
          ...(notes && { notes }),
        });
      }
      
      return { previousSession };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['sessions', 'detail', data.id], data);
      queryClient.invalidateQueries({ queryKey: ['sessions', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', 'stats'] });
    },
    onError: (error, variables, context) => {
      if (context?.previousSession) {
        queryClient.setQueryData(['sessions', 'detail', variables.sessionId], context.previousSession);
      }
      console.error('Failed to complete session:', error);
    },
    retry: 2,
  });
}

/**
 * Delete a session - enhanced with optimistic updates
 */
export function useDeleteSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);

      if (error) {
        console.error('Delete session error:', error);
        throw error;
      }
      
      return sessionId;
    },
    onMutate: async (sessionId) => {
      await queryClient.cancelQueries({ queryKey: ['sessions'] });
      
      const previousSessions = queryClient.getQueryData(['sessions', 'list']);
      
      return { previousSessions };
    },
    onSuccess: (sessionId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['sessions', 'detail', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['sessions', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', 'stats'] });
    },
    onError: (error, sessionId, context) => {
      if (context?.previousSessions) {
        queryClient.setQueryData(['sessions', 'list'], context.previousSessions);
      }
      console.error('Failed to delete session:', error);
    },
    retry: 1,
  });
}

/**
 * Real-time sessions with optimized subscriptions
 */
export function useRealtimeSessions(filters: SessionFilters = {}) {
  const sessionsQuery = useSessions(filters);
  
  // Use realtime subscription for live updates
  useRealtimeTable(
    'sessions',
    null, // No filter
    (payload) => {
      const queryClient = useQueryClient();
      // Handle real-time updates
      queryClient.invalidateQueries({ queryKey: ['sessions', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', 'stats'] });
    }
  );
  
  return sessionsQuery;
}

/**
 * Session statistics with enhanced caching
 */
export function useSessionStats() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['sessions', 'stats', user?.id],
    queryFn: async () => {
      let query = supabase.from('sessions').select('status');
      
      if (user?.role === 'client') {
        query = query.eq('client_id', user.id);
      } else if (user?.role === 'coach') {
        query = query.eq('coach_id', user.id);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Session stats error:', error);
        throw error;
      }
      
      const stats = {
        total: data.length,
        upcoming: data.filter(s => s.status === 'upcoming').length,
        completed: data.filter(s => s.status === 'completed').length,
        cancelled: data.filter(s => s.status === 'cancelled').length,
      };
      
      return stats;
    },
    enabled: !!user,
    ...DEFAULT_SESSIONS_QUERY_OPTIONS,
    staleTime: 2 * 60 * 1000, // Stats can be a bit more stale
  });
}

/**
 * Enhanced session permissions check
 */
export function useCanCreateSessions() {
  const { user } = useAuth();
  return !!user && ['coach', 'admin'].includes(user.role || '');
}

/**
 * Enhanced session modification permissions
 */
export function useCanModifySession(session: SessionWithUsers | undefined) {
  const { user } = useAuth();
  
  if (!user || !session) return false;
  
  // Admin can modify any session
  if (user.role === 'admin') return true;
  
  // Coach can modify their own sessions
  if (user.role === 'coach' && session.coach_id === user.id) return true;
  
  // Client can only view their sessions (no modification)
  return false;
} 