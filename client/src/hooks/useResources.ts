import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './use-toast';
import { 
  Resource, 
  ResourceCategory, 
  ResourceCollection,
  CreateResourceRequest, 
  UpdateResourceRequest,
  ResourceSearchParams,
  ResourceStats,
  DEFAULT_RESOURCE_CATEGORIES
} from '../types/resource';

// Mock data for development
const MOCK_RESOURCES: Resource[] = [
  {
    id: '1',
    title: 'Goal Setting Fundamentals',
    type: 'article',
    description: 'Learn the basics of setting and achieving meaningful goals in your personal and professional life.',
    content: 'A comprehensive guide to SMART goals and implementation strategies...',
    duration: '5 min read',
    difficulty: 'beginner',
    tags: ['goals', 'productivity', 'planning'],
    categories: ['Goal Setting'],
    rating: 4.8,
    downloadCount: 156,
    viewCount: 423,
    isPublic: true,
    isPremium: false,
    authorId: 'coach1',
    authorName: 'Dr. Sarah Johnson',
    authorRole: 'coach',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    title: 'Mindfulness Meditation for Beginners',
    type: 'video',
    description: 'A guided meditation session to help you start your mindfulness journey.',
    fileUrl: 'https://example.com/meditation-video.mp4',
    thumbnailUrl: 'https://example.com/meditation-thumb.jpg',
    duration: '15 min',
    difficulty: 'beginner',
    tags: ['mindfulness', 'meditation', 'wellbeing'],
    categories: ['Mindfulness', 'Wellness'],
    rating: 4.9,
    downloadCount: 89,
    viewCount: 267,
    isPublic: true,
    isPremium: true,
    authorId: 'coach2',
    authorName: 'Mark Chen',
    authorRole: 'coach',
    fileSize: 45000000,
    mimeType: 'video/mp4',
    createdAt: '2024-01-10T14:30:00Z',
    updatedAt: '2024-01-10T14:30:00Z'
  },
  {
    id: '3',
    title: 'Personal Values Assessment',
    type: 'worksheet',
    description: 'Discover your core values with this comprehensive self-assessment tool.',
    content: 'Interactive worksheet to identify and prioritize your personal values...',
    fileUrl: 'https://example.com/values-worksheet.pdf',
    duration: '20 min',
    difficulty: 'intermediate',
    tags: ['values', 'self-discovery', 'assessment'],
    categories: ['Personal Development'],
    rating: 4.7,
    downloadCount: 234,
    viewCount: 445,
    isPublic: true,
    isPremium: false,
    authorId: 'admin1',
    authorName: 'System Admin',
    authorRole: 'admin',
    fileSize: 2500000,
    mimeType: 'application/pdf',
    createdAt: '2024-01-05T09:15:00Z',
    updatedAt: '2024-01-05T09:15:00Z'
  },
  {
    id: '4',
    title: 'Building Resilience in Challenging Times',
    type: 'guide',
    description: 'Advanced strategies for developing mental resilience and emotional strength.',
    content: 'Step-by-step guide to building psychological resilience...',
    duration: '30 min read',
    difficulty: 'advanced',
    tags: ['resilience', 'mental-health', 'coping'],
    categories: ['Wellness', 'Personal Development'],
    rating: 4.6,
    downloadCount: 178,
    viewCount: 356,
    isPublic: true,
    isPremium: true,
    authorId: 'coach3',
    authorName: 'Dr. Emily Rodriguez',
    authorRole: 'coach',
    createdAt: '2024-01-01T16:45:00Z',
    updatedAt: '2024-01-01T16:45:00Z'
  },
  {
    id: '5',
    title: 'Leadership Communication Template',
    type: 'template',
    description: 'A comprehensive template for effective leadership communication.',
    fileUrl: 'https://example.com/leadership-template.docx',
    duration: '10 min setup',
    difficulty: 'intermediate',
    tags: ['leadership', 'communication', 'template'],
    categories: ['Leadership', 'Communication'],
    rating: 4.5,
    downloadCount: 92,
    viewCount: 187,
    isPublic: false,
    isPremium: true,
    authorId: 'coach1',
    authorName: 'Dr. Sarah Johnson',
    authorRole: 'coach',
    fileSize: 850000,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    createdAt: '2023-12-28T11:20:00Z',
    updatedAt: '2023-12-28T11:20:00Z'
  }
];

