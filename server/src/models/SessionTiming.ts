import { Schema, model, Document, Types } from 'mongoose';

export type TimerStatus = 'stopped' | 'running' | 'paused';

export interface ITimerPause {
  pausedAt: Date;
  resumedAt?: Date;
  pauseDuration?: number; // Duration in seconds
}

export interface IDurationAdjustment {
  originalDuration: number; // Duration in seconds
  adjustedDuration: number; // Duration in seconds
  reason?: string;
  adjustedBy: Types.ObjectId;
  adjustedAt: Date;
}

export interface ISessionTiming extends Document {
  sessionId: Types.ObjectId;
  
  // Timer state
  timerStatus: TimerStatus;
  
  // Timing data
  startTime?: Date;
  endTime?: Date;
  
  // Pause tracking
  pauses: ITimerPause[];
  totalPausedTime: number; // Total paused time in seconds
  
  // Duration calculations
  actualDuration: number; // Actual recorded time in seconds (excluding pauses)
  adjustedDuration?: number; // Manually adjusted duration in seconds
  
  // Adjustment history
  adjustments: IDurationAdjustment[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const TimerPauseSchema = new Schema({
  pausedAt: {
    type: Date,
    required: true,
  },
  resumedAt: {
    type: Date,
  },
  pauseDuration: {
    type: Number, // Duration in seconds
    min: 0,
  },
}, { _id: false });

const DurationAdjustmentSchema = new Schema({
  originalDuration: {
    type: Number, // Duration in seconds
    required: true,
    min: 0,
  },
  adjustedDuration: {
    type: Number, // Duration in seconds
    required: true,
    min: 0,
  },
  reason: {
    type: String,
    maxlength: 500,
  },
  adjustedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  adjustedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
}, { _id: false });

const SessionTimingSchema = new Schema<ISessionTiming>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'CoachingSession',
      required: true,
      unique: true, // One timing record per session
      index: true,
    },
    timerStatus: {
      type: String,
      enum: ['stopped', 'running', 'paused'],
      default: 'stopped',
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    pauses: [TimerPauseSchema],
    totalPausedTime: {
      type: Number, // Total paused time in seconds
      default: 0,
      min: 0,
    },
    actualDuration: {
      type: Number, // Actual recorded time in seconds
      default: 0,
      min: 0,
    },
    adjustedDuration: {
      type: Number, // Manually adjusted duration in seconds
      min: 0,
    },
    adjustments: [DurationAdjustmentSchema],
  },
  { timestamps: true }
);

// Add index for efficient querying by session
SessionTimingSchema.index({ sessionId: 1 });

// Add virtual for getting current active duration
SessionTimingSchema.virtual('currentDuration').get(function() {
  if (this.timerStatus === 'stopped') {
    return this.adjustedDuration || this.actualDuration;
  }
  
  if (!this.startTime) {
    return 0;
  }
  
  const now = new Date();
  const elapsed = Math.floor((now.getTime() - this.startTime.getTime()) / 1000);
  return Math.max(0, elapsed - this.totalPausedTime);
});

// Add method to calculate total duration including adjustments
SessionTimingSchema.methods.getTotalDuration = function(): number {
  return this.adjustedDuration || this.actualDuration;
};

// Add method to format duration as minutes
SessionTimingSchema.methods.getDurationInMinutes = function(): number {
  return Math.round(this.getTotalDuration() / 60);
};

// Pre-save middleware to calculate actual duration when timer is stopped
SessionTimingSchema.pre('save', function(next) {
  if (this.timerStatus === 'stopped' && this.startTime && this.endTime) {
    const totalTime = Math.floor((this.endTime.getTime() - this.startTime.getTime()) / 1000);
    this.actualDuration = Math.max(0, totalTime - this.totalPausedTime);
  }
  next();
});

export const SessionTiming = model<ISessionTiming>('SessionTiming', SessionTimingSchema); 