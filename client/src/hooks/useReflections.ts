import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRealtimeTable } from './useRealtime';

// ====================== TYPES ======================

export interface Reflection {
  id: string;
  session_id: string;
  client_id: string;
  coach_id: string;
  template_id?: string;
  answers: ReflectionAnswer[];
  status: 'draft' | 'submitted' | 'reviewed';
  sentiment?: 'positive' | 'neutral' | 'negative';
  categories?: string[];
  completion_time_minutes?: number;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  reviewed_at?: string;
  // Joined data
  session?: {
    id: string;
    date: string;
    status: string;
  };
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
  template?: {
    id: string;
    title: string;
    sections: any[];
  };
}

export interface ReflectionAnswer {
  questionId: string;
  value: any;
  audioData?: {
    url: string;
    duration: number;
    transcript?: string;
  };
  metadata?: Record<string, any>;
}

export interface CreateReflectionData {
  session_id: string;
  template_id?: string;
  answers: ReflectionAnswer[];
  status?: 'draft' | 'submitted';
  completion_time_minutes?: number;
}

export interface UpdateReflectionData {
  answers?: ReflectionAnswer[];
  status?: 'draft' | 'submitted' | 'reviewed';
  sentiment?: 'positive' | 'neutral' | 'negative';
  categories?: string[];
  completion_time_minutes?: number;
}

export interface ReflectionFilters {
  client_id?: string;
  coach_id?: string;
  session_id?: string;
  template_id?: string;
  status?: string;
  sentiment?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  categories?: string[];
}

export interface ReflectionSearchOptions extends ReflectionFilters {
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'updated_at' | 'submitted_at';
  sort_order?: 'asc' | 'desc';
}

// ====================== HOOKS ======================

/**
 * Get reflections with optional filtering
 */
