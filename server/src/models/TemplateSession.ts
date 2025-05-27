import { Schema, model, Document, Types, Model } from 'mongoose';
import { ISessionTemplate } from './SessionTemplate';
import { ICoachingSession } from './CoachingSession';

export type GenerationStatus = 'pending' | 'generated' | 'failed' | 'cancelled';

export interface ITemplateSession extends Document {
  templateId: Types.ObjectId | ISessionTemplate;
  sessionId: Types.ObjectId | ICoachingSession;
  coachId: Types.ObjectId;
  clientId: Types.ObjectId;
  
  // Generation tracking
  generationStatus: GenerationStatus;
  generatedAt: Date;
  generatedBy: Types.ObjectId; // User who triggered generation
  
  // Template snapshot at time of generation
  templateSnapshot: {
    name: string;
    version: number;
    structure: any[]; // Snapshot of template structure
    objectives: string[];
    defaultDuration: number;
  };
  
  // Customizations applied during generation
  appliedCustomizations?: {
    duration?: number;
    structure?: any[];
    objectives?: string[];
    notes?: string;
    customFields?: Record<string, any>;
  };
  
  // Recurring session tracking
  isFromRecurrence: boolean;
  recurrenceSequence?: number; // Which occurrence in the series (1st, 2nd, etc.)
  parentRecurrenceId?: Types.ObjectId; // Reference to the original recurring template session
  
  // Generation metadata
  generationMetadata?: {
    source: 'manual' | 'automatic' | 'bulk';
    batchId?: string; // For bulk generation operations
    scheduledDate?: Date; // When this session was scheduled to be generated
    errors?: string[]; // Any errors during generation
  };
  
  // Audit trail
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  markAsGenerated(): Promise<ITemplateSession>;
  markAsFailed(errors: string[]): Promise<ITemplateSession>;
  getRecurrenceSiblings(): Promise<ITemplateSession[]>;
}

export interface ITemplateSessionModel extends Model<ITemplateSession> {
  findByTemplate(templateId: Types.ObjectId, options?: any): Promise<ITemplateSession[]>;
  findRecurrenceSeries(parentRecurrenceId: Types.ObjectId): Promise<ITemplateSession[]>;
  getTemplateUsageStats(templateId: Types.ObjectId): Promise<any[]>;
  findByBatch(batchId: string): Promise<ITemplateSession[]>;
}

const TemplateSnapshotSchema = new Schema({
  name: {
    type: String,
    required: true,
    maxlength: 200,
  },
  version: {
    type: Number,
    required: true,
    min: 1,
  },
  structure: [{
    type: Schema.Types.Mixed,
  }],
  objectives: [{
    type: String,
    maxlength: 500,
  }],
  defaultDuration: {
    type: Number,
    required: true,
    min: 15,
    max: 480,
  },
}, { _id: false });

