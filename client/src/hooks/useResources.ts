import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

// Resource types
export interface Resource {
  id: string;
  title: string;
  description: string;
  content?: string;
  type: 'article' | 'video' | 'document' | 'link' | 'other';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  coach_id: string;
  client_id?: string; // If assigned to specific client
  tags?: string[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
  coach?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  client?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface CreateResourceData {
  title: string;
  description: string;
  content?: string;
  type: 'article' | 'video' | 'document' | 'link' | 'other';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  client_id?: string;
  tags?: string[];
  is_public?: boolean;
}

export interface UpdateResourceData {
  title?: string;
  description?: string;
  content?: string;
  type?: 'article' | 'video' | 'document' | 'link' | 'other';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  client_id?: string;
  tags?: string[];
  is_public?: boolean;
}

export interface ResourceFilters {
  type?: string;
  client_id?: string;
  is_public?: boolean;
  tags?: string[];
  search?: string;
}

// Query keys
const QUERY_KEYS = {
  resources: ['resources'] as const,
  resource: (id: string) => ['resources', id] as const,
  resourcesByClient: (clientId: string) => ['resources', 'client', clientId] as const,
  resourcesByType: (type: string) => ['resources', 'type', type] as const,
  publicResources: ['resources', 'public'] as const,
};

export const useResources = (filters?: ResourceFilters) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch resources with filters
  const {
    data: resources,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: [...QUERY_KEYS.resources, filters],
    queryFn: async () => {
      if (!profile) throw new Error('Not authenticated');

      let query = supabase
        .from('resources')
        .select(`
          *,
          coach:profiles!resources_coach_id_fkey(id, first_name, last_name),
          client:profiles!resources_client_id_fkey(id, first_name, last_name)
        `);

      // Apply filters based on user role
      if (profile.role === 'client') {
        // Clients can only see public resources or resources assigned to them
        query = query.or(`is_public.eq.true,client_id.eq.${profile.id}`);
      } else if (profile.role === 'coach') {
        // Coaches can see their own resources and public resources
        query = query.or(`coach_id.eq.${profile.id},is_public.eq.true`);
      } else if (profile.role === 'admin') {
        // Admins can see all resources (no additional filter)
      }

      // Apply additional filters
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      if (filters?.client_id) {
        query = query.eq('client_id', filters.client_id);
      }

      if (filters?.is_public !== undefined) {
        query = query.eq('is_public', filters.is_public);
      }

      if (filters?.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags);
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
      }

      // Order by creation date (newest first)
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching resources:', error);
        throw error;
      }

      return data as Resource[];
    },
    enabled: !!profile,
  });

  // Create resource mutation
  const createResourceMutation = useMutation({
    mutationFn: async (resourceData: CreateResourceData) => {
      if (!profile) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('resources')
        .insert({
          ...resourceData,
          coach_id: profile.id,
          is_public: resourceData.is_public ?? false,
        })
        .select(`
          *,
          coach:profiles!resources_coach_id_fkey(id, first_name, last_name),
          client:profiles!resources_client_id_fkey(id, first_name, last_name)
        `)
        .single();

      if (error) {
        console.error('Error creating resource:', error);
        throw error;
      }

      return data as Resource;
    },
    onSuccess: (newResource) => {
      // Invalidate and refetch resources
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.resources });
      
      // Add to cache optimistically
      queryClient.setQueryData<Resource[]>(
        [...QUERY_KEYS.resources, filters],
        (old) => old ? [newResource, ...old] : [newResource]
      );

      toast.success('Resource created successfully');
    },
    onError: (error: any) => {
      console.error('Failed to create resource:', error);
      toast.error(error.message || 'Failed to create resource');
    },
  });

  // Update resource mutation
  const updateResourceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateResourceData }) => {
      if (!profile) throw new Error('Not authenticated');

      const { data: updatedResource, error } = await supabase
        .from('resources')
        .update(data)
        .eq('id', id)
        .select(`
          *,
          coach:profiles!resources_coach_id_fkey(id, first_name, last_name),
          client:profiles!resources_client_id_fkey(id, first_name, last_name)
        `)
        .single();

      if (error) {
        console.error('Error updating resource:', error);
        throw error;
      }

      return updatedResource as Resource;
    },
    onSuccess: (updatedResource) => {
      // Invalidate and refetch resources
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.resources });
      
      // Update specific resource in cache
      queryClient.setQueryData(QUERY_KEYS.resource(updatedResource.id), updatedResource);

      toast.success('Resource updated successfully');
    },
    onError: (error: any) => {
      console.error('Failed to update resource:', error);
      toast.error(error.message || 'Failed to update resource');
    },
  });

  // Delete resource mutation
  const deleteResourceMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!profile) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting resource:', error);
        throw error;
      }

      return id;
    },
    onSuccess: (deletedId) => {
      // Invalidate and refetch resources
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.resources });
      
      // Remove from cache
      queryClient.setQueryData<Resource[]>(
        [...QUERY_KEYS.resources, filters],
        (old) => old ? old.filter(resource => resource.id !== deletedId) : []
      );

      toast.success('Resource deleted successfully');
    },
    onError: (error: any) => {
      console.error('Failed to delete resource:', error);
      toast.error(error.message || 'Failed to delete resource');
    },
  });

  // Assign resource to client mutation
  const assignToClientMutation = useMutation({
    mutationFn: async ({ resourceId, clientId }: { resourceId: string; clientId: string | null }) => {
      if (!profile) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('resources')
        .update({ client_id: clientId })
        .eq('id', resourceId)
        .select(`
          *,
          coach:profiles!resources_coach_id_fkey(id, first_name, last_name),
          client:profiles!resources_client_id_fkey(id, first_name, last_name)
        `)
        .single();

      if (error) {
        console.error('Error assigning resource:', error);
        throw error;
      }

      return data as Resource;
    },
    onSuccess: (updatedResource) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.resources });
      queryClient.setQueryData(QUERY_KEYS.resource(updatedResource.id), updatedResource);

      const action = updatedResource.client_id ? 'assigned' : 'unassigned';
      toast.success(`Resource ${action} successfully`);
    },
    onError: (error: any) => {
      console.error('Failed to assign resource:', error);
      toast.error(error.message || 'Failed to assign resource');
    },
  });

  return {
    // Data
    resources: resources || [],
    isLoading,
    error,

    // Actions
    refetch,
    createResource: createResourceMutation.mutateAsync,
    updateResource: updateResourceMutation.mutateAsync,
    deleteResource: deleteResourceMutation.mutateAsync,
    assignToClient: assignToClientMutation.mutateAsync,

    // Loading states
    isCreating: createResourceMutation.isPending,
    isUpdating: updateResourceMutation.isPending,
    isDeleting: deleteResourceMutation.isPending,
    isAssigning: assignToClientMutation.isPending,

    // Error states
    createError: createResourceMutation.error,
    updateError: updateResourceMutation.error,
    deleteError: deleteResourceMutation.error,
    assignError: assignToClientMutation.error,
  };
};

