// Milestone System Types

export interface MilestoneCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  coachId: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  targetDate?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  clientId: string;
  coachId: string;
  categoryId?: string;
  category?: MilestoneCategory;
  completedAt?: string;
  notes?: string;
  tags: string[];
  progress: MilestoneProgress[];
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneProgress {
  id: string;
  milestoneId: string;
  progressPercent: number; // 0-100
  notes?: string;
  evidence?: string;
  sessionId?: string;
  recordedBy: string;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMilestoneRequest {
  title: string;
  description?: string;
  targetDate?: string;
  priority: 'high' | 'medium' | 'low';
  clientId: string;
  categoryId?: string;
  notes?: string;
  tags?: string[];
}

export interface UpdateMilestoneRequest {
  title?: string;
  description?: string;
  targetDate?: string;
  priority?: 'high' | 'medium' | 'low';
  status?: 'active' | 'completed' | 'paused' | 'cancelled';
  categoryId?: string;
  notes?: string;
  tags?: string[];
}

export interface CreateMilestoneCategoryRequest {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateMilestoneCategoryRequest {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface RecordMilestoneProgressRequest {
  milestoneId: string;
  progressPercent: number;
  notes?: string;
  evidence?: string;
  sessionId?: string;
}

export interface MilestoneFilters {
  status?: string[];
  priority?: string[];
  categoryId?: string;
  clientId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  search?: string;
}

export interface MilestoneStats {
  total: number;
  active: number;
  completed: number;
  paused: number;
  cancelled: number;
  overdue: number;
  completionRate: number; // percentage
  averageProgress: number; // percentage
}

// Timeline Integration Types
export interface MilestoneTimelineEvent {
  id: string;
  type: 'milestone_created' | 'milestone_completed' | 'milestone_progress' | 'milestone_updated';
  title: string;
  description: string;
  date: string;
  milestone: Milestone;
  progress?: MilestoneProgress;
  metadata?: {
    oldStatus?: string;
    newStatus?: string;
    progressChange?: number;
  };
}

// Default Categories
export const DEFAULT_MILESTONE_CATEGORIES: Omit<MilestoneCategory, 'id' | 'coachId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Personal Growth',
    description: 'Self-improvement and personal development goals',
    color: '#10B981',
    icon: 'User',
    isDefault: true
  },
  {
    name: 'Career Development',
    description: 'Professional growth and career advancement',
    color: '#3B82F6',
    icon: 'Briefcase',
    isDefault: true
  },
  {
    name: 'Health & Wellness',
    description: 'Physical and mental health objectives',
    color: '#F59E0B',
    icon: 'Heart',
    isDefault: true
  },
  {
    name: 'Relationships',
    description: 'Interpersonal and social connection goals',
    color: '#EF4444',
    icon: 'Users',
    isDefault: true
  },
  {
    name: 'Skills & Learning',
    description: 'Knowledge acquisition and skill development',
    color: '#8B5CF6',
    icon: 'BookOpen',
    isDefault: true
  },
  {
    name: 'Financial',
    description: 'Financial planning and money management',
    color: '#059669',
    icon: 'DollarSign',
    isDefault: true
  }
];

// Priority Colors and Icons
export const MILESTONE_PRIORITY_CONFIG = {
  high: {
    color: '#EF4444',
    bgColor: '#FEF2F2',
    icon: 'AlertTriangle',
    label: 'High Priority'
  },
  medium: {
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    icon: 'Clock',
    label: 'Medium Priority'
  },
  low: {
    color: '#10B981',
    bgColor: '#F0FDF4',
    icon: 'CheckCircle',
    label: 'Low Priority'
  }
};

// Status Colors and Icons
export const MILESTONE_STATUS_CONFIG = {
  active: {
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    icon: 'Play',
    label: 'Active'
  },
  completed: {
    color: '#10B981',
    bgColor: '#F0FDF4',
    icon: 'CheckCircle',
    label: 'Completed'
  },
  paused: {
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    icon: 'Pause',
    label: 'Paused'
  },
  cancelled: {
    color: '#EF4444',
    bgColor: '#FEF2F2',
    icon: 'X',
    label: 'Cancelled'
  }
}; 