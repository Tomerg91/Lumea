import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './use-toast';
import { 
  Resource, 
  ResourceAssignment,
  CreateResourceData,
  UpdateResourceData,
  CreateResourceAssignmentData,
  UpdateResourceAssignmentData,
  ResourceSearchParamsNew,
  ResourceUploadOptions,
  ResourceLinkData,
  // Legacy types for backwards compatibility
  Resource as LegacyResource,
  ResourceCategory, 
  ResourceCollection,
  CreateResourceRequest, 
  UpdateResourceRequest,
  ResourceSearchParams,
  ResourceStats,
  DEFAULT_RESOURCE_CATEGORIES
} from '../types/resource';
import { useSupabaseStorage } from './useSupabaseStorage';

// Query keys
const QUERY_KEYS = {
  resources: ['resources'],
  resourceAssignments: ['resource-assignments'],
  resourceAssignment: (id: string) => ['resource-assignment', id],
} as const;

export const useResources = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { uploadFile, deleteFile } = useSupabaseStorage();

  // Get coach's resources
  const {
    data: resources = [],
    isLoading: resourcesLoading,
    error: resourcesError,
  } = useQuery({
    queryKey: QUERY_KEYS.resources,
    queryFn: async (): Promise<Resource[]> => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('coach_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Get resource assignments for coach
  const {
    data: assignments = [],
    isLoading: assignmentsLoading,
  } = useQuery({
    queryKey: QUERY_KEYS.resourceAssignments,
    queryFn: async (): Promise<ResourceAssignment[]> => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('resource_assignments')
        .select(`
          *,
          resource:resources(*),
          client:profiles!resource_assignments_client_id_fkey(id, full_name, email)
        `)
        .eq('coach_id', user.id)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Create resource mutation
  const createResourceMutation = useMutation({
    mutationFn: async (data: CreateResourceData): Promise<Resource> => {
      if (!user) throw new Error('User not authenticated');

      const resourceData = {
        ...data,
        coach_id: user.id,
        is_public: data.is_public ?? false,
        tags: data.tags ?? [],
      };

      const { data: newResource, error } = await supabase
        .from('resources')
        .insert([resourceData])
        .select()
        .single();

      if (error) throw error;
      return newResource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.resources });
      toast({
        title: 'Resource Created',
        description: 'Your resource has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Creating Resource',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Upload file and create resource
  const uploadResourceMutation = useMutation({
    mutationFn: async ({ file, options }: { file: File; options: ResourceUploadOptions }): Promise<Resource> => {
      if (!user) throw new Error('User not authenticated');

      // Upload file to Supabase Storage
      const uploadResult = await uploadFile({
        file,
        context: 'resource',
      });

      // Create resource record
      const resourceData: CreateResourceData = {
        title: options.title,
        description: options.description,
        type: options.type,
        file_url: uploadResult.publicUrl,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        is_public: options.is_public ?? false,
        tags: options.tags ?? [],
      };

      return createResourceMutation.mutateAsync(resourceData);
    },
  });

  // Create link resource
  const createLinkResourceMutation = useMutation({
    mutationFn: async (data: ResourceLinkData): Promise<Resource> => {
      const resourceData: CreateResourceData = {
        ...data,
        type: 'link',
      };
      return createResourceMutation.mutateAsync(resourceData);
    },
  });

  // Update resource mutation
  const updateResourceMutation = useMutation({
    mutationFn: async (data: UpdateResourceData): Promise<Resource> => {
      if (!user) throw new Error('User not authenticated');

      const { id, ...updateData } = data;
      const { data: updatedResource, error } = await supabase
        .from('resources')
        .update(updateData)
        .eq('id', id)
        .eq('coach_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return updatedResource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.resources });
      toast({
        title: 'Resource Updated',
        description: 'Your resource has been updated successfully.',
      });
    },
  });

  // Delete resource mutation
  const deleteResourceMutation = useMutation({
    mutationFn: async (resourceId: string): Promise<void> => {
      if (!user) throw new Error('User not authenticated');

      // Get resource to check if it has a file to delete
      const { data: resource } = await supabase
        .from('resources')
        .select('file_url')
        .eq('id', resourceId)
        .eq('coach_id', user.id)
        .single();

      // Delete from database first
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', resourceId)
        .eq('coach_id', user.id);

      if (error) throw error;

      // Delete file from storage if it exists
      if (resource?.file_url) {
        try {
          // Extract file path from URL for deletion
          const urlParts = resource.file_url.split('/');
          const fileName = urlParts[urlParts.length - 1];
          const filePath = `${user.id}/resource/${fileName}`;
          await deleteFile({ filePath, bucket: 'resources' });
        } catch (fileError) {
          console.warn('Failed to delete file from storage:', fileError);
          // Don't throw here as the database record is already deleted
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.resources });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.resourceAssignments });
      toast({
        title: 'Resource Deleted',
        description: 'Your resource has been deleted successfully.',
      });
    },
  });

  // Assign resource to client mutation
  const assignResourceMutation = useMutation({
    mutationFn: async (data: CreateResourceAssignmentData): Promise<ResourceAssignment> => {
      if (!user) throw new Error('User not authenticated');

      const assignmentData = {
        ...data,
        coach_id: user.id,
        is_required: data.is_required ?? false,
      };

      const { data: assignment, error } = await supabase
        .from('resource_assignments')
        .insert([assignmentData])
        .select(`
          *,
          resource:resources(*),
          client:profiles!resource_assignments_client_id_fkey(id, full_name, email)
        `)
        .single();

      if (error) throw error;
      return assignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.resourceAssignments });
      toast({
        title: 'Resource Assigned',
        description: 'Resource has been assigned to the client successfully.',
      });
    },
  });

  // Update resource assignment
  const updateAssignmentMutation = useMutation({
    mutationFn: async (data: UpdateResourceAssignmentData): Promise<ResourceAssignment> => {
      if (!user) throw new Error('User not authenticated');

      const { id, ...updateData } = data;
      const { data: assignment, error } = await supabase
        .from('resource_assignments')
        .update(updateData)
        .eq('id', id)
        .eq('coach_id', user.id)
        .select(`
          *,
          resource:resources(*),
          client:profiles!resource_assignments_client_id_fkey(id, full_name, email)
        `)
        .single();

      if (error) throw error;
      return assignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.resourceAssignments });
    },
  });

  // Remove resource assignment
  const removeAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string): Promise<void> => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('resource_assignments')
        .delete()
        .eq('id', assignmentId)
        .eq('coach_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.resourceAssignments });
      toast({
        title: 'Assignment Removed',
        description: 'Resource assignment has been removed successfully.',
      });
    },
  });

  // Search and filter resources
  const searchResources = useCallback((params: ResourceSearchParamsNew) => {
    let filtered = [...resources];

    // Text search
    if (params.query) {
      const query = params.query.toLowerCase();
      filtered = filtered.filter(resource =>
        resource.title.toLowerCase().includes(query) ||
        resource.description?.toLowerCase().includes(query) ||
        resource.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Type filter
    if (params.type && params.type !== 'all') {
      filtered = filtered.filter(resource => resource.type === params.type);
    }

    // Public filter
    if (params.is_public !== undefined) {
      filtered = filtered.filter(resource => resource.is_public === params.is_public);
    }

    // Tags filter
    if (params.tags && params.tags.length > 0) {
      filtered = filtered.filter(resource =>
        params.tags!.some(tag => resource.tags.includes(tag))
      );
    }

    // Sort
    const sortBy = params.sortBy || 'created_at';
    const sortOrder = params.sortOrder || 'desc';
    
    filtered.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [resources]);

  // Get client-specific assignments (for client view)
  const getClientAssignments = useCallback(async (clientId: string): Promise<ResourceAssignment[]> => {
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('resource_assignments')
      .select(`
        *,
        resource:resources(*)
      `)
      .eq('client_id', clientId)
      .eq('coach_id', user.id)
      .order('assigned_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }, [user]);

  return {
    // Data
    resources,
    assignments,
    
    // Loading states
    loading: resourcesLoading || assignmentsLoading,
    resourcesLoading,
    assignmentsLoading,
    
    // Error states
    error: resourcesError,
    
    // Mutations
    createResource: createResourceMutation.mutateAsync,
    uploadResource: uploadResourceMutation.mutateAsync,
    createLinkResource: createLinkResourceMutation.mutateAsync,
    updateResource: updateResourceMutation.mutateAsync,
    deleteResource: deleteResourceMutation.mutateAsync,
    assignResource: assignResourceMutation.mutateAsync,
    updateAssignment: updateAssignmentMutation.mutateAsync,
    removeAssignment: removeAssignmentMutation.mutateAsync,
    
    // Mutation states
    creating: createResourceMutation.isPending,
    uploading: uploadResourceMutation.isPending,
    updating: updateResourceMutation.isPending,
    deleting: deleteResourceMutation.isPending,
    assigning: assignResourceMutation.isPending,
    
    // Utility functions
    searchResources,
    getClientAssignments,
  };
};

// Hook for client-side resource access
export const useClientResources = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get assigned resources for the current client
  const {
    data: assignedResources = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['client-resources', user?.id],
    queryFn: async (): Promise<ResourceAssignment[]> => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('resource_assignments')
        .select(`
          *,
          resource:resources(*)
        `)
        .eq('client_id', user.id)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Mark resource as viewed
  const markAsViewedMutation = useMutation({
    mutationFn: async (assignmentId: string): Promise<void> => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('resource_assignments')
        .update({
          viewed_at: new Date().toISOString(),
          view_count: supabase.from('resource_assignments').select('view_count').eq('id', assignmentId).single().then(res => (res.data?.view_count || 0) + 1)
        })
        .eq('id', assignmentId)
        .eq('client_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-resources', user?.id] });
    },
  });

  // Mark resource as completed
  const markAsCompletedMutation = useMutation({
    mutationFn: async (assignmentId: string): Promise<void> => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('resource_assignments')
        .update({
          completed_at: new Date().toISOString(),
        })
        .eq('id', assignmentId)
        .eq('client_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-resources', user?.id] });
      toast({
        title: 'Resource Completed',
        description: 'You have marked this resource as completed.',
      });
    },
  });

  return {
    assignedResources,
    loading: isLoading,
    error,
    markAsViewed: markAsViewedMutation.mutateAsync,
    markAsCompleted: markAsCompletedMutation.mutateAsync,
    markingAsViewed: markAsViewedMutation.isPending,
    markingAsCompleted: markAsCompletedMutation.isPending,
  };
};

// Legacy hook for backwards compatibility (uses mock data)
export const useLegacyResources = () => {
  const MOCK_CATEGORIES: ResourceCategory[] = DEFAULT_RESOURCE_CATEGORIES.map((cat, index) => ({
    ...cat,
    id: `cat-${index + 1}`,
    resourceCount: Math.floor(Math.random() * 15) + 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }));

  // Return mock implementations for backwards compatibility
  return {
    resources: [],
    categories: MOCK_CATEGORIES,
    collections: [],
    loading: false,
    creating: false,
    updating: false,
    deleting: false,
    searchResources: () => [],
    createResource: async () => null,
    updateResource: async () => null,
    deleteResource: async () => {},
    getResourceStats: () => null,
  };
}; 