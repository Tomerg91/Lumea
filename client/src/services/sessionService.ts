// Placeholder for session-related API calls

import { Session, SessionStatus } from '../components/SessionList';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Type for session creation data
interface CreateSessionData {
  clientId: string;
  date: string;
  notes: string;
}

// Type for session status update data
interface UpdateSessionStatusData {
  status: SessionStatus;
}

// Type for session update data
interface UpdateSessionData {
  clientId?: string;
  date?: string;
  notes?: string;
}

// Type for session cancellation data
interface CancelSessionData {
  reason: 'coach_emergency' | 'client_request' | 'illness' | 'scheduling_conflict' | 'technical_issues' | 'weather' | 'personal_emergency' | 'other';
  reasonText?: string;
}

// Type for session rescheduling data
interface RescheduleSessionData {
  newDate: string;
  reason: string;
}

// Timer-related types
export interface TimerStatus {
  timerStatus: 'stopped' | 'running' | 'paused';
  sessionId: string;
  timingId?: string;
  startTime?: string;
  endTime?: string;
  currentDuration: number; // in seconds
  actualDuration: number; // in seconds
  adjustedDuration?: number; // in seconds
  totalDuration: number; // in seconds
  durationInMinutes: number; // in minutes
  totalPausedTime: number; // in seconds
  pauseCount: number;
  adjustmentCount: number;
  hasTimer: boolean;
  adjustments?: DurationAdjustment[];
}

export interface DurationAdjustment {
  originalDuration: number;
  adjustedDuration: number;
  reason?: string;
  adjustedBy: {
    firstName: string;
    lastName: string;
  };
  adjustedAt: string;
}

export interface DurationAdjustmentData {
  adjustedDuration: number; // in seconds
  reason?: string;
}

export interface DurationAnalytics {
  sessionId: string;
  date: string;
  coach: {
    firstName: string;
    lastName: string;
  };
  client: {
    firstName: string;
    lastName: string;
  };
  plannedDuration: number; // in minutes
  actualDuration: number; // in seconds
  adjustedDuration?: number; // in seconds
  totalDuration: number; // in seconds
  durationInMinutes: number;
  totalPausedTime: number;
  pauseCount: number;
  adjustmentCount: number;
  timerStatus: 'stopped' | 'running' | 'paused';
}

export interface AnalyticsSummary {
  totalSessions: number;
  totalDurationMinutes: number;
  averageDurationMinutes: number;
  totalPauses: number;
  totalAdjustments: number;
}

// Common fetch configuration with authentication
const createFetchConfig = (options: RequestInit = {}): RequestInit => ({
  ...options,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...options.headers,
  },
  credentials: 'include', // Essential for session cookies!
});

export const fetchSessions = async (): Promise<Session[]> => {
  console.log('Attempting to fetch sessions from backend...');
  const response = await fetch(
    `${API_BASE_URL}/sessions/client/all`, 
    createFetchConfig()
  );
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ 
      message: 'Failed to fetch sessions and parse error' 
    }));
    throw new Error(errorData.message || 'Failed to fetch sessions');
  }
  
  const data = await response.json();
  // Backend returns { sessions: Session[] } structure
  return data.sessions || data || [];
};

export const createSession = async (sessionData: CreateSessionData): Promise<Session> => {
  console.log('Attempting to create session with data:', sessionData);
  
  const response = await fetch(
    `${API_BASE_URL}/sessions`, 
    createFetchConfig({
      method: 'POST',
      body: JSON.stringify(sessionData),
    })
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ 
      message: 'Failed to create session and parse error' 
    }));
    throw new Error(errorData.message || 'Failed to create session');
  }
  
  const result = await response.json();
  // Backend returns { message: string, session: Session }
  return result.session;
};

export const updateSessionStatus = async (
  sessionId: string, 
  statusData: UpdateSessionStatusData
): Promise<Session> => {
  console.log('Attempting to update session status:', { sessionId, statusData });
  
  const response = await fetch(
    `${API_BASE_URL}/sessions/${sessionId}/status`, 
    createFetchConfig({
      method: 'PUT',
      body: JSON.stringify(statusData),
    })
  );

  if (!response.ok) {
    let errorMessage = 'Failed to update session status';
    let errorDetails = '';
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
      errorDetails = errorData.details || '';
      
      // Provide user-friendly error messages for common validation errors
      if (errorData.error === 'Invalid status transition') {
        errorMessage = `Cannot change status: ${errorDetails}`;
      } else if (errorData.error === 'Cannot mark future session as completed') {
        errorMessage = 'This session is scheduled for the future and cannot be marked as completed yet.';
      } else if (errorData.error === 'Session must be marked as in-progress before completion') {
        errorMessage = 'Please mark the session as in-progress first, then complete it.';
      } else if (errorData.error === 'Cannot cancel session less than 2 hours before scheduled time') {
        errorMessage = 'Sessions cannot be cancelled less than 2 hours before the scheduled time.';
      } else if (errorData.error === 'Session date is too far from current date') {
        errorMessage = 'This session is too far in the future to mark as in-progress.';
      }
    } catch (parseError) {
      console.error('Failed to parse error response:', parseError);
    }
    
    throw new Error(errorMessage);
  }
  
  const result = await response.json();
  // Backend returns { message: string, session: Session }
  return result.session;
};

