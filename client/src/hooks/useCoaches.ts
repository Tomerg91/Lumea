import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// ====================== TYPES ======================

export interface Coach {
  id: string;
  name: string;
  email: string;
  firstName: string;
  lastName: string;
  bio?: string;
  specializations?: string[];
  created_at: string;
  updated_at: string;
  // Related data
  sessions?: Array<{
    id: string;
    date: string;
    status: string;
  }>;
  clients?: Array<{
    id: string;
    name: string;
    email: string;
  }>;
}

export interface CoachFilters {
  search?: string;
  specialization?: string;
  active_only?: boolean;
  has_availability?: boolean;
}

// ====================== HOOKS ======================

/**
 * Get all coaches with optional filtering
 */
export function useCoaches(filters: CoachFilters = {}) {
  return useQuery({
    queryKey: ['coaches', filters],
    queryFn: async () => {
      let query = supabase
        .from('users')
        .select(`
          id,
          name,
          email,
          firstName,
          lastName,
          bio,
          created_at,
          updated_at
        `)
        .eq('role', 'coach')
        .eq('is_approved', true)
        .order('firstName', { ascending: true });

      // Apply filters
      if (filters.search) {
        query = query.or(`firstName.ilike.%${filters.search}%,lastName.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Coach[];
    },
  });
}

/**
 * Get coaches available for a specific user (based on role and permissions)
 */
export function useAvailableCoaches() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['available-coaches', user?.id],
    queryFn: async () => {
      const query = supabase
        .from('users')
        .select(`
          id,
          firstName,
          lastName,
          email,
          bio
        `)
        .eq('role', 'coach')
        .eq('is_approved', true)
        .eq('is_active', true)
        .order('firstName', { ascending: true });

      // If user is a client, get coaches they can book with
      if (user?.role === 'client') {
        // Add any client-specific filtering here
        // For now, all approved coaches are available to all clients
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Pick<Coach, 'id' | 'firstName' | 'lastName' | 'email' | 'bio'>[];
    },
    enabled: !!user,
  });
}

/**
 * Get a specific coach by ID
 */
export function useCoach(coachId: string) {
  return useQuery({
    queryKey: ['coach', coachId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          name,
          email,
          firstName,
          lastName,
          bio,
          created_at,
          updated_at
        `)
        .eq('id', coachId)
        .eq('role', 'coach')
        .single();
      
      if (error) throw error;
      return data as Coach;
    },
    enabled: !!coachId,
  });
}

/**
 * Get coach profile for the current user (if they are a coach)
 */
export function useMyCoachProfile() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['my-coach-profile', user?.id],
    queryFn: async () => {
      if (!user?.id || user.role !== 'coach') {
        throw new Error('User is not a coach');
      }

      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          name,
          email,
          firstName,
          lastName,
          bio,
          created_at,
          updated_at
        `)
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data as Coach;
    },
    enabled: !!user && user.role === 'coach',
  });
}

/**
 * Update coach profile
 */
export function useUpdateCoachProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updateData: Partial<Pick<Coach, 'bio' | 'firstName' | 'lastName'>>) => {
      if (!user?.id) throw new Error('No user ID');

      const { data, error } = await supabase
        .from('users')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .eq('role', 'coach')
        .select()
        .single();

      if (error) throw error;
      return data as Coach;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-coach-profile'] });
      queryClient.invalidateQueries({ queryKey: ['coach', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['coaches'] });
    },
  });
}

/**
 * Get coach statistics
 */
export function useCoachStats(coachId?: string) {
  const { user } = useAuth();
  const targetCoachId = coachId || user?.id;

  return useQuery({
    queryKey: ['coach-stats', targetCoachId],
    queryFn: async () => {
      if (!targetCoachId) throw new Error('No coach ID provided');

      // Get session statistics
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, status, date')
        .eq('coach_id', targetCoachId);

      if (sessionsError) throw sessionsError;

      // Get client count
      const { data: clients, error: clientsError } = await supabase
        .from('sessions')
        .select('client_id')
        .eq('coach_id', targetCoachId);

      if (clientsError) throw clientsError;

      const totalSessions = sessions?.length || 0;
      const completedSessions = sessions?.filter(s => s.status === 'Completed').length || 0;
      const upcomingSessions = sessions?.filter(s => s.status === 'Upcoming').length || 0;
      const uniqueClients = new Set(clients?.map(c => c.client_id)).size;

      return {
        totalSessions,
        completedSessions,
        upcomingSessions,
        totalClients: uniqueClients,
        completionRate: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
      };
    },
    enabled: !!targetCoachId,
  });
} 