export function useReflections(filters: ReflectionFilters = {}) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['reflections', filters, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('reflections')
        .select(`
          *,
          session:session_id (
            id,
            date,
            status
          ),
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
          ),
          template:template_id (
            id,
            title,
            sections
          )
        `)
        .order('created_at', { ascending: false });

      // Apply user-based filtering
      if (user?.role === 'client') {
        query = query.eq('client_id', user.id);
      } else if (user?.role === 'coach') {
        query = query.eq('coach_id', user.id);
      }

      // Apply additional filters
      if (filters.client_id) query = query.eq('client_id', filters.client_id);
      if (filters.coach_id) query = query.eq('coach_id', filters.coach_id);
      if (filters.session_id) query = query.eq('session_id', filters.session_id);
      if (filters.template_id) query = query.eq('template_id', filters.template_id);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.sentiment) query = query.eq('sentiment', filters.sentiment);
      if (filters.date_from) query = query.gte('created_at', filters.date_from);
      if (filters.date_to) query = query.lte('created_at', filters.date_to);

      // Filter by categories (if any of the specified categories are present)
      if (filters.categories && filters.categories.length > 0) {
        query = query.overlaps('categories', filters.categories);
      }

      // Search in answers content (simplified search in JSON)
      if (filters.search) {
        query = query.ilike('answers', `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as Reflection[];
    },
    enabled: !!user,
  });
}

/**
 * Get reflections for a specific session
 */
export function useSessionReflections(sessionId: string) {
  return useReflections({ session_id: sessionId });
}

/**
 * Get reflections for a specific client
 */
export function useClientReflections(clientId: string) {
  return useReflections({ client_id: clientId });
}

/**
 * Get reflections by status
 */
export function useReflectionsByStatus(status: 'draft' | 'submitted' | 'reviewed') {
  return useReflections({ status });
}

/**
 * Get a specific reflection by ID
 */
export function useReflection(reflectionId: string) {
  return useQuery({
    queryKey: ['reflection', reflectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reflections')
        .select(`
          *,
          session:session_id (
            id,
            date,
            status
          ),
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
          ),
          template:template_id (
            id,
            title,
            sections
          )
        `)
        .eq('id', reflectionId)
        .single();
      
      if (error) throw error;
      return data as Reflection;
    },
    enabled: !!reflectionId,
  });
}

/**
 * Create a new reflection
 */
export function useCreateReflection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateReflectionData) => {
      // Get session details to find coach_id and client_id
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('client_id, coach_id')
        .eq('id', data.session_id)
        .single();

      if (sessionError) throw sessionError;

      const reflectionData = {
        ...data,
        client_id: session.client_id,
        coach_id: session.coach_id,
        status: data.status || 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        submitted_at: data.status === 'submitted' ? new Date().toISOString() : null,
      };

      const { data: newReflection, error } = await supabase
        .from('reflections')
        .insert(reflectionData)
        .select(`
          *,
          session:session_id (
            id,
            date,
            status
          ),
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
          ),
          template:template_id (
            id,
            title,
            sections
          )
        `)
        .single();

      if (error) throw error;
      return newReflection as Reflection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reflections'] });
      queryClient.invalidateQueries({ queryKey: ['reflection-stats'] });
    },
  });
}

/**
 * Update reflection
 */
export function useUpdateReflection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ reflectionId, data }: { reflectionId: string; data: UpdateReflectionData }) => {
      const updateData = {
        ...data,
        updated_at: new Date().toISOString(),
        submitted_at: data.status === 'submitted' ? new Date().toISOString() : undefined,
        reviewed_at: data.status === 'reviewed' ? new Date().toISOString() : undefined,
      };

      const { data: updatedReflection, error } = await supabase
        .from('reflections')
        .update(updateData)
        .eq('id', reflectionId)
        .select(`
          *,
          session:session_id (
            id,
            date,
            status
          ),
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
          ),
          template:template_id (
            id,
            title,
            sections
          )
        `)
        .single();

      if (error) throw error;
      return updatedReflection as Reflection;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reflections'] });
      queryClient.invalidateQueries({ queryKey: ['reflection', variables.reflectionId] });
    },
  });
}

/**
 * Submit reflection (change status to submitted)
 */
export function useSubmitReflection() {
  const updateReflection = useUpdateReflection();
  
  return useMutation({
    mutationFn: async (reflectionId: string) => {
      return updateReflection.mutateAsync({
        reflectionId,
        data: { status: 'submitted' }
      });
    },
  });
}

/**
 * Mark reflection as reviewed (coaches only)
 */
export function useReviewReflection() {
  const updateReflection = useUpdateReflection();
  
  return useMutation({
    mutationFn: async ({ reflectionId, sentiment, categories }: { 
      reflectionId: string; 
      sentiment?: 'positive' | 'neutral' | 'negative';
      categories?: string[];
    }) => {
      return updateReflection.mutateAsync({
        reflectionId,
        data: { 
          status: 'reviewed',
          sentiment,
          categories 
        }
      });
    },
  });
}

/**
 * Delete reflection
 */
export function useDeleteReflection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (reflectionId: string) => {
      const { error } = await supabase
        .from('reflections')
        .delete()
        .eq('id', reflectionId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: (_, reflectionId) => {
      queryClient.invalidateQueries({ queryKey: ['reflections'] });
      queryClient.invalidateQueries({ queryKey: ['reflection', reflectionId] });
      queryClient.invalidateQueries({ queryKey: ['reflection-stats'] });
    },
  });
}

/**
 * Advanced search with pagination
 */
export function useSearchReflections(options: ReflectionSearchOptions) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['reflections-search', options, user?.id],
    queryFn: async () => {
      const {
        page = 1,
        limit = 20,
        sort_by = 'created_at',
        sort_order = 'desc',
        ...filters
      } = options;

      let query = supabase
        .from('reflections')
        .select(`
          *,
          session:session_id (
            id,
            date,
            status
          ),
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
          ),
          template:template_id (
            id,
            title,
            sections
          )
        `, { count: 'exact' })
        .order(sort_by, { ascending: sort_order === 'asc' })
        .range((page - 1) * limit, page * limit - 1);

      // Apply user-based filtering
      if (user?.role === 'client') {
        query = query.eq('client_id', user.id);
      } else if (user?.role === 'coach') {
        query = query.eq('coach_id', user.id);
      }

      // Apply filters (same as useReflections)
      if (filters.client_id) query = query.eq('client_id', filters.client_id);
      if (filters.coach_id) query = query.eq('coach_id', filters.coach_id);
      if (filters.session_id) query = query.eq('session_id', filters.session_id);
      if (filters.template_id) query = query.eq('template_id', filters.template_id);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.sentiment) query = query.eq('sentiment', filters.sentiment);
      if (filters.date_from) query = query.gte('created_at', filters.date_from);
      if (filters.date_to) query = query.lte('created_at', filters.date_to);
      if (filters.categories && filters.categories.length > 0) {
        query = query.overlaps('categories', filters.categories);
      }
      if (filters.search) {
        query = query.ilike('answers', `%${filters.search}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        reflections: data as Reflection[],
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit),
        },
      };
    },
    enabled: !!user,
  });
}