export const fetchSessionById = async (sessionId: string): Promise<Session> => {
  console.log('Attempting to fetch session by ID:', sessionId);
  
  const response = await fetch(
    `${API_BASE_URL}/sessions/${sessionId}`, 
    createFetchConfig()
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Session not found');
    }
    
    const errorData = await response.json().catch(() => ({ 
      message: 'Failed to fetch session and parse error' 
    }));
    throw new Error(errorData.message || errorData.error || 'Failed to fetch session');
  }
  
  const session = await response.json();
  return session;
};

export const updateSession = async (
  sessionId: string, 
  updateData: UpdateSessionData
): Promise<Session> => {
  console.log('Attempting to update session:', { sessionId, updateData });
  
  const response = await fetch(
    `${API_BASE_URL}/sessions/${sessionId}`, 
    createFetchConfig({
      method: 'PUT',
      body: JSON.stringify(updateData),
    })
  );

  if (!response.ok) {
    let errorMessage = 'Failed to update session';
    let errorDetails = '';
    
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
        if (errorData.details) {
          errorDetails = Array.isArray(errorData.details) 
            ? errorData.details.map((d: any) => d.message).join(', ')
            : errorData.details;
        }
      }
    } catch (parseError) {
      console.error('Error parsing error response:', parseError);
    }
    
    const fullErrorMessage = errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage;
    console.error('Session update failed:', fullErrorMessage);
    throw new Error(fullErrorMessage);
  }

  const updatedSession = await response.json();
  console.log('Session updated successfully:', updatedSession);
  return updatedSession;
};

export const cancelSession = async (
  sessionId: string, 
  cancelData: CancelSessionData
): Promise<Session> => {
  console.log('Attempting to cancel session:', { sessionId, cancelData });
  
  const response = await fetch(
    `${API_BASE_URL}/sessions/${sessionId}/cancel`, 
    createFetchConfig({
      method: 'POST',
      body: JSON.stringify(cancelData),
    })
  );

  if (!response.ok) {
    let errorMessage = 'Failed to cancel session';
    
    try {
      const errorData = await response.json();
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      }
      
      // Provide user-friendly error messages
      if (errorMessage.includes('minimum notice')) {
        errorMessage = 'Sessions must be cancelled at least 24 hours in advance.';
      } else if (errorMessage.includes('monthly limit')) {
        errorMessage = 'You have reached the maximum number of cancellations for this month.';
      } else if (errorMessage.includes('already cancelled')) {
        errorMessage = 'This session has already been cancelled.';
      }
    } catch (parseError) {
      console.error('Failed to parse cancellation error response:', parseError);
    }
    
    throw new Error(errorMessage);
  }
  
  const result = await response.json();
  // Backend returns { success: true, message: string, session: Session }
  return result.session;
};

export const rescheduleSession = async (
  sessionId: string, 
  rescheduleData: RescheduleSessionData
): Promise<Session> => {
  console.log('Attempting to reschedule session:', { sessionId, rescheduleData });
  
  const response = await fetch(
    `${API_BASE_URL}/sessions/${sessionId}/reschedule`, 
    createFetchConfig({
      method: 'POST',
      body: JSON.stringify(rescheduleData),
    })
  );

  if (!response.ok) {
    let errorMessage = 'Failed to reschedule session';
    
    try {
      const errorData = await response.json();
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      }
      
      // Provide user-friendly error messages
      if (errorMessage.includes('conflict')) {
        errorMessage = 'The requested time slot conflicts with another session.';
      } else if (errorMessage.includes('past date')) {
        errorMessage = 'Cannot reschedule to a date in the past.';
      } else if (errorMessage.includes('already rescheduled')) {
        errorMessage = 'This session has already been rescheduled the maximum number of times.';
      }
    } catch (parseError) {
      console.error('Failed to parse reschedule error response:', parseError);
    }
    
    throw new Error(errorMessage);
  }
  
  const result = await response.json();
  // Backend returns { success: true, message: string, session: Session }
  return result.session;
};

