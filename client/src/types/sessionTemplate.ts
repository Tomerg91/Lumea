export type TemplateType = 'standard' | 'recurring' | 'assessment' | 'follow-up' | 'custom';
export type RecurrencePattern = 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'custom';
export type SessionStructureType = 'check-in' | 'goal-setting' | 'progress-review' | 'assessment' | 'coaching' | 'custom';

export interface SessionStructureComponent {
  id: string;
  type: SessionStructureType;
  title: string;
  description?: string;
  estimatedDuration: number; // Duration in minutes
  order: number;
  isRequired: boolean;
  defaultContent?: string;
  prompts?: string[]; // Suggested questions or prompts for this component
}

export interface RecurrenceConfig {
  pattern: RecurrencePattern;
  interval: number; // Every N periods (e.g., every 2 weeks)
  daysOfWeek?: number[]; // For weekly patterns (0=Sunday, 1=Monday, etc.)
  dayOfMonth?: number; // For monthly patterns
  endDate?: Date;
  maxOccurrences?: number;
  rrule?: string; // Standard RRULE format for complex patterns
}

export interface TemplateCustomization {
  clientId?: string; // If template is customized for specific client
  customFields: Record<string, any>; // Flexible custom data
  overrides: {
    duration?: number;
    structure?: SessionStructureComponent[];
    objectives?: string[];
    notes?: string;
  };
}

export interface SessionTemplate {
  id: string;
  // Basic template info
  name: string;
  description?: string;
  type: TemplateType;
  coachId: string;
  
  // Template structure
  defaultDuration: number; // Duration in minutes
  structure: SessionStructureComponent[];
  objectives: string[]; // Default session objectives
  defaultNotes?: string;
  
  // Recurring session configuration
  isRecurring: boolean;
  recurrenceConfig?: RecurrenceConfig;
  
  // Template settings
  isActive: boolean;
  isPublic: boolean; // Whether other coaches can use this template
  category?: string; // For organizing templates
  tags: string[];
  
  // Versioning and history
  version: number;
  parentTemplateId?: string; // Reference to original template if this is a version
  
  // Usage tracking
  usageCount: number;
  lastUsed?: string;
  
  // Client-specific customizations
  customizations: TemplateCustomization[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionTemplateRequest {
  name: string;
  description?: string;
  type: TemplateType;
  defaultDuration: number;
  structure: SessionStructureComponent[];
  objectives: string[];
  defaultNotes?: string;
  isRecurring?: boolean;
  recurrenceConfig?: RecurrenceConfig;
  isPublic?: boolean;
  category?: string;
  tags?: string[];
}

export interface UpdateSessionTemplateRequest extends Partial<CreateSessionTemplateRequest> {
  isActive?: boolean;
}

export interface CloneTemplateRequest {
  name: string;
  description?: string;
  isPublic?: boolean;
  category?: string;
  tags?: string[];
}

export interface TemplateUsageStats {
  totalUses: number;
  recentUses: number; // Last 30 days
  averageSessionDuration: number;
  clientsUsedWith: number;
  lastUsedDate?: string;
  popularComponents: {
    componentId: string;
    title: string;
    usageCount: number;
  }[];
}

export interface GetTemplatesResponse {
  templates: SessionTemplate[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface GetTemplatesParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: TemplateType;
  category?: string;
  isActive?: boolean;
  isPublic?: boolean;
  sortBy?: 'name' | 'createdAt' | 'lastUsed' | 'usageCount';
  sortOrder?: 'asc' | 'desc';
} 