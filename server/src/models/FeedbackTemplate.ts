import { Schema, model, Document, Types } from 'mongoose';
import { IUser } from './User';
import { IFeedbackQuestion } from './SessionFeedback';

export type TemplateType = 'coach' | 'client' | 'combined';
export type TemplateStatus = 'draft' | 'active' | 'archived';

export interface IFeedbackTemplate extends Document {
  name: string;
  description?: string;
  templateType: TemplateType; // 'coach', 'client', or 'combined'
  status: TemplateStatus;
  
  // Question configuration
  questions: IFeedbackQuestion[];
  isDefault: boolean; // Whether this is the default template for this type
  
  // Organization and permissions
  createdBy: Types.ObjectId | IUser;
  organizationId?: Types.ObjectId; // For multi-tenant support
  isPublic: boolean; // Whether template can be used by other coaches
  
  // Usage analytics
  usageCount: number;
  lastUsed?: Date;
  
  // Versioning
  version: number;
  parentTemplateId?: Types.ObjectId; // Reference to original template if this is a copy
  
  // Categories for organization
  category?: string;
  tags: string[];
  
  // Estimated completion time
  estimatedMinutes: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackQuestionSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  question: {
    type: String,
    required: true,
    maxlength: 500,
  },
  type: {
    type: String,
    enum: ['rating', 'scale', 'text', 'multiple_choice', 'yes_no'],
    required: true,
  },
  required: {
    type: Boolean,
    default: false,
  },
  options: [{
    type: String,
    maxlength: 200,
  }],
  minValue: {
    type: Number,
    min: 1,
  },
  maxValue: {
    type: Number,
    max: 10,
  },
  category: {
    type: String,
    maxlength: 100,
  },
  order: {
    type: Number,
    default: 0,
  },
  helpText: {
    type: String,
    maxlength: 300,
  },
}, { _id: false });

const FeedbackTemplateSchema = new Schema<IFeedbackTemplate>(
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
    templateType: {
      type: String,
      enum: ['coach', 'client', 'combined'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'draft',
      index: true,
    },
    
    // Question configuration
    questions: [FeedbackQuestionSchema],
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
    
    // Organization and permissions
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
    
    // Usage analytics
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastUsed: {
      type: Date,
    },
    
    // Versioning
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    parentTemplateId: {
      type: Schema.Types.ObjectId,
      ref: 'FeedbackTemplate',
    },
    
    // Categories for organization
    category: {
      type: String,
      maxlength: 100,
      index: true,
    },
    tags: [{
      type: String,
      maxlength: 50,
    }],
    
    // Estimated completion time
    estimatedMinutes: {
      type: Number,
      default: 5,
      min: 1,
      max: 60,
    },
  },
  { 
    timestamps: true,
  }
);

// Compound indexes for efficient querying
FeedbackTemplateSchema.index({ templateType: 1, status: 1, isDefault: 1 });
FeedbackTemplateSchema.index({ createdBy: 1, status: 1, createdAt: -1 });
FeedbackTemplateSchema.index({ isPublic: 1, status: 1, usageCount: -1 });
FeedbackTemplateSchema.index({ category: 1, status: 1 });
FeedbackTemplateSchema.index({ tags: 1, status: 1 });

// Virtual for question count
FeedbackTemplateSchema.virtual('questionCount').get(function() {
  return this.questions.length;
});

// Virtual for required question count
FeedbackTemplateSchema.virtual('requiredQuestionCount').get(function() {
  return this.questions.filter(q => q.required).length;
});

// Virtual for template complexity score
FeedbackTemplateSchema.virtual('complexityScore').get(function() {
  const baseScore = this.questions.length;
  const textQuestions = this.questions.filter(q => q.type === 'text').length;
  const multipleChoiceQuestions = this.questions.filter(q => q.type === 'multiple_choice').length;
  
  // Text questions are more complex, multiple choice moderately complex
  return baseScore + (textQuestions * 2) + (multipleChoiceQuestions * 0.5);
});

// Virtual for estimated completion time based on question types
FeedbackTemplateSchema.virtual('calculatedDuration').get(function() {
  let minutes = 0;
  
  this.questions.forEach(question => {
    switch (question.type) {
      case 'rating':
      case 'scale':
      case 'yes_no':
        minutes += 0.5;
        break;
      case 'multiple_choice':
        minutes += 1;
        break;
      case 'text':
        minutes += 2;
        break;
      default:
        minutes += 1;
    }
  });
  
  return Math.max(1, Math.round(minutes));
});

// Ensure virtuals are included in JSON output
FeedbackTemplateSchema.set('toJSON', { virtuals: true });

// Pre-save middleware to update estimated minutes based on questions
FeedbackTemplateSchema.pre('save', function(next) {
  if (this.isModified('questions')) {
    // Calculate estimated minutes based on question types
    let minutes = 0;
    this.questions.forEach(question => {
      switch (question.type) {
        case 'rating':
        case 'scale':
        case 'yes_no':
          minutes += 0.5;
          break;
        case 'multiple_choice':
          minutes += 1;
          break;
        case 'text':
          minutes += 2;
          break;
        default:
          minutes += 1;
      }
    });
    this.estimatedMinutes = Math.max(1, Math.round(minutes));
  }
  next();
});

export const FeedbackTemplate = model<IFeedbackTemplate>('FeedbackTemplate', FeedbackTemplateSchema); 