/**
 * Hook to get real-time reflection updates
 */
export function useRealtimeReflections(filters: ReflectionFilters = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Set up real-time subscription for reflections table
  useRealtimeTable(
    'reflections',
    user?.role === 'client' ? `client_id=eq.${user.id}` : 
    user?.role === 'coach' ? `coach_id=eq.${user.id}` : null,
    () => {
      // Invalidate reflection queries on real-time updates
      queryClient.invalidateQueries({ queryKey: ['reflections'] });
      queryClient.invalidateQueries({ queryKey: ['reflection-stats'] });
    }
  );

  // Return the regular reflections query which will be updated by real-time events
  return useReflections(filters);
}

// ====================== UTILITY HOOKS ======================

/**
 * Get reflection statistics
 */
export function useReflectionStats() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['reflection-stats', user?.id],
    queryFn: async () => {
      let query = supabase.from('reflections').select('*');
      
      if (user?.role === 'client') {
        query = query.eq('client_id', user.id);
      } else if (user?.role === 'coach') {
        query = query.eq('coach_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const now = new Date();
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const stats = {
        total: data.length,
        submitted: data.filter(r => r.status === 'submitted').length,
        reviewed: data.filter(r => r.status === 'reviewed').length,
        drafts: data.filter(r => r.status === 'draft').length,
        positive: data.filter(r => r.sentiment === 'positive').length,
        neutral: data.filter(r => r.sentiment === 'neutral').length,
        negative: data.filter(r => r.sentiment === 'negative').length,
        thisWeek: data.filter(r => 
          new Date(r.created_at) >= thisWeek
        ).length,
        thisMonth: data.filter(r => 
          new Date(r.created_at) >= thisMonth
        ).length,
        averageCompletionTime: data
          .filter(r => r.completion_time_minutes)
          .reduce((sum, r) => sum + (r.completion_time_minutes || 0), 0) / 
          data.filter(r => r.completion_time_minutes).length || 0,
      };

      return stats;
    },
    enabled: !!user,
  });
}

/**
 * Get reflection categories frequency
 */
export function useReflectionCategories() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['reflection-categories', user?.id],
    queryFn: async () => {
      let query = supabase.from('reflections').select('categories');
      
      if (user?.role === 'client') {
        query = query.eq('client_id', user.id);
      } else if (user?.role === 'coach') {
        query = query.eq('coach_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Count category frequencies
      const categoryCounts: Record<string, number> = {};
      data.forEach(reflection => {
        reflection.categories?.forEach((category: string) => {
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        });
      });

      // Sort and return
      const sortedCategories = Object.entries(categoryCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([category, count]) => ({ category, count }));

      return sortedCategories;
    },
    enabled: !!user,
  });
}

/**
 * Check if user can create reflections (clients only)
 */
export function useCanCreateReflections() {
  const { user } = useAuth();
  return user?.role === 'client';
}

/**
 * Check if user can review reflections (coaches only)
 */
export function useCanReviewReflections() {
  const { user } = useAuth();
  return user?.role === 'coach';
}

/**
 * Check if user can modify a specific reflection
 */
export function useCanModifyReflection(reflection: Reflection | undefined) {
  const { user } = useAuth();
  if (!reflection || !user) return false;
  
  // Clients can modify their own reflections (only if not submitted)
  if (user.role === 'client' && reflection.client_id === user.id) {
    return reflection.status === 'draft';
  }
  
  // Coaches can review reflections from their clients
  if (user.role === 'coach' && reflection.coach_id === user.id) {
    return true;
  }
  
  return false;
} 