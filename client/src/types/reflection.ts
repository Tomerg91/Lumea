// Frontend types for reflection system - matches backend models

export type QuestionType = 'text' | 'scale' | 'multiple_choice' | 'yes_no' | 'rich_text' | 'audio';

export type ReflectionCategory = 'self_awareness' | 'patterns' | 'growth_opportunities' | 'action_commitments' | 'gratitude';

export type ReflectionTemplateType = 
  | 'standard'           // Regular session reflection
  | 'breakthrough'       // After major breakthrough sessions
  | 'challenge'         // When working through difficult topics
  | 'goal_setting'      // Goal-oriented sessions
  | 'relationship'      // Relationship-focused sessions
  | 'career'            // Career/professional focus
  | 'wellness'          // Health and wellness focus
  | 'short_form';       // Quick reflection for shorter sessions

export interface ReflectionQuestion {
  id: string;
  category: ReflectionCategory;
  type: QuestionType;
  question: string;
  required: boolean;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleLabels?: { min: string; max: string };
  followUpQuestion?: string;
  order: number;
}

export interface AdvancedReflectionQuestion extends ReflectionQuestion {
  section: string;
  subsection?: string;
  helpText?: string;
  placeholder?: string;
  conditionalLogic?: {
    dependsOn: string;
    showIf: string | number | boolean | string[];
  };
  validationRules?: {
    minLength?: number;
    maxLength?: number;
    minValue?: number;
    maxValue?: number;
    pattern?: string;
  };
  estimatedMinutes?: number;
}

export interface ReflectionSection {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  questions: AdvancedReflectionQuestion[];
  optional?: boolean;
}

export interface ReflectionTemplate {
  type: ReflectionTemplateType;
  name: string;
  description: string;
  estimatedMinutes: number;
  sections: ReflectionSection[];
}

export interface ReflectionAnswer {
  questionId: string;
  value: string | number | boolean;
  followUpAnswer?: string;
  // Audio-specific properties
  audioData?: {
    blob: Blob;
    url: string;
    duration: number;
    mimeType: string;
    size: number;
  };
  // S3 upload information (when audio is uploaded)
  s3Key?: string;
  fileId?: string;
}

export interface Reflection {
  _id?: string;
  sessionId: string;
  clientId: string;
  coachId: string;
  answers: ReflectionAnswer[];
  status: 'draft' | 'submitted';
  submittedAt?: string;
  lastSavedAt: string;
  version: number;
  estimatedCompletionMinutes?: number;
  actualCompletionMinutes?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReflectionFormData {
  sessionId: string;
  sessionDate: string;
  client: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  coach: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  template: ReflectionTemplate;
  questions: ReflectionQuestion[]; // Backward compatibility
  availableTemplates: {
    type: ReflectionTemplateType;
    name: string;
    description: string;
    estimatedMinutes: number;
  }[];
  estimatedCompletionMinutes: number;
}

// Form validation and state types
export interface ReflectionFormState {
  currentSectionIndex: number;
  answers: Record<string, ReflectionAnswer>;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isDirty: boolean;
  lastSaved?: Date;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
}

export interface ReflectionValidationError {
  questionId: string;
  message: string;
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
}

// API response types
export interface GetReflectionFormResponse {
  sessionId: string;
  sessionDate: string;
  client: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  coach: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  template: ReflectionTemplate;
  questions: ReflectionQuestion[];
  availableTemplates: {
    type: ReflectionTemplateType;
    name: string;
    description: string;
    estimatedMinutes: number;
  }[];
  estimatedCompletionMinutes: number;
}

export interface SaveReflectionRequest {
  answers: ReflectionAnswer[];
  status?: 'draft' | 'submitted';
  estimatedCompletionMinutes?: number;
  actualCompletionMinutes?: number;
}

export interface SaveReflectionResponse {
  message: string;
  reflection: Reflection;
}
