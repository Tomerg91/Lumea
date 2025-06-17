import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRealtimeTable } from './useRealtime';

// ====================== TYPES ======================

export interface Session {
  id: string;
  date: string;
  status: 'Upcoming' | 'Completed' | 'Cancelled' | 'Rescheduled';
  notes?: string;
  client_id: string;
  coach_id: string;
  payment_id?: string;
  reminder_sent: boolean;
  audio_file?: string;
  created_at: string;
  updated_at: string;
  // Joined user data
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  coach?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CreateSessionData {
  client_id: string;
  coach_id?: string;
  date: string;
  notes?: string;
  status?: 'Upcoming' | 'Completed' | 'Cancelled' | 'Rescheduled';
}

export interface UpdateSessionData {
  date?: string;
  status?: 'Upcoming' | 'Completed' | 'Cancelled' | 'Rescheduled';
  notes?: string;
}

export interface SessionFilters {
  coach_id?: string;
  client_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}

// ====================== HOOKS ======================

/**
 * Get all sessions with optional filtering
 */
export function useSessions(filters: SessionFilters = {}) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['sessions', filters, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('sessions')
        .select(`
          *,
          client:client_id (
            id,
            firstName,
            lastName,
            email
          ),
          coach:coach_id (
            id,
            firstName,
            lastName,
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
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.start_date) query = query.gte('date', filters.start_date);
      if (filters.end_date) query = query.lte('date', filters.end_date);

      const { data, error } = await query;
      if (error) throw error;
      return data as Session[];
    },
    enabled: !!user,
  });
}

/**
 * Get upcoming sessions for the current user
 */
export function useUpcomingSessions() {
  const now = new Date().toISOString();
  return useSessions({ 
    status: 'Upcoming',
    start_date: now 
  });
}

/**
 * Get a specific session by ID
 */
export function useSession(sessionId: string) {
  return useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          client:client_id (
            id,
            firstName,
            lastName,
            email
          ),
          coach:coach_id (
            id,
            firstName,
            lastName,
            email
          )
        `)
        .eq('id', sessionId)
        .single();
      
      if (error) throw error;
      return data as Session;
    },
    enabled: !!sessionId,
  });
}

/**
 * Create a new session
 */
export function useCreateSession() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateSessionData) => {
      const sessionData = {
        ...data,
        coach_id: data.coach_id || user?.id,
        status: data.status || 'Upcoming' as const,
      };

      const { data: newSession, error } = await supabase
        .from('sessions')
        .insert(sessionData)
        .select(`
          *,
          client:client_id (
            id,
            firstName,
            lastName,
            email
          ),
          coach:coach_id (
            id,
            firstName,
            lastName,
            email
          )
        `)
        .single();

      if (error) throw error;
      return newSession as Session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session-stats'] });
    },
  });
}

/**
 * Update session data
 */
export function useUpdateSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ sessionId, data }: { sessionId: string; data: UpdateSessionData }) => {
      const updateData = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      const { data: updatedSession, error } = await supabase
        .from('sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select(`
          *,
          client:client_id (
            id,
            firstName,
            lastName,
            email
          ),
          coach:coach_id (
            id,
            firstName,
            lastName,
            email
          )
        `)
        .single();

      if (error) throw error;
      return updatedSession as Session;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session', variables.sessionId] });
      queryClient.invalidateQueries({ queryKey: ['session-stats'] });
    },
  });
}

/**
 * Cancel a session
 */
export function useCancelSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data: cancelledSession, error } = await supabase
        .from('sessions')
        .update({ 
          status: 'Cancelled',
          updated_at: new Date().toISOString() 
        })
        .eq('id', sessionId)
        .select(`
          *,
          client:client_id (
            id,
            firstName,
            lastName,
            email
          ),
          coach:coach_id (
            id,
            firstName,
            lastName,
            email
          )
        `)
        .single();

      if (error) throw error;
      return cancelledSession as Session;
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['session-stats'] });
    },
  });
}

/**
 * Reschedule a session
 */
export function useRescheduleSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ sessionId, newDate }: { sessionId: string; newDate: string }) => {
      const { data: rescheduledSession, error } = await supabase
        .from('sessions')
        .update({ 
          date: newDate,
          status: 'Upcoming',
          updated_at: new Date().toISOString() 
        })
        .eq('id', sessionId)
        .select(`
          *,
          client:client_id (
            id,
            firstName,
            lastName,
            email
          ),
          coach:coach_id (
            id,
            firstName,
            lastName,
            email
          )
        `)
        .single();

      if (error) throw error;
      return rescheduledSession as Session;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session', variables.sessionId] });
      queryClient.invalidateQueries({ queryKey: ['session-stats'] });
    },
  });
}

/**
 * Complete a session
 */
export function useCompleteSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data: completedSession, error } = await supabase
        .from('sessions')
        .update({ 
          status: 'Completed',
          updated_at: new Date().toISOString() 
        })
        .eq('id', sessionId)
        .select(`
          *,
          client:client_id (
            id,
            firstName,
            lastName,
            email
          ),
          coach:coach_id (
            id,
            firstName,
            lastName,
            email
          )
        `)
        .single();

      if (error) throw error;
      return completedSession as Session;
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['session-stats'] });
    },
  });
}

/**
 * Delete a session
 */
export function useDeleteSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['session-stats'] });
    },
  });
}

/**
 * Hook to get real-time session updates
 */
export function useRealtimeSessions(filters: SessionFilters = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Set up real-time subscription for sessions
  useRealtimeTable(
    'sessions',
    user?.role === 'coach' ? `coach_id=eq.${user.id}` : 
    user?.role === 'client' ? `client_id=eq.${user.id}` : null,
    () => {
      // Invalidate session queries on real-time updates
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session-stats'] });
    }
  );

  // Return the regular sessions query which will be updated by real-time events
  return useSessions(filters);
}

// ====================== UTILITY HOOKS ======================

/**
 * Get session statistics
 */
export function useSessionStats() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['session-stats', user?.id],
    queryFn: async () => {
      let query = supabase.from('sessions').select('status, date');
      
      if (user?.role === 'client') {
        query = query.eq('client_id', user.id);
      } else if (user?.role === 'coach') {
        query = query.eq('coach_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const stats = {
        total: data.length,
        upcoming: data.filter(s => s.status === 'Upcoming').length,
        completed: data.filter(s => s.status === 'Completed').length,
        cancelled: data.filter(s => s.status === 'Cancelled').length,
        thisMonth: data.filter(s => {
          const sessionDate = new Date(s.date);
          const now = new Date();
          return sessionDate.getMonth() === now.getMonth() && 
                 sessionDate.getFullYear() === now.getFullYear();
        }).length,
      };

      return stats;
    },
    enabled: !!user,
  });
}

/**
 * Check if user can create sessions (coaches only)
 */
export function useCanCreateSessions() {
  const { user } = useAuth();
  return user?.role === 'coach';
}

/**
 * Check if user can modify a specific session
 */
export function useCanModifySession(session: Session | undefined) {
  const { user } = useAuth();
  if (!session || !user) return false;
  
  // Coach can modify their own sessions
  if (user.role === 'coach' && session.coach_id === user.id) return true;
  
  // Client can reschedule/cancel their upcoming sessions
  if (user.role === 'client' && session.client_id === user.id && session.status === 'Upcoming') {
    return true;
  }
  
  return false;
} 