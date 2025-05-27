import { API_BASE_URL } from '../lib/api';
import { SessionTemplate, RecurrenceConfig } from '../types/sessionTemplate';
import { addDays, addWeeks, addMonths, addQuarters, isAfter, format } from 'date-fns';

/**
 * Performs a fetch request to the API.
 */
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include',
  };

  try {
    const response = await fetch(url, config);

    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.indexOf('application/json') !== -1) {
      data = await response.json();
    } else {
      const text = await response.text();
      if (response.ok) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text || 'Success' };
        }
      } else {
        data = { message: text || `HTTP error ${response.status}` };
      }
    }

    if (!response.ok) {
      throw new Error(data?.message || `HTTP error ${response.status}`);
    }

    return data as T;
  } catch (error) {
    console.error(`API fetch error for endpoint ${endpoint}:`, error);
    throw error;
  }
}

export interface RecurringSessionRequest {
  templateId: string;
  clientId: string;
  startDate: Date;
  endDate?: Date;
  maxOccurrences?: number;
  customizations?: Record<string, any>;
}

export interface GeneratedSession {
  id: string;
  templateId: string;
  clientId: string;
  scheduledDate: Date;
  duration: number;
  status: 'scheduled' | 'confirmed' | 'cancelled';
  notes?: string;
}

export interface RecurringSessionGenerationResult {
  success: boolean;
  generatedSessions: GeneratedSession[];
  skippedDates: Date[];
  conflicts: {
    date: Date;
    conflictingSessionId: string;
    reason: string;
  }[];
  totalGenerated: number;
  message: string;
}

class RecurringSessionService {
  private baseUrl = '/recurring-sessions';

  /**
   * Generate sessions from a recurring template
   */
  async generateRecurringSessions(request: RecurringSessionRequest): Promise<RecurringSessionGenerationResult> {
    try {
      return await apiFetch<RecurringSessionGenerationResult>(`${this.baseUrl}/generate`, {
        method: 'POST',
        body: JSON.stringify({
          ...request,
          startDate: request.startDate.toISOString(),
          endDate: request.endDate?.toISOString(),
        }),
      });
    } catch (error) {
      console.error('Error generating recurring sessions:', error);
      throw new Error('Failed to generate recurring sessions');
    }
  }

  /**
   * Preview recurring sessions without creating them
   */
  async previewRecurringSessions(
    template: SessionTemplate,
    startDate: Date,
    endDate?: Date,
    maxOccurrences?: number
  ): Promise<Date[]> {
    if (!template.isRecurring || !template.recurrenceConfig) {
      return [];
    }

    return this.calculateRecurringDates(
      template.recurrenceConfig,
      startDate,
      endDate,
      maxOccurrences
    );
  }

  /**
   * Calculate recurring dates based on recurrence configuration
   */
  private calculateRecurringDates(
    config: RecurrenceConfig,
    startDate: Date,
    endDate?: Date,
    maxOccurrences?: number
  ): Date[] {
    const dates: Date[] = [];
    let currentDate = new Date(startDate);
    
    // Use config end conditions if not overridden
    const finalEndDate = endDate || config.endDate;
    const finalMaxOccurrences = maxOccurrences || config.maxOccurrences;

    let occurrenceCount = 0;
    const maxAttempts = 365; // Prevent infinite loops
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;

      // Check end conditions
      if (finalEndDate && isAfter(currentDate, finalEndDate)) {
        break;
      }
      if (finalMaxOccurrences && occurrenceCount >= finalMaxOccurrences) {
        break;
      }

      let isValidOccurrence = false;

      switch (config.pattern) {
        case 'weekly':
          if (!config.daysOfWeek || config.daysOfWeek.length === 0) {
            // If no specific days, use the start date's day of week
            if (currentDate.getDay() === startDate.getDay()) {
              isValidOccurrence = true;
            }
          } else {
            // Check if current date matches any of the specified days
            if (config.daysOfWeek.includes(currentDate.getDay())) {
              isValidOccurrence = true;
            }
          }
          currentDate = addDays(currentDate, 1);
          break;

        case 'bi-weekly': {
          // Check if it's the right week (every 2 weeks from start)
          const weeksDiff = Math.floor(
            (currentDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
          );
          if (weeksDiff % (config.interval * 2) === 0) {
            if (!config.daysOfWeek || config.daysOfWeek.length === 0) {
              if (currentDate.getDay() === startDate.getDay()) {
                isValidOccurrence = true;
              }
            } else if (config.daysOfWeek.includes(currentDate.getDay())) {
              isValidOccurrence = true;
            }
          }
          currentDate = addDays(currentDate, 1);
          break;
        }

        case 'monthly': {
          const targetDay = config.dayOfMonth || startDate.getDate();
          if (currentDate.getDate() === targetDay) {
            isValidOccurrence = true;
          }
          currentDate = addDays(currentDate, 1);
          break;
        }

        case 'quarterly': {
          const targetQuarterDay = config.dayOfMonth || startDate.getDate();
          const month = currentDate.getMonth();
          // Check if it's the start of a quarter (March, June, September, December)
          if (month % 3 === 2 && currentDate.getDate() === targetQuarterDay) {
            isValidOccurrence = true;
          }
          currentDate = addDays(currentDate, 1);
          break;
        }

        case 'custom':
          // For custom patterns, use the interval as weeks
          isValidOccurrence = true;
          currentDate = addWeeks(currentDate, config.interval);
          break;

        default:
          console.warn(`Unknown recurrence pattern: ${config.pattern}`);
          break;
      }

      if (isValidOccurrence) {
        dates.push(new Date(currentDate));
        occurrenceCount++;

        // For monthly and quarterly patterns, advance to next period
        if (config.pattern === 'monthly') {
          currentDate = addMonths(currentDate, config.interval);
        } else if (config.pattern === 'quarterly') {
          currentDate = addQuarters(currentDate, config.interval);
        }
      }
    }

    return dates;
  }

