import { Schema, model, Document, Types } from 'mongoose';
import { IUser } from './User';

export type AnalyticsLevel = 'coach' | 'client' | 'organization' | 'platform';
export type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface IRatingAverages {
  overallSatisfaction: number;
  coachEffectiveness: number;
  sessionQuality: number;
  goalProgress: number;
  communicationQuality: number;
  wouldRecommend: number;
  overall: number; // Average of all ratings
}

export interface IFeedbackMetrics {
  totalFeedbacks: number;
  submittedCount: number;
  pendingCount: number;
  overdueCount: number;
  responseRate: number; // Percentage of feedback submitted vs requested
  averageResponseTime: number; // In hours
}

export interface ITrendData {
  period: string; // Date string for the period (YYYY-MM-DD format)
  ratings: IRatingAverages;
  metrics: IFeedbackMetrics;
  feedbackCount: number;
}

export interface IFeedbackAnalytics extends Document {
  // Reference data
  entityId: Types.ObjectId | IUser; // Coach, Client, or Organization ID
  entityType: AnalyticsLevel;
  timePeriod: TimePeriod;
  periodStart: Date;
  periodEnd: Date;
  
  // Current period metrics
  ratings: IRatingAverages;
  metrics: IFeedbackMetrics;
  
  // Trend data for charts and historical analysis
  trends: ITrendData[];
  
  // Comparative data
  previousPeriodRatings?: IRatingAverages;
  benchmarkRatings?: IRatingAverages; // Industry or platform benchmarks
  
  // Additional insights
  topStrengths: string[]; // Most mentioned positive feedback themes
  improvementAreas: string[]; // Most mentioned improvement suggestions
  commonChallenges: string[]; // Most mentioned challenges
  
  // Goal tracking
  sessionGoalsMetPercentage: number;
  clientRetentionRate?: number; // For coach analytics
  recommendationScore: number; // Net Promoter Score equivalent
  
  // Calculation metadata
  lastCalculated: Date;
  dataVersion: number; // For cache invalidation
  sampleSize: number; // Number of feedbacks included in calculation
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const RatingAveragesSchema = new Schema({
  overallSatisfaction: {
    type: Number,
    min: 1,
    max: 5,
    default: 0,
  },
  coachEffectiveness: {
    type: Number,
    min: 1,
    max: 5,
    default: 0,
  },
  sessionQuality: {
    type: Number,
    min: 1,
    max: 5,
    default: 0,
  },
  goalProgress: {
    type: Number,
    min: 1,
    max: 5,
    default: 0,
  },
  communicationQuality: {
    type: Number,
    min: 1,
    max: 5,
    default: 0,
  },
  wouldRecommend: {
    type: Number,
    min: 1,
    max: 5,
    default: 0,
  },
  overall: {
    type: Number,
    min: 1,
    max: 5,
    default: 0,
  },
}, { _id: false });

const FeedbackMetricsSchema = new Schema({
  totalFeedbacks: {
    type: Number,
    default: 0,
    min: 0,
  },
  submittedCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  pendingCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  overdueCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  responseRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  averageResponseTime: {
    type: Number,
    default: 0,
    min: 0,
  },
}, { _id: false });

const TrendDataSchema = new Schema({
  period: {
    type: String,
    required: true,
  },
  ratings: {
    type: RatingAveragesSchema,
    required: true,
  },
  metrics: {
    type: FeedbackMetricsSchema,
    required: true,
  },
  feedbackCount: {
    type: Number,
    default: 0,
    min: 0,
  },
}, { _id: false });

const FeedbackAnalyticsSchema = new Schema<IFeedbackAnalytics>(
  {
    // Reference data
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      enum: ['coach', 'client', 'organization', 'platform'],
      required: true,
      index: true,
    },
    timePeriod: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
      required: true,
      index: true,
    },
    periodStart: {
      type: Date,
      required: true,
      index: true,
    },
    periodEnd: {
      type: Date,
      required: true,
      index: true,
    },
    
    // Current period metrics
    ratings: {
      type: RatingAveragesSchema,
      required: true,
    },
    metrics: {
      type: FeedbackMetricsSchema,
      required: true,
    },
    
    // Trend data
    trends: [TrendDataSchema],
    
    // Comparative data
    previousPeriodRatings: {
      type: RatingAveragesSchema,
    },
    benchmarkRatings: {
      type: RatingAveragesSchema,
    },
    
    // Additional insights
    topStrengths: [{
      type: String,
      maxlength: 200,
    }],
    improvementAreas: [{
      type: String,
      maxlength: 200,
    }],
    commonChallenges: [{
      type: String,
      maxlength: 200,
    }],
    
    // Goal tracking
    sessionGoalsMetPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    clientRetentionRate: {
      type: Number,
      min: 0,
      max: 100,
    },
    recommendationScore: {
      type: Number,
      min: -100,
      max: 100,
      default: 0,
    },
    
    // Calculation metadata
    lastCalculated: {
      type: Date,
      required: true,
      index: true,
    },
    dataVersion: {
      type: Number,
      default: 1,
      min: 1,
    },
    sampleSize: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { 
    timestamps: true,
  }
);

// Compound indexes for efficient querying
FeedbackAnalyticsSchema.index({ 
  entityId: 1, 
  entityType: 1, 
  timePeriod: 1, 
  periodStart: -1 
}, { unique: true }); // Unique analytics record per entity/type/period/date

FeedbackAnalyticsSchema.index({ entityType: 1, timePeriod: 1, lastCalculated: -1 });
FeedbackAnalyticsSchema.index({ entityId: 1, timePeriod: 1, periodEnd: -1 });
FeedbackAnalyticsSchema.index({ 'ratings.overall': -1, entityType: 1 }); // Top performers
FeedbackAnalyticsSchema.index({ recommendationScore: -1, entityType: 1 }); // NPS tracking

// Virtual for calculating improvement trend
FeedbackAnalyticsSchema.virtual('improvementTrend').get(function() {
  if (!this.previousPeriodRatings) return null;
  
  const current = this.ratings.overall;
  const previous = this.previousPeriodRatings.overall;
  
  if (previous === 0) return null;
  
  return ((current - previous) / previous) * 100;
});

// Virtual for calculating benchmark comparison
FeedbackAnalyticsSchema.virtual('benchmarkComparison').get(function() {
  if (!this.benchmarkRatings) return null;
  
  const current = this.ratings.overall;
  const benchmark = this.benchmarkRatings.overall;
  
  if (benchmark === 0) return null;
  
  return ((current - benchmark) / benchmark) * 100;
});

// Virtual for performance category
FeedbackAnalyticsSchema.virtual('performanceCategory').get(function() {
  const overall = this.ratings.overall;
  
  if (overall >= 4.5) return 'excellent';
  if (overall >= 4.0) return 'good';
  if (overall >= 3.5) return 'average';
  if (overall >= 3.0) return 'below_average';
  return 'needs_improvement';
});

// Virtual for trending direction
FeedbackAnalyticsSchema.virtual('trendDirection').get(function() {
  if (this.trends.length < 2) return 'stable';
  
  const recent = this.trends[this.trends.length - 1];
  const previous = this.trends[this.trends.length - 2];
  
  const diff = recent.ratings.overall - previous.ratings.overall;
  
  if (diff > 0.1) return 'improving';
  if (diff < -0.1) return 'declining';
  return 'stable';
});

// Ensure virtuals are included in JSON output
FeedbackAnalyticsSchema.set('toJSON', { virtuals: true });

export const FeedbackAnalytics = model<IFeedbackAnalytics>('FeedbackAnalytics', FeedbackAnalyticsSchema); 