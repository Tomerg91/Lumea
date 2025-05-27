import { Schema, model, Document, Types } from 'mongoose';
import { IUser } from './User';
import { ICoachingSession } from './CoachingSession';

export type FeedbackType = 'coach' | 'client';
export type FeedbackStatus = 'pending' | 'submitted' | 'reviewed' | 'archived';
export type QuestionType = 'rating' | 'scale' | 'text' | 'multiple_choice' | 'yes_no';

export interface IFeedbackQuestion {
  id: string;
  question: string;
  type: QuestionType;
  required: boolean;
  options?: string[]; // For multiple choice questions
  minValue?: number; // For scale questions
  maxValue?: number; // For scale questions
  category?: string; // Group questions by category
}

export interface IFeedbackAnswer {
  questionId: string;
  answer: string | number | boolean;
  textResponse?: string; // Additional text for scale/choice questions
}

export interface IFeedbackRatings {
  overallSatisfaction: number; // 1-5 scale
  coachEffectiveness: number; // 1-5 scale
  sessionQuality: number; // 1-5 scale
  goalProgress: number; // 1-5 scale
  communicationQuality: number; // 1-5 scale
  wouldRecommend: number; // 1-5 scale
}

export interface ISessionFeedback extends Document {
  sessionId: Types.ObjectId | ICoachingSession;
  coachId: Types.ObjectId | IUser;
  clientId: Types.ObjectId | IUser;
  feedbackType: FeedbackType; // 'coach' or 'client'
  submittedBy: Types.ObjectId | IUser;
  
  // Status and timing
  status: FeedbackStatus;
  submittedAt?: Date;
  reviewedAt?: Date;
  dueDate: Date;
  
  // Core feedback data
  ratings: IFeedbackRatings;
  answers: IFeedbackAnswer[];
  overallComments?: string;
  privateNotes?: string; // For coach-only internal notes
  
  // Structured feedback questions
  sessionGoalsMet: boolean;
  sessionGoalsComments?: string;
  challengesFaced?: string;
  successHighlights?: string;
  improvementSuggestions?: string;
  nextSessionFocus?: string;
  
  // Analytics metadata
  responseTime?: number; // Time taken to complete feedback in seconds
  anonymous: boolean;
  templateId?: Types.ObjectId; // Reference to feedback template used
  
  // Notification tracking
  reminderSent: boolean;
  reminderCount: number;
  lastReminderSent?: Date;
  
  // Privacy and consent
  consentToShare: boolean; // Consent to share with coaching team
  confidentialityLevel: 'standard' | 'restricted' | 'anonymous';
  
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
}, { _id: false });

const FeedbackAnswerSchema = new Schema({
  questionId: {
    type: String,
    required: true,
  },
  answer: {
    type: Schema.Types.Mixed,
    required: true,
  },
  textResponse: {
    type: String,
    maxlength: 1000,
  },
}, { _id: false });

const FeedbackRatingsSchema = new Schema({
  overallSatisfaction: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  coachEffectiveness: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  sessionQuality: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  goalProgress: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  communicationQuality: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  wouldRecommend: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
}, { _id: false });

const SessionFeedbackSchema = new Schema<ISessionFeedback>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'CoachingSession',
      required: true,
      index: true,
    },
    coachId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    feedbackType: {
      type: String,
      enum: ['coach', 'client'],
      required: true,
      index: true,
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    // Status and timing
    status: {
      type: String,
      enum: ['pending', 'submitted', 'reviewed', 'archived'],
      default: 'pending',
      index: true,
    },
    submittedAt: {
      type: Date,
    },
    reviewedAt: {
      type: Date,
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },
    
    // Core feedback data
    ratings: {
      type: FeedbackRatingsSchema,
      required: true,
    },
    answers: [FeedbackAnswerSchema],
    overallComments: {
      type: String,
      maxlength: 2000,
    },
    privateNotes: {
      type: String,
      maxlength: 1000,
    },
    
    // Structured feedback questions
    sessionGoalsMet: {
      type: Boolean,
      required: true,
    },
    sessionGoalsComments: {
      type: String,
      maxlength: 1000,
    },
    challengesFaced: {
      type: String,
      maxlength: 1000,
    },
    successHighlights: {
      type: String,
      maxlength: 1000,
    },
    improvementSuggestions: {
      type: String,
      maxlength: 1000,
    },
    nextSessionFocus: {
      type: String,
      maxlength: 1000,
    },
    
    // Analytics metadata
    responseTime: {
      type: Number,
      min: 0, // Time in seconds
    },
    anonymous: {
      type: Boolean,
      default: false,
    },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'FeedbackTemplate',
    },
    
    // Notification tracking
    reminderSent: {
      type: Boolean,
      default: false,
    },
    reminderCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastReminderSent: {
      type: Date,
    },
    
    // Privacy and consent
    consentToShare: {
      type: Boolean,
      default: false,
    },
    confidentialityLevel: {
      type: String,
      enum: ['standard', 'restricted', 'anonymous'],
      default: 'standard',
    },
  },
  { 
    timestamps: true,
    // Add virtual field for calculated properties
  }
);

// Compound indexes for efficient querying
SessionFeedbackSchema.index({ sessionId: 1, feedbackType: 1 }, { unique: true }); // One feedback per type per session
SessionFeedbackSchema.index({ coachId: 1, createdAt: -1 }); // Coach feedback history
SessionFeedbackSchema.index({ clientId: 1, createdAt: -1 }); // Client feedback history
SessionFeedbackSchema.index({ status: 1, dueDate: 1 }); // For pending feedback reminders
SessionFeedbackSchema.index({ feedbackType: 1, status: 1, createdAt: -1 }); // Analytics queries
SessionFeedbackSchema.index({ 'ratings.overallSatisfaction': -1, createdAt: -1 }); // Satisfaction trending

// Virtual for calculating average rating
SessionFeedbackSchema.virtual('averageRating').get(function() {
  const ratings = this.ratings;
  return (
    ratings.overallSatisfaction +
    ratings.coachEffectiveness +
    ratings.sessionQuality +
    ratings.goalProgress +
    ratings.communicationQuality +
    ratings.wouldRecommend
  ) / 6;
});

// Virtual for feedback completion status
SessionFeedbackSchema.virtual('isComplete').get(function() {
  return this.status === 'submitted' && this.submittedAt != null;
});

// Virtual for feedback urgency (based on due date)
SessionFeedbackSchema.virtual('isOverdue').get(function() {
  return this.status === 'pending' && new Date() > this.dueDate;
});

// Ensure virtuals are included in JSON output
SessionFeedbackSchema.set('toJSON', { virtuals: true });

export const SessionFeedback = model<ISessionFeedback>('SessionFeedback', SessionFeedbackSchema); 