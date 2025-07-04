export interface ICoachAvailability {
  id: string;
  coachId: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  timezone: string;
  isRecurring: boolean;
  recurringPattern?: 'weekly' | 'biweekly' | 'monthly';
  specificDate?: Date;
  isAvailable: boolean;
  maxSessionsPerDay?: number;
  sessionDuration?: number; // in minutes
  bufferTime?: number; // in minutes between sessions
  unavailableDates?: Date[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class CoachAvailability implements ICoachAvailability {
  id: string;
  coachId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
  isRecurring: boolean;
  recurringPattern?: 'weekly' | 'biweekly' | 'monthly';
  specificDate?: Date;
  isAvailable: boolean;
  maxSessionsPerDay?: number;
  sessionDuration?: number;
  bufferTime?: number;
  unavailableDates?: Date[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: ICoachAvailability) {
    this.id = data.id;
    this.coachId = data.coachId;
    this.dayOfWeek = data.dayOfWeek;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.timezone = data.timezone;
    this.isRecurring = data.isRecurring ?? true;
    this.recurringPattern = data.recurringPattern ?? 'weekly';
    this.specificDate = data.specificDate;
    this.isAvailable = data.isAvailable ?? true;
    this.maxSessionsPerDay = data.maxSessionsPerDay;
    this.sessionDuration = data.sessionDuration ?? 60;
    this.bufferTime = data.bufferTime ?? 15;
    this.unavailableDates = data.unavailableDates ?? [];
    this.notes = data.notes;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  isAvailableOnDate(date: Date): boolean {
    if (!this.isAvailable) return false;
    
    // Check if the date is in unavailable dates
    if (this.unavailableDates?.some(unavailableDate => 
      unavailableDate.toDateString() === date.toDateString())) {
      return false;
    }

    // Check if day of week matches
    if (date.getDay() !== this.dayOfWeek) return false;

    return true;
  }

  getAvailableSlots(date: Date): string[] {
    if (!this.isAvailableOnDate(date)) return [];

    const slots: string[] = [];
    const startHour = parseInt(this.startTime.split(':')[0]);
    const startMinute = parseInt(this.startTime.split(':')[1]);
    const endHour = parseInt(this.endTime.split(':')[0]);
    const endMinute = parseInt(this.endTime.split(':')[1]);

    const sessionDuration = this.sessionDuration || 60;
    const bufferTime = this.bufferTime || 15;
    const slotDuration = sessionDuration + bufferTime;

    let currentTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    while (currentTime + sessionDuration <= endTime) {
      const hour = Math.floor(currentTime / 60);
      const minute = currentTime % 60;
      const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(timeSlot);
      currentTime += slotDuration;
    }

    return slots;
  }
} 