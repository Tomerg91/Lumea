import { Schema, model, Document, Types } from 'mongoose';
import { IUser } from './User';

export type TemplateType = 'standard' | 'recurring' | 'assessment' | 'follow-up' | 'custom';
export type RecurrencePattern = 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'custom';
export type SessionStructureType = 'check-in' | 'goal-setting' | 'progress-review' | 'assessment' | 'coaching' | 'custom';

export interface ISessionStructureComponent {
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

export interface IRecurrenceConfig {
  pattern: RecurrencePattern;
  interval: number; // e.g., every 2 weeks for bi-weekly
  daysOfWeek?: number[]; // 0-6, Sunday = 0
  dayOfMonth?: number; // For monthly patterns
  endDate?: Date;
  maxOccurrences?: number;
  customRule?: string; // For complex custom patterns (RRULE format)
}

export interface ITemplateCustomization {
  clientId?: Types.ObjectId; // If template is customized for specific client
  customFields: Record<string, any>; // Flexible custom data
  overrides: {
    duration?: number;
    structure?: ISessionStructureComponent[];
    objectives?: string[];
    notes?: string;
  };
}

export interface ISessionTemplate extends Document {
  // Basic template info
  name: string;
  description?: string;
  type: TemplateType;
  coachId: Types.ObjectId | IUser;
  
  // Template structure
  defaultDuration: number; // Duration in minutes
  structure: ISessionStructureComponent[];
  objectives: string[]; // Default session objectives
  defaultNotes?: string;
  
  // Recurring session configuration
  isRecurring: boolean;
  recurrenceConfig?: IRecurrenceConfig;
  
  // Template settings
  isActive: boolean;
  isPublic: boolean; // Whether other coaches can use this template
  category?: string; // For organizing templates
  tags: string[];
  
  // Versioning and history
  version: number;
  parentTemplateId?: Types.ObjectId; // Reference to original template if this is a version
  
  // Usage tracking
  usageCount: number;
  lastUsed?: Date;
  
  // Client-specific customizations
  customizations: ITemplateCustomization[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  incrementUsage(): Promise<ISessionTemplate>;
  createCustomization(clientId: Types.ObjectId, overrides: any): Promise<ISessionTemplate>;
  getCustomizationForClient(clientId: Types.ObjectId): ITemplateCustomization | undefined;
}

const SessionStructureComponentSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['check-in', 'goal-setting', 'progress-review', 'assessment', 'coaching', 'custom'],
    required: true,
  },
  title: {
    type: String,
    required: true,
    maxlength: 200,
  },
  description: {
    type: String,
    maxlength: 1000,
  },
  estimatedDuration: {
    type: Number,
    required: true,
    min: 1,
    max: 240, // Max 4 hours for any component
  },
  order: {
    type: Number,
    required: true,
    min: 0,
  },
  isRequired: {
    type: Boolean,
    default: true,
  },
  defaultContent: {
    type: String,
    maxlength: 2000,
  },
  prompts: [{
    type: String,
    maxlength: 500,
  }],
}, { _id: false });

const RecurrenceConfigSchema = new Schema({
  pattern: {
    type: String,
    enum: ['weekly', 'bi-weekly', 'monthly', 'quarterly', 'custom'],
    required: true,
  },
  interval: {
    type: Number,
    required: true,
    min: 1,
    max: 52, // Max 52 weeks
  },
  daysOfWeek: [{
    type: Number,
    min: 0,
    max: 6,
  }],
  dayOfMonth: {
    type: Number,
    min: 1,
    max: 31,
  },
  endDate: {
    type: Date,
  },
  maxOccurrences: {
    type: Number,
    min: 1,
    max: 1000,
  },
  customRule: {
    type: String,
    maxlength: 500,
  },
}, { _id: false });

const TemplateCustomizationSchema = new Schema({
  clientId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  customFields: {
    type: Schema.Types.Mixed,
    default: {},
  },
  overrides: {
    duration: {
      type: Number,
      min: 15,
      max: 480,
    },
    structure: [SessionStructureComponentSchema],
    objectives: [{
      type: String,
      maxlength: 500,
    }],
    notes: {
      type: String,
      maxlength: 2000,
    },
  },
}, { _id: false });

