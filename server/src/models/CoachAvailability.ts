import mongoose, { Document, Schema, Model } from 'mongoose';

// Interface for recurring availability pattern
export interface IRecurringAvailability {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // Format: "HH:mm" (24-hour format)
  endTime: string; // Format: "HH:mm" (24-hour format)
  isActive: boolean;
}

// Interface for specific date availability override
export interface IDateOverride {
  date: Date;
  isAvailable: boolean;
  timeSlots?: {
    startTime: string;
    endTime: string;
  }[];
  reason?: string; // e.g., "vacation", "sick", "personal"
}

// Interface for buffer time settings
export interface IBufferSettings {
  beforeSession: number; // minutes
  afterSession: number; // minutes
  betweenSessions: number; // minutes
}

// Main coach availability interface
export interface ICoachAvailability extends Document {
  coachId: mongoose.Types.ObjectId;
  timezone: string; // e.g., "America/New_York", "Asia/Jerusalem"
  
  // Recurring weekly availability
  recurringAvailability: IRecurringAvailability[];
  
  // Specific date overrides (vacations, sick days, etc.)
  dateOverrides: IDateOverride[];
  
  // Buffer time settings
  bufferSettings: IBufferSettings;
  
  // Session duration preferences
  defaultSessionDuration: number; // minutes
  allowedDurations: number[]; // array of allowed durations in minutes
  
  // Booking settings
  advanceBookingDays: number; // how many days in advance clients can book
  lastMinuteBookingHours: number; // minimum hours before session can be booked
  
  // Auto-accept settings
  autoAcceptBookings: boolean;
  requireApproval: boolean;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual properties
  isCurrentlyAvailable: boolean;
  
  // Methods
  getAvailableSlots(startDate: Date, endDate: Date, sessionDuration?: number): Date[];
}

// Recurring availability schema
const RecurringAvailabilitySchema = new Schema<IRecurringAvailability>({
  dayOfWeek: {
    type: Number,
    required: true,
    min: 0,
    max: 6,
  },
  startTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
  },
  endTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

// Date override schema
const DateOverrideSchema = new Schema<IDateOverride>({
  date: {
    type: Date,
    required: true,
  },
  isAvailable: {
    type: Boolean,
    required: true,
  },
  timeSlots: [{
    startTime: {
      type: String,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    },
    endTime: {
      type: String,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    },
  }],
  reason: {
    type: String,
    enum: ['vacation', 'sick', 'personal', 'training', 'other'],
  },
});

// Buffer settings schema
const BufferSettingsSchema = new Schema<IBufferSettings>({
  beforeSession: {
    type: Number,
    default: 15,
    min: 0,
    max: 60,
  },
  afterSession: {
    type: Number,
    default: 15,
    min: 0,
    max: 60,
  },
  betweenSessions: {
    type: Number,
    default: 30,
    min: 0,
    max: 120,
  },
});

// Main coach availability schema
const CoachAvailabilitySchema = new Schema<ICoachAvailability>(
  {
    coachId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    timezone: {
      type: String,
      required: true,
      default: 'UTC',
    },
    recurringAvailability: [RecurringAvailabilitySchema],
    dateOverrides: [DateOverrideSchema],
    bufferSettings: {
      type: BufferSettingsSchema,
      default: () => ({}),
    },
    defaultSessionDuration: {
      type: Number,
      default: 60,
      min: 15,
      max: 240,
    },
    allowedDurations: {
      type: [Number],
      default: [30, 45, 60, 90, 120],
      validate: {
        validator: function(durations: number[]) {
          return durations.every(d => d >= 15 && d <= 240);
        },
        message: 'All durations must be between 15 and 240 minutes',
      },
    },
    advanceBookingDays: {
      type: Number,
      default: 30,
      min: 1,
      max: 365,
    },
    lastMinuteBookingHours: {
      type: Number,
      default: 24,
      min: 1,
      max: 168, // 1 week
    },
    autoAcceptBookings: {
      type: Boolean,
      default: false,
    },
    requireApproval: {
      type: Boolean,
      default: true,
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for efficient querying
// Removed duplicate single-field index; unique field already indexed

// Virtual for getting current availability status
CoachAvailabilitySchema.virtual('isCurrentlyAvailable').get(function() {
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  // Check for date override first
  const todayOverride = this.dateOverrides.find(override => 
    override.date.toDateString() === now.toDateString()
  );
  
  if (todayOverride) {
    return todayOverride.isAvailable;
  }
  
  // Check recurring availability
  const todayAvailability = this.recurringAvailability.find(avail => 
    avail.dayOfWeek === currentDay && avail.isActive
  );
  
  if (!todayAvailability) {
    return false;
  }
  
  return currentTime >= todayAvailability.startTime && currentTime <= todayAvailability.endTime;
});

// Method to get available slots for a specific date range
CoachAvailabilitySchema.methods.getAvailableSlots = function(
  startDate: Date,
  endDate: Date,
  sessionDuration: number = this.defaultSessionDuration
) {
  const slots: Date[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    const dateString = current.toDateString();
    
    // Check for date override
    const override = this.dateOverrides.find(o => 
      o.date.toDateString() === dateString
    );
    
    if (override) {
      if (override.isAvailable && override.timeSlots) {
        // Use specific time slots from override
        override.timeSlots.forEach(slot => {
          const slotStart = new Date(current);
          const [hours, minutes] = slot.startTime.split(':').map(Number);
          slotStart.setHours(hours, minutes, 0, 0);
          slots.push(new Date(slotStart));
        });
      }
    } else {
      // Use recurring availability
      const recurringSlot = this.recurringAvailability.find(r => 
        r.dayOfWeek === dayOfWeek && r.isActive
      );
      
      if (recurringSlot) {
        const [startHours, startMinutes] = recurringSlot.startTime.split(':').map(Number);
        const [endHours, endMinutes] = recurringSlot.endTime.split(':').map(Number);
        
        const slotStart = new Date(current);
        slotStart.setHours(startHours, startMinutes, 0, 0);
        
        const slotEnd = new Date(current);
        slotEnd.setHours(endHours, endMinutes, 0, 0);
        
        // Generate slots every 30 minutes within the available time
        const currentSlot = new Date(slotStart);
        while (currentSlot.getTime() + (sessionDuration * 60 * 1000) <= slotEnd.getTime()) {
          slots.push(new Date(currentSlot));
          currentSlot.setMinutes(currentSlot.getMinutes() + 30);
        }
      }
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  return slots;
};

// Export the model
export const CoachAvailability: Model<ICoachAvailability> = mongoose.model<ICoachAvailability>('CoachAvailability', CoachAvailabilitySchema); 