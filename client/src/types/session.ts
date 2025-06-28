/**
 * Unified Session Types for SatyaCoaching Client
 * 
 * This file provides a centralized type system for sessions that:
 * 1. Uses the authoritative database Session type as the base
 * 2. Provides UI-specific extensions for display purposes
 * 3. Ensures type consistency across all components
 * 4. Maps between database and UI status formats
 */

// Import the authoritative Session types from shared database schema
import { 
  Session as DatabaseSession,
  SessionInsert,
  SessionUpdate,
  SessionStatus as DatabaseSessionStatus,
  User
} from '../../../shared/types/database';

// ====================== STATUS MAPPING ======================

/**
 * UI-friendly session status type for backward compatibility
 * Maps to database SessionStatus values
 */
export type UISessionStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';

/**
 * Database session status (authoritative)
 */
export type SessionStatus = DatabaseSessionStatus;

/**
 * Mapping between UI and database status formats
 */
export const StatusMapping = {
  // UI to Database
  toDatabase: {
    'pending': 'Upcoming' as const,
    'in-progress': 'Upcoming' as const, // In-progress is still upcoming in DB
    'completed': 'Completed' as const,
    'cancelled': 'Cancelled' as const,
  },
  // Database to UI
  toUI: {
    'Upcoming': 'pending' as const,
    'Completed': 'completed' as const,
    'Cancelled': 'cancelled' as const,
    'Rescheduled': 'pending' as const, // Rescheduled sessions are pending
  }
} as const;

// ====================== BASE SESSION TYPE ======================

/**
 * Base Session type - direct import from database schema
 * This is the authoritative source of truth for session data
 */
export type Session = DatabaseSession;

// ====================== UI EXTENDED TYPES ======================

/**
 * Session with joined user data for display purposes
 * Used when displaying sessions with coach/client names
 */
export interface SessionWithUsers extends Session {
  client?: Pick<User, 'id' | 'name' | 'email'> | null;
  coach?: Pick<User, 'id' | 'name' | 'email'> | null;
}

/**
 * Session with computed display fields and UI-friendly status
 * Used for components that need additional UI-friendly data
 */
export interface SessionDisplayData extends SessionWithUsers {
  // Computed display fields
  clientName?: string;
  coachName?: string;
  formattedDate?: string;
  formattedTime?: string;
  statusIcon?: string;
  statusColor?: string;
  // UI-friendly status
  uiStatus?: UISessionStatus;
}

/**
 * Session list item for table/list displays
 * Optimized for rendering in lists and tables with UI status
 */
export interface SessionListItem {
  id: string;
  date: string;
  status: UISessionStatus; // UI format for display
  clientName: string;
  coachName: string;
  notes?: string;
  formattedDate: string;
  statusIcon: string;
  statusColor: string;
}

// ====================== FORM TYPES ======================

/**
 * Data required to create a new session
 */
export type CreateSessionData = Omit<SessionInsert, 'id' | 'created_at' | 'updated_at'>;

/**
 * Data that can be updated for an existing session
 */
export type UpdateSessionData = Partial<Omit<SessionUpdate, 'id' | 'created_at' | 'updated_at'>>;

/**
 * Session form data with UI enhancements
 */
export interface SessionFormData {
  client_id: string;
  coach_id: string;
  date: string;
  status: SessionStatus;
  notes?: string;
}

// ====================== FILTER TYPES ======================

/**
 * Filters for querying sessions
 */
export interface SessionFilters {
  coach_id?: string;
  client_id?: string;
  status?: SessionStatus | SessionStatus[];
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
  live?: boolean; // Enable background refetching for real-time updates
}

/**
 * Session search parameters
 */