const SessionTemplateSchema = new Schema<ISessionTemplate>(
  {
    name: {
      type: String,
      required: true,
      maxlength: 200,
      index: true,
    },
    description: {
      type: String,
      maxlength: 1000,
    },
    type: {
      type: String,
      enum: ['standard', 'recurring', 'assessment', 'follow-up', 'custom'],
      required: true,
      index: true,
    },
    coachId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    defaultDuration: {
      type: Number,
      required: true,
      min: 15,
      max: 480, // Max 8 hours
      default: 60,
    },
    structure: [SessionStructureComponentSchema],
    objectives: [{
      type: String,
      maxlength: 500,
    }],
    defaultNotes: {
      type: String,
      maxlength: 2000,
    },
    isRecurring: {
      type: Boolean,
      default: false,
      index: true,
    },
    recurrenceConfig: {
      type: RecurrenceConfigSchema,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
    category: {
      type: String,
      maxlength: 100,
      index: true,
    },
    tags: [{
      type: String,
      maxlength: 50,
    }],
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    parentTemplateId: {
      type: Schema.Types.ObjectId,
      ref: 'SessionTemplate',
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastUsed: {
      type: Date,
    },
    customizations: [TemplateCustomizationSchema],
  },
  { 
    timestamps: true,
    // Add virtual fields for computed properties
  }
);

// Compound indexes for efficient querying
SessionTemplateSchema.index({ coachId: 1, isActive: 1 });
SessionTemplateSchema.index({ coachId: 1, type: 1 });
SessionTemplateSchema.index({ isPublic: 1, isActive: 1 });
SessionTemplateSchema.index({ category: 1, isActive: 1 });
SessionTemplateSchema.index({ tags: 1 });
SessionTemplateSchema.index({ usageCount: -1 }); // For popular templates
SessionTemplateSchema.index({ lastUsed: -1 }); // For recently used templates

// Virtual for total estimated duration
SessionTemplateSchema.virtual('totalEstimatedDuration').get(function() {
  return this.structure.reduce((total, component) => total + component.estimatedDuration, 0);
});

// Virtual for active customizations count
SessionTemplateSchema.virtual('customizationsCount').get(function() {
  return this.customizations.length;
});

// Pre-save middleware to validate structure
SessionTemplateSchema.pre('save', function(next) {
  // Ensure structure components have unique IDs
  const componentIds = this.structure.map(c => c.id);
  const uniqueIds = new Set(componentIds);
  
  if (componentIds.length !== uniqueIds.size) {
    return next(new Error('Session structure components must have unique IDs'));
  }
  
  // Validate total duration doesn't exceed reasonable limits
  const totalDuration = this.structure.reduce((total, component) => total + component.estimatedDuration, 0);
  if (totalDuration > 480) { // 8 hours
    return next(new Error('Total session structure duration cannot exceed 8 hours'));
  }
  
  // Ensure recurrence config is present for recurring templates
  if (this.isRecurring && !this.recurrenceConfig) {
    return next(new Error('Recurring templates must have recurrence configuration'));
  }
  
  next();
});

// Instance methods
SessionTemplateSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

SessionTemplateSchema.methods.createCustomization = function(clientId: Types.ObjectId, overrides: any) {
  const existingIndex = this.customizations.findIndex(c => 
    c.clientId && c.clientId.toString() === clientId.toString()
  );
  
  if (existingIndex >= 0) {
    // Update existing customization
    this.customizations[existingIndex].overrides = { ...this.customizations[existingIndex].overrides, ...overrides };
  } else {
    // Create new customization
    this.customizations.push({
      clientId,
      customFields: {},
      overrides
    });
  }
  
  return this.save();
};

SessionTemplateSchema.methods.getCustomizationForClient = function(clientId: Types.ObjectId) {
  return this.customizations.find(c => 
    c.clientId && c.clientId.toString() === clientId.toString()
  );
};

// Static methods
SessionTemplateSchema.statics.findByCoach = function(coachId: Types.ObjectId, options: any = {}) {
  const query: any = { coachId, isActive: true };
  
  if (options.type) query.type = options.type;
  if (options.category) query.category = options.category;
  if (options.isRecurring !== undefined) query.isRecurring = options.isRecurring;
  
  return this.find(query)
    .sort(options.sortBy || { lastUsed: -1, usageCount: -1 })
    .limit(options.limit || 50);
};

SessionTemplateSchema.statics.findPublicTemplates = function(options: any = {}) {
  const query: any = { isPublic: true, isActive: true };
  
  if (options.type) query.type = options.type;
  if (options.category) query.category = options.category;
  if (options.tags && options.tags.length > 0) query.tags = { $in: options.tags };
  
  return this.find(query)
    .populate('coachId', 'name email')
    .sort(options.sortBy || { usageCount: -1 })
    .limit(options.limit || 20);
};

export const SessionTemplate = model<ISessionTemplate>('SessionTemplate', SessionTemplateSchema); 