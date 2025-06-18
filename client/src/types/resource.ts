export interface Resource {
  id: string;
  title: string;
  description?: string;
  type: 'file' | 'link' | 'video' | 'document' | 'pdf';
  file_url?: string; // Supabase Storage URL for uploaded files
  link_url?: string; // External URL for links
  file_name?: string; // Original filename for uploaded files
  file_size?: number; // File size in bytes
  mime_type?: string; // MIME type for uploaded files
  coach_id: string;
  is_public: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ResourceAssignment {
  id: string;
  resource_id: string;
  client_id: string;
  coach_id: string;
  assigned_at: string;
  viewed_at?: string;
  view_count: number;
  notes?: string; // Coach notes about this assignment
  is_required: boolean; // Whether this resource is required for the client
  due_date?: string; // Optional due date for reviewing the resource
  completed_at?: string; // When client marked as completed
  created_at: string;
  updated_at: string;
  
  // Populated fields from joins
  resource?: Resource;
  client?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface LegacyResource {
  id: string;
  title: string;
  type: 'article' | 'video' | 'worksheet' | 'guide' | 'template' | 'document';
  description: string;
  content?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  duration?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  categories: string[];
  rating: number;
  downloadCount: number;
  viewCount: number;
  isPublic: boolean;
  isPremium: boolean;
  authorId: string;
  authorName: string;
  authorRole: 'coach' | 'admin' | 'system';
  fileSize?: number;
  mimeType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  parentId?: string;
  isDefault: boolean;
  resourceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceCollection {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  authorId: string;
  authorName: string;
  resourceIds: string[];
  tags: string[];
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceAccess {
  id: string;
  resourceId: string;
  userId: string;
  accessType: 'view' | 'download' | 'edit' | 'share';
  accessedAt: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateResourceRequest {
  title: string;
  type: LegacyResource['type'];
  description: string;
  content?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  duration?: string;
  difficulty: LegacyResource['difficulty'];
  tags: string[];
  categories: string[];
  isPublic: boolean;
  isPremium: boolean;
}

export interface UpdateResourceRequest extends Partial<CreateResourceRequest> {
  id: string;
}

export interface ResourceFilters {
  type?: LegacyResource['type'] | 'all';
  difficulty?: LegacyResource['difficulty'] | 'all';
  category?: string | 'all';
  author?: string | 'all';
  isPublic?: boolean;
  isPremium?: boolean;
  tags?: string[];
}

export interface ResourceSearchParams extends ResourceFilters {
  query?: string;
  sortBy?: 'title' | 'createdAt' | 'rating' | 'downloadCount' | 'viewCount';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ResourceStats {
  totalResources: number;
  totalDownloads: number;
  totalViews: number;
  averageRating: number;
  resourcesByType: Record<LegacyResource['type'], number>;
  resourcesByDifficulty: Record<LegacyResource['difficulty'], number>;
  topCategories: Array<{ category: string; count: number }>;
  topTags: Array<{ tag: string; count: number }>;
  recentActivity: Array<{
    type: 'created' | 'updated' | 'downloaded' | 'viewed';
    resourceId: string;
    resourceTitle: string;
    userId: string;
    userName: string;
    timestamp: string;
  }>;
}

// Configuration constants
export const RESOURCE_TYPE_CONFIG = {
  article: {
    label: 'Article',
    icon: 'FileText',
    color: 'blue',
    description: 'Written content and blog posts'
  },
  video: {
    label: 'Video',
    icon: 'Video',
    color: 'red',
    description: 'Video content and tutorials'
  },
  worksheet: {
    label: 'Worksheet',
    icon: 'FileEdit',
    color: 'green',
    description: 'Interactive worksheets and exercises'
  },
  guide: {
    label: 'Guide',
    icon: 'BookOpen',
    color: 'purple',
    description: 'Step-by-step guides and manuals'
  },
  template: {
    label: 'Template',
    icon: 'Layout',
    color: 'orange',
    description: 'Reusable templates and forms'
  },
  document: {
    label: 'Document',
    icon: 'File',
    color: 'gray',
    description: 'General documents and files'
  }
} as const;

export const RESOURCE_DIFFICULTY_CONFIG = {
  beginner: {
    label: 'Beginner',
    color: 'green',
    description: 'Basic level content'
  },
  intermediate: {
    label: 'Intermediate',
    color: 'yellow',
    description: 'Moderate level content'
  },
  advanced: {
    label: 'Advanced',
    color: 'red',
    description: 'Expert level content'
  }
} as const;

export const DEFAULT_RESOURCE_CATEGORIES: Omit<ResourceCategory, 'id' | 'resourceCount' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Goal Setting',
    description: 'Resources for setting and achieving goals',
    color: '#3B82F6',
    icon: 'Target',
    isDefault: true
  },
  {
    name: 'Mindfulness',
    description: 'Meditation and mindfulness practices',
    color: '#10B981',
    icon: 'Brain',
    isDefault: true
  },
  {
    name: 'Communication',
    description: 'Improving communication skills',
    color: '#8B5CF6',
    icon: 'MessageCircle',
    isDefault: true
  },
  {
    name: 'Leadership',
    description: 'Leadership development resources',
    color: '#F59E0B',
    icon: 'Crown',
    isDefault: true
  },
  {
    name: 'Personal Development',
    description: 'Self-improvement and growth',
    color: '#EF4444',
    icon: 'User',
    isDefault: true
  },
  {
    name: 'Wellness',
    description: 'Health and wellness resources',
    color: '#06B6D4',
    icon: 'Heart',
    isDefault: true
  },
  {
    name: 'Career',
    description: 'Career development and planning',
    color: '#84CC16',
    icon: 'Briefcase',
    isDefault: true
  },
  {
    name: 'Relationships',
    description: 'Building and maintaining relationships',
    color: '#EC4899',
    icon: 'Users',
    isDefault: true
  }
];

// New interfaces for the actual resource system
export interface CreateResourceData {
  title: string;
  description?: string;
  type: Resource['type'];
  file_url?: string;
  link_url?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  is_public?: boolean;
  tags?: string[];
}

export interface UpdateResourceData extends Partial<CreateResourceData> {
  id: string;
}

export interface CreateResourceAssignmentData {
  resource_id: string;
  client_id: string;
  notes?: string;
  is_required?: boolean;
  due_date?: string;
}

export interface UpdateResourceAssignmentData extends Partial<CreateResourceAssignmentData> {
  id: string;
}

export interface ResourceFiltersNew {
  type?: Resource['type'] | 'all';
  is_public?: boolean;
  tags?: string[];
  assigned_to_client?: string;
}

export interface ResourceSearchParamsNew extends ResourceFiltersNew {
  query?: string;
  sortBy?: 'title' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// File upload types for resources
export interface ResourceUploadOptions {
  title: string;
  description?: string;
  type: Exclude<Resource['type'], 'link'>; // All types except link since this is for file uploads
  is_public?: boolean;
  tags?: string[];
}

export interface ResourceLinkData {
  title: string;
  description?: string;
  link_url: string;
  is_public?: boolean;
  tags?: string[];
} 