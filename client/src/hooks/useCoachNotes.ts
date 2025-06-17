import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRealtimeTable } from './useRealtime';

// ====================== TYPES ======================

export interface CoachNote {
  id: string;
  title: string;
  content: string;
  session_id: string;
  coach_id: string;
  client_id: string;
  tags: string[];
  is_private: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  session?: {
    id: string;
    date: string;
    status: string;
  };
  client?: {
    id: string;
    name: string;
    email: string;
  };
  coach?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateCoachNoteData {
  title: string;
  content: string;
  session_id: string;
  client_id: string;
  tags?: string[];
  is_private?: boolean;
}

export interface UpdateCoachNoteData {
  title?: string;
  content?: string;
  tags?: string[];
  is_private?: boolean;
}

export interface CoachNoteFilters {
  coach_id?: string;
  client_id?: string;
  session_id?: string;
  is_private?: boolean;
  search?: string;
  tags?: string[];
  date_from?: string;
  date_to?: string;
}

export interface SearchOptions extends CoachNoteFilters {
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'updated_at' | 'title';
  sort_order?: 'asc' | 'desc';
}

// ====================== HOOKS ======================

/**
 * Get coach notes with optional filtering
 */
export function useCoachNotes(filters: CoachNoteFilters = {}) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['coach-notes', filters, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('coach_notes')
        .select(`
          *,
          session:session_id (
            id,
            date,
            status
          ),
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
        .order('created_at', { ascending: false });

      // Apply user-based filtering
      if (user?.role === 'coach') {
        query = query.eq('coach_id', user.id);
      } else if (user?.role === 'client') {
        // Clients can only see notes marked as not private for their sessions
        query = query
          .eq('client_id', user.id)
          .eq('is_private', false);
      }

      // Apply additional filters
      if (filters.coach_id) query = query.eq('coach_id', filters.coach_id);
      if (filters.client_id) query = query.eq('client_id', filters.client_id);
      if (filters.session_id) query = query.eq('session_id', filters.session_id);
      if (filters.is_private !== undefined) query = query.eq('is_private', filters.is_private);
      if (filters.date_from) query = query.gte('created_at', filters.date_from);
      if (filters.date_to) query = query.lte('created_at', filters.date_to);

      // Search in title and content
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
      }

      // Filter by tags (if any of the specified tags are present)
      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as CoachNote[];
    },
    enabled: !!user,
  });
}

/**
 * Get notes for a specific session
 */
export function useSessionNotes(sessionId: string) {
  return useCoachNotes({ session_id: sessionId });
}

/**
 * Get notes for a specific client
 */
export function useClientNotes(clientId: string, includePrivate = false) {
  const { user } = useAuth();
  const filters: CoachNoteFilters = { client_id: clientId };
  
  // Only coaches can see private notes
  if (!includePrivate || user?.role !== 'coach') {
    filters.is_private = false;
  }
  
  return useCoachNotes(filters);
}

/**
 * Get a specific coach note by ID
 */
export function useCoachNote(noteId: string) {
  return useQuery({
    queryKey: ['coach-note', noteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coach_notes')
        .select(`
          *,
          session:session_id (
            id,
            date,
            status
          ),
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
        .eq('id', noteId)
        .single();

      if (error) throw error;
      return data as CoachNote;
    },
    enabled: !!noteId,
  });
}

/**
 * Create a new coach note
 */