const AppliedCustomizationsSchema = new Schema({
  duration: {
    type: Number,
    min: 15,
    max: 480,
  },
  structure: [{
    type: Schema.Types.Mixed,
  }],
  objectives: [{
    type: String,
    maxlength: 500,
  }],
  notes: {
    type: String,
    maxlength: 2000,
  },
  customFields: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, { _id: false });

const GenerationMetadataSchema = new Schema({
  source: {
    type: String,
    enum: ['manual', 'automatic', 'bulk'],
    required: true,
  },
  batchId: {
    type: String,
    maxlength: 100,
  },
  scheduledDate: {
    type: Date,
  },
  errors: [{
    type: String,
    maxlength: 1000,
  }],
}, { _id: false });

const TemplateSessionSchema = new Schema<ITemplateSession>(
  {
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'SessionTemplate',
      required: true,
      index: true,
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'CoachingSession',
      required: true,
      unique: true, // One template session record per actual session
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
    generationStatus: {
      type: String,
      enum: ['pending', 'generated', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    generatedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    templateSnapshot: {
      type: TemplateSnapshotSchema,
      required: true,
    },
    appliedCustomizations: {
      type: AppliedCustomizationsSchema,
    },
    isFromRecurrence: {
      type: Boolean,
      default: false,
      index: true,
    },
    recurrenceSequence: {
      type: Number,
      min: 1,
    },
    parentRecurrenceId: {
      type: Schema.Types.ObjectId,
      ref: 'TemplateSession',
    },
    generationMetadata: {
      type: GenerationMetadataSchema,
    },
  },
  { 
    timestamps: true,
  }
);

// Compound indexes for efficient querying
TemplateSessionSchema.index({ templateId: 1, generatedAt: -1 });
TemplateSessionSchema.index({ coachId: 1, generatedAt: -1 });
TemplateSessionSchema.index({ clientId: 1, generatedAt: -1 });
TemplateSessionSchema.index({ isFromRecurrence: 1, parentRecurrenceId: 1 });
TemplateSessionSchema.index({ generationStatus: 1, generatedAt: -1 });

// Index for batch operations
TemplateSessionSchema.index({ 'generationMetadata.batchId': 1 });

// Virtual for session reference
TemplateSessionSchema.virtual('session', {
  ref: 'CoachingSession',
  localField: 'sessionId',
  foreignField: '_id',
  justOne: true,
});

// Virtual for template reference
TemplateSessionSchema.virtual('template', {
  ref: 'SessionTemplate',
  localField: 'templateId',
  foreignField: '_id',
  justOne: true,
});

// Instance methods
TemplateSessionSchema.methods.markAsGenerated = function() {
  this.generationStatus = 'generated';
  this.generatedAt = new Date();
  return this.save();
};

TemplateSessionSchema.methods.markAsFailed = function(errors: string[]) {
  this.generationStatus = 'failed';
  if (!this.generationMetadata) {
    this.generationMetadata = { source: 'manual' };
  }
  this.generationMetadata.errors = errors;
  return this.save();
};

TemplateSessionSchema.methods.getRecurrenceSiblings = function() {
  if (!this.isFromRecurrence || !this.parentRecurrenceId) {
    return Promise.resolve([]);
  }
  
  return this.constructor.find({
    parentRecurrenceId: this.parentRecurrenceId,
    _id: { $ne: this._id }
  }).sort({ recurrenceSequence: 1 });
};

// Static methods
TemplateSessionSchema.statics.findByTemplate = function(templateId: Types.ObjectId, options: any = {}) {
  const query: any = { templateId };
  
  if (options.status) query.generationStatus = options.status;
  if (options.coachId) query.coachId = options.coachId;
  if (options.clientId) query.clientId = options.clientId;
  if (options.isFromRecurrence !== undefined) query.isFromRecurrence = options.isFromRecurrence;
  
  return this.find(query)
    .populate('sessionId')
    .sort(options.sortBy || { generatedAt: -1 })
    .limit(options.limit || 50);
};

TemplateSessionSchema.statics.findRecurrenceSeries = function(parentRecurrenceId: Types.ObjectId) {
  return this.find({ parentRecurrenceId })
    .populate('sessionId')
    .sort({ recurrenceSequence: 1 });
};

TemplateSessionSchema.statics.getTemplateUsageStats = function(templateId: Types.ObjectId) {
  return this.aggregate([
    { $match: { templateId } },
    {
      $group: {
        _id: '$generationStatus',
        count: { $sum: 1 },
        lastGenerated: { $max: '$generatedAt' }
      }
    }
  ]);
};

TemplateSessionSchema.statics.findByBatch = function(batchId: string) {
  return this.find({ 'generationMetadata.batchId': batchId })
    .populate('sessionId')
    .sort({ generatedAt: 1 });
};

export const TemplateSession = model<ITemplateSession, ITemplateSessionModel>('TemplateSession', TemplateSessionSchema); 