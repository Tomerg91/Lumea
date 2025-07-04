export interface IRecurringAvailability {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface IDateOverride {
  date: Date;
  isAvailable: boolean;
  timeSlots?: Array<{ startTime: string; endTime: string }>;
  reason?: string;
}

export interface ICoachAvailability {
  coachId: string;
  timezone: string;
  recurringAvailability: IRecurringAvailability[];
  dateOverrides: IDateOverride[];
  bufferSettings: {
    beforeSession: number;
    afterSession: number;
    betweenSessions: number;
  };
  defaultSessionDuration: number;
  allowedDurations: number[];
  advanceBookingDays: number;
  lastMinuteBookingHours: number;
  autoAcceptBookings: boolean;
  requireApproval: boolean;
}

export interface AvailableSlot {
  start: Date;
  end: Date;
  duration: number;
  isAvailable: boolean;
  conflictReason?: string;
}

export interface CreateAvailabilityData {
  coachId: string;
  timezone?: string;
  recurringAvailability?: IRecurringAvailability[];
  bufferSettings?: {
    beforeSession?: number;
    afterSession?: number;
    betweenSessions?: number;
  };
  defaultSessionDuration?: number;
  allowedDurations?: number[];
  advanceBookingDays?: number;
  lastMinuteBookingHours?: number;
  autoAcceptBookings?: boolean;
  requireApproval?: boolean;
}

export interface UpdateAvailabilityData extends Partial<CreateAvailabilityData> {
  dateOverrides?: IDateOverride[];
}

export class AvailabilityService {
  /**
   * Create or update coach availability settings
   */
  static async createOrUpdateAvailability(data: CreateAvailabilityData): Promise<ICoachAvailability> {
    const existingAvailability = await CoachAvailability.findOne({ coachId: data.coachId });
    
    if (existingAvailability) {
      // Update existing availability
      Object.assign(existingAvailability, data);
      return await existingAvailability.save();
    } else {
      // Create new availability
      const availability = new CoachAvailability(data);
      return await availability.save();
    }
  }

  /**
   * Get coach availability settings
   */
  static async getCoachAvailability(coachId: string): Promise<ICoachAvailability | null> {
    return await CoachAvailability.findOne({ coachId }).populate('coachId', 'firstName lastName email');
  }

  /**
   * Update specific aspects of coach availability
   */
  static async updateAvailability(coachId: string, updates: UpdateAvailabilityData): Promise<ICoachAvailability | null> {
    return await CoachAvailability.findOneAndUpdate(
      { coachId },
      { $set: updates },
      { new: true, runValidators: true }
    );
  }

  /**
   * Add or update recurring availability for specific days
   */
  static async updateRecurringAvailability(
    coachId: string, 
    recurringAvailability: IRecurringAvailability[]
  ): Promise<ICoachAvailability | null> {
    const availability = await CoachAvailability.findOne({ coachId });
    if (!availability) {
      throw new Error('Coach availability not found');
    }

    // Replace existing recurring availability
    availability.recurringAvailability = recurringAvailability;
    return await availability.save();
  }

  /**
   * Add date override (vacation, sick day, etc.)
   */
  static async addDateOverride(
    coachId: string, 
    dateOverride: IDateOverride
  ): Promise<ICoachAvailability | null> {
    const availability = await CoachAvailability.findOne({ coachId });
    if (!availability) {
      throw new Error('Coach availability not found');
    }

    // Remove existing override for the same date
    availability.dateOverrides = availability.dateOverrides.filter(
      override => override.date.toDateString() !== dateOverride.date.toDateString()
    );

    // Add new override
    availability.dateOverrides.push(dateOverride);
    return await availability.save();
  }

  /**
   * Remove date override
   */
  static async removeDateOverride(coachId: string, date: Date): Promise<ICoachAvailability | null> {
    return await CoachAvailability.findOneAndUpdate(
      { coachId },
      { 
        $pull: { 
          dateOverrides: { 
            date: {
              $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
              $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
            }
          } 
        } 
      },
      { new: true }
    );
  }

  /**
   * Get available time slots for a coach within a date range
   */
  static async getAvailableSlots(
    coachId: string,
    startDate: Date,
    endDate: Date,
    sessionDuration?: number,
    excludeSessionId?: string
  ): Promise<AvailableSlot[]> {
    const availability = await CoachAvailability.findOne({ coachId });
    if (!availability) {
      throw new Error('Coach availability not found');
    }

    const duration = sessionDuration || availability.defaultSessionDuration;
    const slots: AvailableSlot[] = [];

    // Get existing sessions in the date range
    const existingSessions = await CoachingSession.find({
      coachId: new Types.ObjectId(coachId),
      date: { $gte: startDate, $lte: endDate },
      status: { $in: ['pending', 'in-progress', 'rescheduled'] },
      ...(excludeSessionId && { _id: { $ne: new Types.ObjectId(excludeSessionId) } })
    }).select('date duration');

    // Generate potential slots based on availability
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      const dateString = current.toDateString();

      // Check for date override first
      const override = availability.dateOverrides.find(o => 
        o.date.toDateString() === dateString
      );

      const daySlots: Date[] = [];

      if (override) {
        if (override.isAvailable && override.timeSlots) {
          // Use specific time slots from override
          override.timeSlots.forEach(slot => {
            const slotStart = new Date(current);
            const [hours, minutes] = slot.startTime.split(':').map(Number);
            slotStart.setHours(hours, minutes, 0, 0);
            daySlots.push(new Date(slotStart));
          });
        }
        // If override exists but isAvailable is false, no slots for this day
      } else {
        // Use recurring availability
        const recurringSlot = availability.recurringAvailability.find(r => 
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
          while (currentSlot.getTime() + (duration * 60 * 1000) <= slotEnd.getTime()) {
            daySlots.push(new Date(currentSlot));
            currentSlot.setMinutes(currentSlot.getMinutes() + 30);
          }
        }
      }

      // Check each potential slot against existing sessions and buffer times
      daySlots.forEach(slotStart => {
        const slotEnd = new Date(slotStart.getTime() + (duration * 60 * 1000));
        let isAvailable = true;
        let conflictReason: string | undefined;

        // Check for conflicts with existing sessions
        const hasConflict = existingSessions.some(session => {
          const sessionStart = new Date(session.date);
          const sessionEnd = new Date(sessionStart.getTime() + ((session.duration || 60) * 60 * 1000));
          
          // Add buffer time
          const bufferBefore = availability.bufferSettings.beforeSession * 60 * 1000;
          const bufferAfter = availability.bufferSettings.afterSession * 60 * 1000;
          
          const sessionStartWithBuffer = new Date(sessionStart.getTime() - bufferBefore);
          const sessionEndWithBuffer = new Date(sessionEnd.getTime() + bufferAfter);

          return (slotStart < sessionEndWithBuffer && slotEnd > sessionStartWithBuffer);
        });

        if (hasConflict) {
          isAvailable = false;
          conflictReason = 'Conflicts with existing session';
        }

        // Check advance booking and last-minute booking restrictions
        const now = new Date();
        const hoursUntilSlot = (slotStart.getTime() - now.getTime()) / (1000 * 60 * 60);
        const daysUntilSlot = hoursUntilSlot / 24;

        if (daysUntilSlot > availability.advanceBookingDays) {
          isAvailable = false;
          conflictReason = 'Beyond advance booking limit';
        }

        if (hoursUntilSlot < availability.lastMinuteBookingHours) {
          isAvailable = false;
          conflictReason = 'Within last-minute booking restriction';
        }

        slots.push({
          start: new Date(slotStart),
          end: new Date(slotEnd),
          duration,
          isAvailable,
          conflictReason,
        });
      });

      current.setDate(current.getDate() + 1);
    }

    return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  /**
   * Check if a specific time slot is available
   */
  static async isSlotAvailable(
    coachId: string,
    startTime: Date,
    duration: number,
    excludeSessionId?: string
  ): Promise<{ isAvailable: boolean; reason?: string }> {
    const endTime = new Date(startTime.getTime() + (duration * 60 * 1000));
    
    const slots = await this.getAvailableSlots(
      coachId,
      startTime,
      endTime,
      duration,
      excludeSessionId
    );

    const exactSlot = slots.find(slot => 
      slot.start.getTime() === startTime.getTime() && 
      slot.duration === duration
    );

    if (!exactSlot) {
      return { isAvailable: false, reason: 'No availability configured for this time' };
    }

    return { 
      isAvailable: exactSlot.isAvailable, 
      reason: exactSlot.conflictReason 
    };
  }

  /**
   * Get coach's current availability status
   */
  static async getCurrentAvailabilityStatus(coachId: string): Promise<{
    isCurrentlyAvailable: boolean;
    nextAvailableSlot?: Date;
    currentSessionEnd?: Date;
  }> {
    const availability = await CoachAvailability.findOne({ coachId });
    if (!availability) {
      return { isCurrentlyAvailable: false };
    }

    const now = new Date();
    const isCurrentlyAvailable = availability.isCurrentlyAvailable;

    // Find next available slot in the next 7 days
    const nextWeek = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
    const slots = await this.getAvailableSlots(coachId, now, nextWeek);
    const nextAvailableSlot = slots.find(slot => slot.isAvailable && slot.start > now)?.start;

    // Check if coach is currently in a session
    const currentSession = await CoachingSession.findOne({
      coachId: new Types.ObjectId(coachId),
      status: 'in-progress',
      date: { $lte: now },
    });

    let currentSessionEnd: Date | undefined;
    if (currentSession) {
      currentSessionEnd = new Date(
        currentSession.date.getTime() + ((currentSession.duration || 60) * 60 * 1000)
      );
    }

    return {
      isCurrentlyAvailable,
      nextAvailableSlot,
      currentSessionEnd,
    };
  }

  /**
   * Delete coach availability settings
   */
  static async deleteAvailability(coachId: string): Promise<boolean> {
    console.warn('deleteAvailability is a placeholder. Implement with Supabase.');
    return false;
  }
} 