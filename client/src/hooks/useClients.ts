import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRealtimeTable } from './useRealtime';

// ====================== TYPES ======================

export interface Client {
  id: string;
  name: string;
  email: string;
  bio?: string;
  phone?: string;
  timezone?: string;
  coach_id?: string;
  created_at: string;
  updated_at?: string;
  lastSessionDate?: string;
  totalSessions?: number;
  upcomingSessions?: number;
  firstName?: string;
  lastName?: string;
}

export interface CreateClientData {
  name: string;
  email: string;
  bio?: string;
  phone?: string;
  timezone?: string;
  coach_id?: string;
  firstName?: string;
  lastName?: string;
}

export interface UpdateClientData {
  name?: string;
  email?: string;
  bio?: string;
  phone?: string;
  timezone?: string;
  firstName?: string;
  lastName?: string;
}

export interface ClientFilters {
  coach_id?: string;
  search?: string;
  has_upcoming_sessions?: boolean;
  last_session_after?: string;
  last_session_before?: string;
}

// Helper function to split name for backwards compatibility
function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(' ');
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || ''
  };
}

// Helper function to combine names
function combineName(firstName?: string, lastName?: string, fullName?: string): string {
  if (fullName) return fullName;
  return [firstName, lastName].filter(Boolean).join(' ').trim();
}

// ====================== HOOKS ======================

/**
 * Get all clients with optional filtering
 */
export function useClients(filters: ClientFilters = {}) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['clients', filters, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('users')
        .select(`
          id,
          name,
          email,
          bio,
          created_at,
          updated_at,
          sessions!client_id (
            id,
            date,
            status
          )
        `)
        .eq('role', 'client')
        .order('created_at', { ascending: false });

      // Apply user-based filtering - coaches see only their clients
      if (user?.role === 'coach') {
        console.warn('Coach filtering not yet implemented - needs coach_id column in users table');
      } else if (user?.role === 'client') {
        query = query.eq('id', user.id);
      }

      // Apply additional filters
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Compute additional fields from sessions
      const clients: Client[] = (data || []).map(user => {
        const sessions = user.sessions || [];
        const completedSessions = sessions.filter(s => s.status === 'Completed');
        const upcomingSessions = sessions.filter(s => s.status === 'Upcoming');
        
        // Find most recent session date
        const sortedSessions = sessions
          .filter(s => s.status === 'Completed')
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        const { firstName, lastName } = splitName(user.name || '');
        
        return {
          id: user.id,
          name: user.name,
          firstName,
          lastName,
          email: user.email,
          bio: user.bio,
          created_at: user.created_at,
          updated_at: user.updated_at,
          lastSessionDate: sortedSessions[0]?.date || null,
          totalSessions: completedSessions.length,
          upcomingSessions: upcomingSessions.length,
        };
      });

      // Apply computed field filters
      let filteredClients = clients;
      
      if (filters.has_upcoming_sessions !== undefined) {
        filteredClients = filteredClients.filter(client => 
          filters.has_upcoming_sessions ? 
          (client.upcomingSessions || 0) > 0 : 
          (client.upcomingSessions || 0) === 0
        );
      }

      if (filters.last_session_after) {
        filteredClients = filteredClients.filter(client => 
          client.lastSessionDate && 
          new Date(client.lastSessionDate) >= new Date(filters.last_session_after!)
        );
      }

      if (filters.last_session_before) {
        filteredClients = filteredClients.filter(client => 
          client.lastSessionDate && 
          new Date(client.lastSessionDate) <= new Date(filters.last_session_before!)
        );
      }

      return filteredClients;
    },
    enabled: !!user,
  });
}

/**
 * Get clients for the current coach
 */
export function useMyClients() {
  const { user } = useAuth();
  return useClients({ coach_id: user?.id });
}

/**
 * Get a specific client by ID
 */
export function useClient(clientId: string) {
  return useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          name,
          email,
          bio,
          created_at,
          updated_at,
          sessions!client_id (
            id,
            date,
            status,
            notes
          ),
          reflections!user_id (
            id,
            created_at
          )
        `)
        .eq('id', clientId)
        .eq('role', 'client')
        .single();
      
      if (error) throw error;

      const sessions = data.sessions || [];
      const reflections = data.reflections || [];
      const completedSessions = sessions.filter(s => s.status === 'Completed');
      const upcomingSessions = sessions.filter(s => s.status === 'Upcoming');
      
      const sortedSessions = sessions
        .filter(s => s.status === 'Completed')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const { firstName, lastName } = splitName(data.name || '');

      return {
        id: data.id,
        name: data.name,
        firstName,
        lastName,
        email: data.email,
        bio: data.bio,
        created_at: data.created_at,
        updated_at: data.updated_at,
        lastSessionDate: sortedSessions[0]?.date || null,
        totalSessions: completedSessions.length,
        upcomingSessions: upcomingSessions.length,
        sessions,
        reflections,
      } as Client & { sessions: any[]; reflections: any[] };
    },
    enabled: !!clientId,
  });
}

/**
 * Create a new client
 */
export function useCreateClient() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateClientData) => {
      const clientData = {
        name: combineName(data.firstName, data.lastName, data.name),
        email: data.email,
        bio: data.bio,
        role: 'client' as const,
      };

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: 'temp-password-' + Math.random().toString(36),
      });

      if (authError) throw authError;

      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert({ ...clientData, id: authData.user?.id })
        .select()
        .single();

      if (profileError) throw profileError;
      return profileData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

/**
 * Update a client
 */
export function useUpdateClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateClientData }) => {
      const updateData = {
        ...data,
        name: combineName(data.firstName, data.lastName, data.name),
        updated_at: new Date().toISOString(),
      };

      delete updateData.firstName;
      delete updateData.lastName;

      const { data: updatedData, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', data.id] });
    },
  });
}

/**
 * Delete a client
 */
export function useDeleteClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', clientId);

      if (error) throw error;
      return clientId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

/**
 * Real-time clients subscription
 */
export function useRealtimeClients(filters: ClientFilters = {}) {
  const clients = useClients(filters);
  
  useRealtimeTable(
    'users',
    'role=eq.client',
    () => {
      clients.refetch();
    }
  );

  return clients;
}

/**
 * Get client statistics
 */
export function useClientStats() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['client-stats', user?.id],
    queryFn: async () => {
      const query = supabase
        .from('users')
        .select('id, created_at')
        .eq('role', 'client');

      if (user?.role === 'coach') {
        console.warn('Coach filtering not implemented for stats');
      }

      const { data, error } = await query;
      if (error) throw error;

      const total = data?.length || 0;
      const thisMonth = data?.filter(client => {
        const createdAt = new Date(client.created_at);
        const now = new Date();
        return createdAt.getMonth() === now.getMonth() && 
               createdAt.getFullYear() === now.getFullYear();
      }).length || 0;

      return {
        total,
        thisMonth,
        growth: total > 0 ? ((thisMonth / total) * 100) : 0,
      };
    },
    enabled: !!user,
  });
}

/**
 * Check if current user can create clients
 */
export function useCanCreateClients() {
  const { user } = useAuth();
  return user?.role === 'coach' || user?.role === 'admin';
}

/**
 * Check if current user can modify a specific client
 */
export function useCanModifyClient(client: Client | undefined) {
  const { user } = useAuth();
  
  if (!user || !client) return false;
  
  if (user.role === 'admin') return true;
  
  if (user.role === 'coach') {
    return true;
  }
  
  if (user.role === 'client') {
    return client.id === user.id;
  }
  
  return false;
} 