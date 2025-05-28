import { API_BASE_URL } from '../lib/api';

// Create a simple API client similar to axios
const api = {
  async get(endpoint: string) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(errorData.message || `HTTP error ${response.status}`);
    }

    return response.json();
  },

  async post(endpoint: string, data?: any) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      credentials: 'include',
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(errorData.message || `HTTP error ${response.status}`);
    }

    return response.json();
  },

  async put(endpoint: string, data?: any) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      credentials: 'include',
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(errorData.message || `HTTP error ${response.status}`);
    }

    return response.json();
  },

  async delete(endpoint: string) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(errorData.message || `HTTP error ${response.status}`);
    }

    return response.json();
  },
};

export interface RecurringAvailability {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // Format: "HH:mm"
  endTime: string; // Format: "HH:mm"
  isActive: boolean;
}

export interface DateOverride {
  date: string; // ISO date string
  isAvailable: boolean;
  timeSlots?: {
    startTime: string;
    endTime: string;
  }[];
  reason?: 'vacation' | 'sick' | 'personal' | 'training' | 'other';
}

export interface BufferSettings {
  beforeSession: number; // minutes
  afterSession: number; // minutes
  betweenSessions: number; // minutes
}

export interface CoachAvailability {
  _id: string;
  coachId: string;
  timezone: string;
  recurringAvailability: RecurringAvailability[];
  dateOverrides: DateOverride[];
  bufferSettings: BufferSettings;
  defaultSessionDuration: number;
  allowedDurations: number[];
  advanceBookingDays: number;
  lastMinuteBookingHours: number;
  autoAcceptBookings: boolean;
  requireApproval: boolean;
  createdAt: string;
  updatedAt: string;
  isCurrentlyAvailable?: boolean;
}

export interface AvailableSlot {
  start: string; // ISO date string
  end: string; // ISO date string
  duration: number;
  isAvailable: boolean;
  conflictReason?: string;
}

export interface AvailabilityStatus {
  isCurrentlyAvailable: boolean;
  nextAvailableSlot?: string; // ISO date string
  currentSessionEnd?: string; // ISO date string
}

export interface CreateAvailabilityData {
  timezone?: string;
  recurringAvailability?: RecurringAvailability[];
  bufferSettings?: BufferSettings;
  defaultSessionDuration?: number;
  allowedDurations?: number[];
  advanceBookingDays?: number;
  lastMinuteBookingHours?: number;
  autoAcceptBookings?: boolean;
  requireApproval?: boolean;
}

export interface UpdateAvailabilityData extends CreateAvailabilityData {
  dateOverrides?: DateOverride[];
}

class AvailabilityService {
  /**
   * Get coach availability settings
   */
  async getCoachAvailability(coachId: string): Promise<CoachAvailability> {
    const response = await api.get(`/availability/${coachId}`);
    return response.data.data;
  }

  /**
   * Create or update coach availability settings
   */
  async createOrUpdateAvailability(data: CreateAvailabilityData): Promise<CoachAvailability> {
    const response = await api.post('/availability', data);
    return response.data.data;
  }

  /**
   * Update recurring availability
   */
  async updateRecurringAvailability(
    coachId: string,
    recurringAvailability: RecurringAvailability[]
  ): Promise<CoachAvailability> {
    const response = await api.put(`/availability/${coachId}/recurring`, {
      recurringAvailability,
    });
    return response.data.data;
  }

  /**
   * Add date override (vacation, sick day, etc.)
   */
  async addDateOverride(coachId: string, dateOverride: DateOverride): Promise<CoachAvailability> {
    const response = await api.post(`/availability/${coachId}/date-override`, dateOverride);
    return response.data.data;
  }

  /**
   * Remove date override
   */
  async removeDateOverride(coachId: string, date: string): Promise<CoachAvailability> {
    const response = await api.delete(`/availability/${coachId}/date-override/${date}`);
    return response.data.data;
  }

  /**
   * Get available time slots for a coach
   */
  async getAvailableSlots(
    coachId: string,
    startDate: string,
    endDate: string,
    duration?: number,
    excludeSessionId?: string
  ): Promise<{
    slots: AvailableSlot[];
    totalSlots: number;
    availableSlots: number;
  }> {
    const params = new URLSearchParams({
      startDate,
      endDate,
      ...(duration && { duration: duration.toString() }),
      ...(excludeSessionId && { excludeSessionId }),
    });

    const response = await api.get(`/availability/${coachId}/slots?${params}`);
    return response.data.data;
  }

  /**
   * Get coach's current availability status
   */
  async getAvailabilityStatus(coachId: string): Promise<AvailabilityStatus> {
    const response = await api.get(`/availability/${coachId}/status`);
    return response.data.data;
  }

  /**
   * Check if a specific time slot is available
   */
  async checkSlotAvailability(
    coachId: string,
    startTime: string,
    duration: number,
    excludeSessionId?: string
  ): Promise<{ isAvailable: boolean; reason?: string }> {
    const response = await api.post(`/availability/${coachId}/check-slot`, {
      startTime,
      duration,
      ...(excludeSessionId && { excludeSessionId }),
    });
    return response.data.data;
  }

  /**
   * Delete coach availability settings
   */
  async deleteAvailability(coachId: string): Promise<void> {
    await api.delete(`/availability/${coachId}`);
  }

  /**
   * Helper method to get day name from day of week number
   */
  getDayName(dayOfWeek: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek] || 'Unknown';
  }

  /**
   * Helper method to format time for display
   */
  formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  /**
   * Helper method to get default availability for a new coach
   */
  getDefaultAvailability(): CreateAvailabilityData {
    return {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      recurringAvailability: [
        // Monday to Friday, 9 AM to 5 PM
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isActive: true },
        { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', isActive: true },
        { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', isActive: true },
        { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', isActive: true },
        { dayOfWeek: 5, startTime: '09:00', endTime: '17:00', isActive: true },
      ],
      bufferSettings: {
        beforeSession: 15,
        afterSession: 15,
        betweenSessions: 30,
      },
      defaultSessionDuration: 60,
      allowedDurations: [30, 45, 60, 90, 120],
      advanceBookingDays: 30,
      lastMinuteBookingHours: 24,
      autoAcceptBookings: false,
      requireApproval: true,
    };
  }
}

export const availabilityService = new AvailabilityService(); 