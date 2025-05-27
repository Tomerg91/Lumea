export type FeedbackType = 'coach' | 'client';
export type FeedbackStatus = 'pending' | 'submitted' | 'reviewed' | 'archived';
export type QuestionType = 'rating' | 'scale' | 'text' | 'multiple_choice' | 'yes_no';
export type ConfidentialityLevel = 'standard' | 'restricted' | 'anonymous';

export interface FeedbackRatings {
  overallSatisfaction: number;
  coachEffectiveness: number;
  sessionQuality: number;
  goalProgress: number;
  communicationQuality: number;
  wouldRecommend: number;
}

export interface FeedbackQuestion {
  id: string;
  question: string;
  type: QuestionType;
  required: boolean;
  options?: string[]; // For multiple choice questions
  minValue?: number; // For scale questions
  maxValue?: number; // For scale questions
  category?: string; // Group questions by category
}

export interface FeedbackAnswer {
  questionId: string;
  answer: string | number | boolean;
  metadata?: Record<string, any>;
}

export interface SessionFeedback {
  _id?: string;
  sessionId: string;
  coachId: string;
  clientId: string;
  feedbackType: FeedbackType;
  status: FeedbackStatus;
  
  // Core ratings (1-5 scale)
  ratings: FeedbackRatings;
  
  // Session-specific feedback
  sessionGoalsMet: boolean;
  overallComments?: string;
  sessionGoalsComments?: string;
  challengesFaced?: string;
  successHighlights?: string;
  improvementSuggestions?: string;
  nextSessionFocus?: string;
  privateNotes?: string;
  
  // Dynamic questions and answers
  answers?: FeedbackAnswer[];
  templateId?: string;
  
  // Privacy and consent
  anonymous?: boolean;
  consentToShare?: boolean;
  confidentialityLevel?: ConfidentialityLevel;
  
  // Metadata
  submittedBy?: string;
  submittedAt?: Date;
  dueDate?: Date;
  responseTime?: number; // Time taken to complete in seconds
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FeedbackTemplate {
  _id?: string;
  name: string;
  description?: string;
  templateType: 'coach' | 'client' | 'combined';
  status: 'draft' | 'active' | 'archived';
  
  // Question configuration
  questions: FeedbackQuestion[];
  isDefault: boolean;
  
  // Organization and permissions
  createdBy: string;
  organizationId?: string;
  isPublic: boolean;
  
  // Usage analytics
  usageCount: number;
  averageRating?: number;
  
  // Metadata
  category?: string;
  tags?: string[];
  estimatedMinutes?: number;
  version?: number;
  parentTemplateId?: string; // For template inheritance
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FeedbackAnalytics {
  _id?: string;
  entityId: string; // Coach, Client, or Organization ID
  entityType: 'coach' | 'client' | 'organization' | 'platform';
  timePeriod: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  periodStart: Date;
  periodEnd: Date;
  
  // Current period metrics
  ratings: FeedbackRatings & { overall: number };
  metrics: {
    totalFeedbacks: number;
    submittedCount: number;
    pendingCount: number;
    overdueCount: number;
    responseRate: number; // Percentage
    averageResponseTime: number; // In hours
  };
  
  // Trend data for charts
  trends: Array<{
    period: string;
    ratings: FeedbackRatings & { overall: number };
    metrics: {
      totalFeedbacks: number;
      submittedCount: number;
      pendingCount: number;
      overdueCount: number;
      responseRate: number;
      averageResponseTime: number;
    };
    feedbackCount: number;
  }>;
  
  // Comparative data
  previousPeriodRatings?: FeedbackRatings & { overall: number };
  benchmarkRatings?: FeedbackRatings & { overall: number };
  
  // Additional insights
  topStrengths: string[];
  improvementAreas: string[];
  commonChallenges: string[];
  
  // Goal tracking
  sessionGoalsMetPercentage: number;
  clientRetentionRate?: number;
  recommendationScore: number; // Net Promoter Score equivalent
  
  // Calculation metadata
  lastCalculated: Date;
  dataVersion: number;
  sampleSize: number;
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

// Form-specific types
export interface FeedbackFormData {
  feedbackType: FeedbackType;
  ratings: FeedbackRatings;
  sessionGoalsMet: boolean;
  overallComments?: string;
  sessionGoalsComments?: string;
  challengesFaced?: string;
  successHighlights?: string;
  improvementSuggestions?: string;
  nextSessionFocus?: string;
  privateNotes?: string;
  answers?: FeedbackAnswer[];
  anonymous?: boolean;
  consentToShare?: boolean;
  confidentialityLevel?: ConfidentialityLevel;
  responseTime?: number; // Time taken to complete in seconds
}

export interface FeedbackFormState {
  currentStep: number;
  totalSteps: number;
  isSubmitting: boolean;
  isDirty: boolean;
  errors: Record<string, string>;
  lastSaved?: Date;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  startTime?: Date;
}

export interface FeedbackValidationError {
  field: string;
  message: string;
  type: 'required' | 'minLength' | 'maxLength' | 'minValue' | 'maxValue' | 'pattern' | 'custom';
}

// API response types
export interface FeedbackSubmissionResponse {
  success: boolean;
  message: string;
  feedback?: SessionFeedback;
  errors?: FeedbackValidationError[];
}

export interface FeedbackListResponse {
  success: boolean;
  feedbacks: SessionFeedback[];
  count: number;
}

export interface FeedbackAnalyticsResponse {
  success: boolean;
  analytics: FeedbackAnalytics;
}

export interface FeedbackTemplateListResponse {
  success: boolean;
  templates: FeedbackTemplate[];
  count: number;
}

// Component prop types
export interface FeedbackFormProps {
  sessionId: string;
  feedbackType: FeedbackType;
  existingFeedback?: SessionFeedback;
  template?: FeedbackTemplate;
  onSubmit?: (feedback: FeedbackFormData) => void;
  onSave?: (feedback: Partial<FeedbackFormData>) => void;
  onCancel?: () => void;
  disabled?: boolean;
  className?: string;
}

export interface RatingInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  description?: string;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export interface FeedbackStepProps {
  formData: FeedbackFormData;
  onChange: (data: Partial<FeedbackFormData>) => void;
  errors: Record<string, string>;
  disabled?: boolean;
}

// Utility types
export type FeedbackFormStep = 'ratings' | 'comments' | 'questions' | 'privacy' | 'review';

export interface FeedbackStepConfig {
  id: FeedbackFormStep;
  title: string;
  description: string;
  component: React.ComponentType<FeedbackStepProps>;
  validation?: (data: FeedbackFormData) => FeedbackValidationError[];
  optional?: boolean;
} 