  /**
   * Check for scheduling conflicts
   */
  async checkSchedulingConflicts(
    clientId: string,
    dates: Date[]
  ): Promise<{
    conflicts: { date: Date; conflictingSessionId: string; reason: string }[];
    availableDates: Date[];
  }> {
    try {
      const response = await apiFetch<{
        conflicts: { date: string; conflictingSessionId: string; reason: string }[];
        availableDates: string[];
      }>(`${this.baseUrl}/check-conflicts`, {
        method: 'POST',
        body: JSON.stringify({
          clientId,
          dates: dates.map(date => date.toISOString()),
        }),
      });

      return {
        conflicts: response.conflicts.map(conflict => ({
          ...conflict,
          date: new Date(conflict.date),
        })),
        availableDates: response.availableDates.map(date => new Date(date)),
      };
    } catch (error) {
      console.error('Error checking scheduling conflicts:', error);
      throw new Error('Failed to check scheduling conflicts');
    }
  }

  /**
   * Get existing recurring sessions for a template
   */
  async getRecurringSessions(templateId: string, clientId?: string): Promise<GeneratedSession[]> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('templateId', templateId);
      if (clientId) {
        queryParams.append('clientId', clientId);
      }

      const response = await apiFetch<{ sessions: GeneratedSession[] }>(
        `${this.baseUrl}?${queryParams.toString()}`
      );

      return response.sessions.map(session => ({
        ...session,
        scheduledDate: new Date(session.scheduledDate),
      }));
    } catch (error) {
      console.error('Error fetching recurring sessions:', error);
      throw new Error('Failed to fetch recurring sessions');
    }
  }

  /**
   * Cancel a generated recurring session
   */
  async cancelRecurringSession(sessionId: string, reason?: string): Promise<void> {
    try {
      await apiFetch<void>(`${this.baseUrl}/${sessionId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    } catch (error) {
      console.error('Error cancelling recurring session:', error);
      throw new Error('Failed to cancel recurring session');
    }
  }

  /**
   * Update a recurring session schedule
   */
  async updateRecurringSession(
    sessionId: string,
    updates: {
      scheduledDate?: Date;
      duration?: number;
      notes?: string;
      customizations?: Record<string, any>;
    }
  ): Promise<GeneratedSession> {
    try {
      const response = await apiFetch<GeneratedSession>(`${this.baseUrl}/${sessionId}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...updates,
          scheduledDate: updates.scheduledDate?.toISOString(),
        }),
      });

      return {
        ...response,
        scheduledDate: new Date(response.scheduledDate),
      };
    } catch (error) {
      console.error('Error updating recurring session:', error);
      throw new Error('Failed to update recurring session');
    }
  }

  /**
   * Generate a human-readable description of recurrence pattern
   */
  getRecurrenceDescription(config: RecurrenceConfig, t: (key: string, options?: any) => string): string {
    let description = '';

    switch (config.pattern) {
      case 'weekly':
        if (config.interval === 1) {
          description = t('templates.everyWeek');
        } else {
          description = t('templates.everyNWeeks', { count: config.interval });
        }
        
        if (config.daysOfWeek && config.daysOfWeek.length > 0) {
          const dayNames = config.daysOfWeek.map(day => {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return t(`common.${days[day].toLowerCase()}`);
          }).join(', ');
          description += ` ${t('templates.on')} ${dayNames}`;
        }
        break;

      case 'bi-weekly':
        description = t('templates.everyTwoWeeks');
        break;

      case 'monthly':
        if (config.interval === 1) {
          description = t('templates.everyMonth');
        } else {
          description = t('templates.everyNMonths', { count: config.interval });
        }
        
        if (config.dayOfMonth) {
          description += ` ${t('templates.onDay')} ${config.dayOfMonth}`;
        }
        break;

      case 'quarterly':
        description = t('templates.everyQuarter');
        if (config.dayOfMonth) {
          description += ` ${t('templates.onDay')} ${config.dayOfMonth}`;
        }
        break;

      case 'custom':
        description = t('templates.customPattern');
        break;

      default:
        description = t('templates.unknownPattern');
    }

    // Add end condition
    if (config.endDate) {
      description += ` ${t('templates.until')} ${format(new Date(config.endDate), 'MMM dd, yyyy')}`;
    } else if (config.maxOccurrences) {
      description += ` ${t('templates.forNOccurrences', { count: config.maxOccurrences })}`;
    }

    return description;
  }
}

export const recurringSessionService = new RecurringSessionService(); 