export interface SessionSearchParams extends SessionFilters {
  search?: string;
  sort_by?: 'date' | 'status' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

// ====================== UTILITY TYPES ======================

/**
 * Session status with display properties (UI format)
 */
export interface SessionStatusOption {
  value: UISessionStatus;
  label: string;
  icon: string;
  color: string;
}

/**
 * Session statistics for dashboard display
 */
export interface SessionStats {
  total: number;
  upcoming: number;
  completed: number;
  cancelled: number;
  rescheduled: number;
}

// ====================== COMPONENT PROP TYPES ======================

/**
 * Props for session detail components
 */
export interface SessionDetailProps {
  session: SessionWithUsers;
  onUpdate?: (data: UpdateSessionData) => void;
  onDelete?: () => void;
  readOnly?: boolean;
}

/**
 * Props for session list components
 */
export interface SessionListProps {
  sessions: SessionWithUsers[];
  filters?: SessionFilters;
  onSessionClick?: (session: Session) => void;
  onStatusChange?: (sessionId: string, status: UISessionStatus) => void;
  loading?: boolean;
}

/**
 * Props for session form components
 */
export interface SessionFormProps {
  initialData?: Partial<SessionFormData>;
  onSubmit: (data: CreateSessionData | UpdateSessionData) => void;
  onCancel?: () => void;
  loading?: boolean;
  mode: 'create' | 'edit';
}

// ====================== HELPER FUNCTIONS ======================

/**
 * Utility functions for session data transformation
 */
export const SessionUtils = {
  /**
   * Convert database status to UI status
   */
  toUIStatus(dbStatus: SessionStatus): UISessionStatus {
    return StatusMapping.toUI[dbStatus];
  },

  /**
   * Convert UI status to database status
   */
  toDBStatus(uiStatus: UISessionStatus): SessionStatus {
    return StatusMapping.toDatabase[uiStatus];
  },

  /**
   * Convert SessionWithUsers to SessionDisplayData
   */
  toDisplayData(session: SessionWithUsers): SessionDisplayData {
    const uiStatus = SessionUtils.toUIStatus(session.status);
    return {
      ...session,
      clientName: session.client?.name || 'Unknown Client',
      coachName: session.coach?.name || 'Unknown Coach',
      formattedDate: new Date(session.date).toLocaleDateString(),
      formattedTime: new Date(session.date).toLocaleTimeString(),
      statusIcon: getStatusIcon(uiStatus),
      statusColor: getStatusColor(uiStatus),
      uiStatus,
    };
  },

  /**
   * Convert SessionWithUsers to SessionListItem
   */
  toListItem(session: SessionWithUsers): SessionListItem {
    const uiStatus = SessionUtils.toUIStatus(session.status);
    return {
      id: session.id,
      date: session.date,
      status: uiStatus,
      clientName: session.client?.name || 'Unknown Client',
      coachName: session.coach?.name || 'Unknown Coach',
      notes: session.notes || undefined,
      formattedDate: new Date(session.date).toLocaleDateString(),
      statusIcon: getStatusIcon(uiStatus),
      statusColor: getStatusColor(uiStatus),
    };
  },

  /**
   * Get available status options for UI
   */
  getStatusOptions(): SessionStatusOption[] {
    return [
      { value: 'pending', label: 'Pending', icon: '⏱️', color: 'amber' },
      { value: 'in-progress', label: 'In Progress', icon: '⚡', color: 'blue' },
      { value: 'completed', label: 'Completed', icon: '✅', color: 'green' },
      { value: 'cancelled', label: 'Cancelled', icon: '❌', color: 'red' },
    ];
  },

  /**
   * Calculate session statistics
   */
  calculateStats(sessions: Session[]): SessionStats {
    const stats = sessions.reduce((acc, session) => {
      const uiStatus = SessionUtils.toUIStatus(session.status);
      acc.total++;
      switch (uiStatus) {
        case 'pending':
        case 'in-progress':
          acc.upcoming++;
          break;
        case 'completed':
          acc.completed++;
          break;
        case 'cancelled':
          acc.cancelled++;
          break;
      }
      return acc;
    }, { total: 0, upcoming: 0, completed: 0, cancelled: 0, rescheduled: 0 });

    return stats;
  }
};

/**
 * Get status icon for UI display
 */
function getStatusIcon(status: UISessionStatus): string {
  const icons = {
    'pending': '⏱️',
    'in-progress': '⚡',
    'completed': '✅',
    'cancelled': '❌',
  };
  return icons[status] || '❓';
}

/**
 * Get status color for UI display
 */
function getStatusColor(status: UISessionStatus): string {
  const colors = {
    'pending': 'amber',
    'in-progress': 'blue',
    'completed': 'green',
    'cancelled': 'red',
  };
  return colors[status] || 'gray';
} 