export function useCreateCoachNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateCoachNoteData) => {
      const noteData = {
        ...data,
        coach_id: user?.id,
        is_private: data.is_private ?? true,
        tags: data.tags || [],
      };

      const { data: result, error } = await supabase
        .from('coach_notes')
        .insert(noteData)
        .select(`
          *,
          session:session_id (
            id,
            date,
            status
          ),
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

      if (error) throw error;
      return result as CoachNote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-notes'] });
    },
  });
}

/**
 * Update an existing coach note
 */
export function useUpdateCoachNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateCoachNoteData & { id: string }) => {
      const { data: result, error } = await supabase
        .from('coach_notes')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          session:session_id (
            id,
            date,
            status
          ),
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

      if (error) throw error;
      return result as CoachNote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-notes'] });
      queryClient.invalidateQueries({ queryKey: ['coach-note'] });
    },
  });
}

/**
 * Delete a coach note
 */
export function useDeleteCoachNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('coach_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
      return noteId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-notes'] });
      queryClient.invalidateQueries({ queryKey: ['coach-note'] });
    },
  });
}

/**
 * Search coach notes with advanced options
 */
export function useSearchCoachNotes(options: SearchOptions) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['search-coach-notes', options, user?.id],
    queryFn: async () => {
      const {
        page = 1,
        limit = 20,
        sort_by = 'created_at',
        sort_order = 'desc',
        ...filters
      } = options;

      let query = supabase
        .from('coach_notes')
        .select(`
          *,
          session:session_id (
            id,
            date,
            status
          ),
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
        `, { count: 'exact' });

      // Apply user-based filtering
      if (user?.role === 'coach') {
        query = query.eq('coach_id', user.id);
      } else if (user?.role === 'client') {
        query = query
          .eq('client_id', user.id)
          .eq('is_private', false);
      }

      // Apply filters
      if (filters.coach_id) query = query.eq('coach_id', filters.coach_id);
      if (filters.client_id) query = query.eq('client_id', filters.client_id);
      if (filters.session_id) query = query.eq('session_id', filters.session_id);
      if (filters.is_private !== undefined) query = query.eq('is_private', filters.is_private);
      if (filters.date_from) query = query.gte('created_at', filters.date_from);
      if (filters.date_to) query = query.lte('created_at', filters.date_to);

      // Search in title and content
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
      }

      // Filter by tags
      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      // Apply sorting and pagination
      query = query
        .order(sort_by, { ascending: sort_order === 'asc' })
        .range((page - 1) * limit, page * limit - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        notes: data as CoachNote[],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      };
    },
    enabled: !!user,
  });
}

/**
 * Real-time subscription for coach notes
 */
export function useRealtimeCoachNotes(filters: CoachNoteFilters = {}) {
  const notes = useCoachNotes(filters);
  
  useRealtimeTable(
    'coach_notes',
    null,
    () => {
      notes.refetch();
    }
  );

  return notes;
}

/**
 * Get popular tags for coach notes
 */
export function usePopularTags(limit = 20) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['popular-tags', user?.id, limit],
    queryFn: async () => {
      let query = supabase
        .from('coach_notes')
        .select('tags');

      // Filter by user role
      if (user?.role === 'coach') {
        query = query.eq('coach_id', user.id);
      } else if (user?.role === 'client') {
        query = query
          .eq('client_id', user.id)
          .eq('is_private', false);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Count tag frequency
      const tagCounts: Record<string, number> = {};
      data?.forEach(note => {
        note.tags?.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });

      // Sort by frequency and return top tags
      return Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([tag, count]) => ({ tag, count }));
    },
    enabled: !!user,
  });
}

/**
 * Get note statistics
 */
export function useNoteStats() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['note-stats', user?.id],
    queryFn: async () => {
      let query = supabase
        .from('coach_notes')
        .select('*', { count: 'exact' });

      if (user?.role === 'coach') {
        query = query.eq('coach_id', user.id);
      } else if (user?.role === 'client') {
        query = query
          .eq('client_id', user.id)
          .eq('is_private', false);
      }

      const { count, error } = await query;
      if (error) throw error;

      return {
        totalNotes: count || 0,
      };
    },
    enabled: !!user,
  });
}

/**
 * Check if user can create notes
 */
export function useCanCreateNotes() {
  const { user } = useAuth();
  return user?.role === 'coach';
}

/**
 * Check if user can modify a specific note
 */
export function useCanModifyNote(note: CoachNote | undefined) {
  const { user } = useAuth();
  return user?.role === 'coach' && note?.coach_id === user.id;
} 