// Hook for fetching a single resource
export const useResource = (id: string) => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.resource(id),
    queryFn: async () => {
      if (!profile) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('resources')
        .select(`
          *,
          coach:profiles!resources_coach_id_fkey(id, first_name, last_name),
          client:profiles!resources_client_id_fkey(id, first_name, last_name)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching resource:', error);
        throw error;
      }

      return data as Resource;
    },
    enabled: !!profile && !!id,
  });
};

// Hook for fetching public resources (for unauthenticated users)
export const usePublicResources = (filters?: Pick<ResourceFilters, 'type' | 'search' | 'tags'>) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.publicResources, filters],
    queryFn: async () => {
      let query = supabase
        .from('resources')
        .select(`
          *,
          coach:profiles!resources_coach_id_fkey(id, first_name, last_name)
        `)
        .eq('is_public', true);

      // Apply filters
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      if (filters?.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags);
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching public resources:', error);
        throw error;
      }

      return data as Resource[];
    },
  });
};

// Hook for resource statistics
export const useResourceStats = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['resource-stats'],
    queryFn: async () => {
      if (!profile) throw new Error('Not authenticated');

      let query = supabase.from('resources').select('*');

      // Apply role-based filtering
      if (profile.role === 'coach') {
        query = query.eq('coach_id', profile.id);
      } else if (profile.role === 'client') {
        query = query.or(`is_public.eq.true,client_id.eq.${profile.id}`);
      }

      const { data: resources, error } = await query;

      if (error) {
        console.error('Error fetching resource stats:', error);
        throw error;
      }

      // Calculate statistics
      const stats = {
        total: resources?.length || 0,
        byType: resources?.reduce((acc: Record<string, number>, resource) => {
          acc[resource.type] = (acc[resource.type] || 0) + 1;
          return acc;
        }, {}) || {},
        public: resources?.filter(r => r.is_public).length || 0,
        private: resources?.filter(r => !r.is_public).length || 0,
        assigned: resources?.filter(r => r.client_id).length || 0,
        unassigned: resources?.filter(r => !r.client_id).length || 0,
      };

      return stats;
    },
    enabled: !!profile,
  });
}; 