const MOCK_CATEGORIES: ResourceCategory[] = DEFAULT_RESOURCE_CATEGORIES.map((cat, index) => ({
  ...cat,
  id: `cat-${index + 1}`,
  resourceCount: Math.floor(Math.random() * 15) + 1,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
}));

export const useResources = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [collections, setCollections] = useState<ResourceCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setResources(MOCK_RESOURCES);
        setCategories(MOCK_CATEGORIES);
        setCollections([]);
      } catch (error) {
        console.error('Failed to load resources:', error);
                 toast({
           variant: 'destructive',
           title: 'Error Loading Resources',
           description: 'Failed to load resource library. Please try again.'
         });
      } finally {
        setLoading(false);
      }
    };

         loadData();
   }, [toast]);

   // Search and filter resources
   const searchResources = useCallback((params: ResourceSearchParams) => {
    let filtered = [...resources];

    // Text search
    if (params.query) {
      const query = params.query.toLowerCase();
      filtered = filtered.filter(resource =>
        resource.title.toLowerCase().includes(query) ||
        resource.description.toLowerCase().includes(query) ||
        resource.tags.some(tag => tag.toLowerCase().includes(query)) ||
        resource.categories.some(cat => cat.toLowerCase().includes(query))
      );
    }

    // Type filter
    if (params.type && params.type !== 'all') {
      filtered = filtered.filter(resource => resource.type === params.type);
    }

    // Difficulty filter
    if (params.difficulty && params.difficulty !== 'all') {
      filtered = filtered.filter(resource => resource.difficulty === params.difficulty);
    }

    // Category filter
    if (params.category && params.category !== 'all') {
      filtered = filtered.filter(resource => 
        resource.categories.includes(params.category!)
      );
    }

    // Author filter
    if (params.author && params.author !== 'all') {
      filtered = filtered.filter(resource => resource.authorId === params.author);
    }

    // Public/Private filter
    if (params.isPublic !== undefined) {
      filtered = filtered.filter(resource => resource.isPublic === params.isPublic);
    }

    // Premium filter
    if (params.isPremium !== undefined) {
      filtered = filtered.filter(resource => resource.isPremium === params.isPremium);
    }

    // Tag filter
    if (params.tags && params.tags.length > 0) {
      filtered = filtered.filter(resource =>
        params.tags!.some(tag => resource.tags.includes(tag))
      );
    }

    // Sorting
    if (params.sortBy) {
      filtered.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (params.sortBy) {
          case 'title':
            aValue = a.title.toLowerCase();
            bValue = b.title.toLowerCase();
            break;
          case 'createdAt':
            aValue = new Date(a.createdAt);
            bValue = new Date(b.createdAt);
            break;
          case 'rating':
            aValue = a.rating;
            bValue = b.rating;
            break;
          case 'downloadCount':
            aValue = a.downloadCount;
            bValue = b.downloadCount;
            break;
          case 'viewCount':
            aValue = a.viewCount;
            bValue = b.viewCount;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return params.sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return params.sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Pagination
    if (params.page && params.limit) {
      const start = (params.page - 1) * params.limit;
      const end = start + params.limit;
      filtered = filtered.slice(start, end);
    }

    return filtered;
  }, [resources]);

  // Create resource
  const createResource = useCallback(async (data: CreateResourceRequest): Promise<Resource> => {
    try {
      setCreating(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const newResource: Resource = {
        ...data,
        id: `resource-${Date.now()}`,
        rating: 0,
        downloadCount: 0,
        viewCount: 0,
                 authorId: (profile?.id || 'unknown') as string,
         authorName: (profile?.full_name || profile?.name || 'Unknown') as string,
         authorRole: (profile?.role || 'coach') as 'coach' | 'admin' | 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

             setResources(prev => [newResource, ...prev]);
       
       toast({
         title: 'Resource Created',
         description: `"${data.title}" has been created successfully.`
       });

       return newResource;
     } catch (error) {
       console.error('Failed to create resource:', error);
       toast({
         variant: 'destructive',
         title: 'Creation Failed',
         description: 'Failed to create resource. Please try again.'
       });
       throw error;
     } finally {
       setCreating(false);
     }
   }, [profile, toast]);

  // Update resource
  const updateResource = useCallback(async (data: UpdateResourceRequest): Promise<Resource> => {
    try {
      setUpdating(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedResource = resources.find(r => r.id === data.id);
      if (!updatedResource) {
        throw new Error('Resource not found');
      }

      const updated: Resource = {
        ...updatedResource,
        ...data,
        updatedAt: new Date().toISOString()
      };

             setResources(prev => prev.map(r => r.id === data.id ? updated : r));
       
       toast({
         title: 'Resource Updated',
         description: `"${updated.title}" has been updated successfully.`
       });

       return updated;
     } catch (error) {
       console.error('Failed to update resource:', error);
       toast({
         variant: 'destructive',
         title: 'Update Failed',
         description: 'Failed to update resource. Please try again.'
       });
       throw error;
     } finally {
       setUpdating(false);
     }
   }, [resources, toast]);

  // Delete resource
  const deleteResource = useCallback(async (id: string): Promise<void> => {
    try {
      setDeleting(true);
      
      const resource = resources.find(r => r.id === id);
      if (!resource) {
        throw new Error('Resource not found');
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
             setResources(prev => prev.filter(r => r.id !== id));
       
       toast({
         title: 'Resource Deleted',
         description: `"${resource.title}" has been deleted successfully.`
       });
     } catch (error) {
       console.error('Failed to delete resource:', error);
       toast({
         variant: 'destructive',
         title: 'Deletion Failed',
         description: 'Failed to delete resource. Please try again.'
       });
       throw error;
     } finally {
       setDeleting(false);
     }
   }, [resources, toast]);

  // Get resource by ID
  const getResource = useCallback((id: string): Resource | undefined => {
    return resources.find(r => r.id === id);
  }, [resources]);

  // Track resource access
  const trackResourceAccess = useCallback(async (
    resourceId: string, 
    accessType: 'view' | 'download'
  ): Promise<void> => {
    try {
      // Update local state immediately
      setResources(prev => prev.map(resource => {
        if (resource.id === resourceId) {
          return {
            ...resource,
            [accessType === 'view' ? 'viewCount' : 'downloadCount']: 
              resource[accessType === 'view' ? 'viewCount' : 'downloadCount'] + 1
          };
        }
        return resource;
      }));

      // Simulate API call to track access
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error('Failed to track resource access:', error);
    }
  }, []);

  // Get resource statistics
  const getResourceStats = useCallback((): ResourceStats => {
    const totalResources = resources.length;
    const totalDownloads = resources.reduce((sum, r) => sum + r.downloadCount, 0);
    const totalViews = resources.reduce((sum, r) => sum + r.viewCount, 0);
    const averageRating = resources.reduce((sum, r) => sum + r.rating, 0) / totalResources || 0;

    const resourcesByType = resources.reduce((acc, resource) => {
      acc[resource.type] = (acc[resource.type] || 0) + 1;
      return acc;
    }, {} as Record<Resource['type'], number>);

    const resourcesByDifficulty = resources.reduce((acc, resource) => {
      acc[resource.difficulty] = (acc[resource.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<Resource['difficulty'], number>);

    const categoryCount = resources.reduce((acc, resource) => {
      resource.categories.forEach(cat => {
        acc[cat] = (acc[cat] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const tagCount = resources.reduce((acc, resource) => {
      resource.tags.forEach(tag => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const topCategories = Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topTags = Object.entries(tagCount)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Mock recent activity
    const recentActivity = resources.slice(0, 5).map(resource => ({
      type: 'created' as const,
      resourceId: resource.id,
      resourceTitle: resource.title,
      userId: resource.authorId,
      userName: resource.authorName,
      timestamp: resource.createdAt
    }));

    return {
      totalResources,
      totalDownloads,
      totalViews,
      averageRating,
      resourcesByType,
      resourcesByDifficulty,
      topCategories,
      topTags,
      recentActivity
    };
  }, [resources]);

  return {
    // Data
    resources,
    categories,
    collections,
    
    // Loading states
    loading,
    creating,
    updating,
    deleting,
    
    // Operations
    searchResources,
    createResource,
    updateResource,
    deleteResource,
    getResource,
    trackResourceAccess,
    getResourceStats
  };
}; 