export const getAvailableSlots = async (
  sessionId: string,
  fromDate: string,
  toDate: string,
  duration?: number
): Promise<{ start: string; end: string }[]> => {
  console.log('Fetching available slots:', { sessionId, fromDate, toDate, duration });
  
  const params = new URLSearchParams({
    fromDate,
    toDate,
    ...(duration && { duration: duration.toString() })
  });
  
  const response = await fetch(
    `${API_BASE_URL}/sessions/${sessionId}/available-slots?${params}`, 
    createFetchConfig()
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ 
      message: 'Failed to fetch available slots' 
    }));
    throw new Error(errorData.message || 'Failed to fetch available slots');
  }
  
  const result = await response.json();
  // Backend returns { success: true, availableSlots: Slot[], totalSlots: number }
  return result.availableSlots || [];
};

// Session Timer API Functions

export const startSessionTimer = async (sessionId: string): Promise<TimerStatus> => {
  console.log('Starting session timer for session:', sessionId);
  
  const response = await fetch(
    `${API_BASE_URL}/sessions/timer/start`,
    createFetchConfig({
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    })
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ 
      message: 'Failed to start timer and parse error' 
    }));
    throw new Error(errorData.message || 'Failed to start session timer');
  }
  
  const result = await response.json();
  return result.data;
};

export const stopSessionTimer = async (sessionId: string): Promise<TimerStatus> => {
  console.log('Stopping session timer for session:', sessionId);
  
  const response = await fetch(
    `${API_BASE_URL}/sessions/timer/stop`,
    createFetchConfig({
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    })
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ 
      message: 'Failed to stop timer and parse error' 
    }));
    throw new Error(errorData.message || 'Failed to stop session timer');
  }
  
  const result = await response.json();
  return result.data;
};

export const pauseSessionTimer = async (sessionId: string): Promise<TimerStatus> => {
  console.log('Pausing session timer for session:', sessionId);
  
  const response = await fetch(
    `${API_BASE_URL}/sessions/timer/pause`,
    createFetchConfig({
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    })
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ 
      message: 'Failed to pause timer and parse error' 
    }));
    throw new Error(errorData.message || 'Failed to pause session timer');
  }
  
  const result = await response.json();
  return result.data;
};

export const resumeSessionTimer = async (sessionId: string): Promise<TimerStatus> => {
  console.log('Resuming session timer for session:', sessionId);
  
  const response = await fetch(
    `${API_BASE_URL}/sessions/timer/resume`,
    createFetchConfig({
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    })
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ 
      message: 'Failed to resume timer and parse error' 
    }));
    throw new Error(errorData.message || 'Failed to resume session timer');
  }
  
  const result = await response.json();
  return result.data;
};

export const adjustSessionDuration = async (
  sessionId: string, 
  adjustmentData: DurationAdjustmentData
): Promise<TimerStatus> => {
  console.log('Adjusting session duration for session:', sessionId, adjustmentData);
  
  const response = await fetch(
    `${API_BASE_URL}/sessions/timer/adjust`,
    createFetchConfig({
      method: 'PUT',
      body: JSON.stringify({ sessionId, ...adjustmentData }),
    })
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ 
      message: 'Failed to adjust duration and parse error' 
    }));
    throw new Error(errorData.message || 'Failed to adjust session duration');
  }
  
  const result = await response.json();
  return result.data;
};

export const getSessionTimingData = async (sessionId: string): Promise<TimerStatus> => {
  console.log('Fetching session timing data for session:', sessionId);
  
  const response = await fetch(
    `${API_BASE_URL}/sessions/timer/${sessionId}/timing`,
    createFetchConfig()
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ 
      message: 'Failed to fetch timing data and parse error' 
    }));
    throw new Error(errorData.message || 'Failed to fetch session timing data');
  }
  
  const result = await response.json();
  return result.data;
};

export const getDurationAnalytics = async (
  filters: {
    coachId?: string;
    clientId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    page?: number;
    sortBy?: 'date' | 'duration' | 'actualDuration' | 'adjustedDuration';
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<{
  analytics: DurationAnalytics[];
  summary: AnalyticsSummary;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}> => {
  console.log('Fetching duration analytics with filters:', filters);
  
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, value.toString());
    }
  });
  
  const response = await fetch(
    `${API_BASE_URL}/sessions/timer/analytics?${queryParams.toString()}`,
    createFetchConfig()
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ 
      message: 'Failed to fetch analytics and parse error' 
    }));
    throw new Error(errorData.message || 'Failed to fetch duration analytics');
  }
  
  const result = await response.json();
  return result.data;
};

// Export types for use in other files
export type { CreateSessionData, UpdateSessionStatusData, UpdateSessionData, CancelSessionData, RescheduleSessionData }; 