import { AuditService } from './auditService';
import { notificationScheduler } from './notificationSchedulerService';

export interface ICoachingSession { // Placeholder interface
  _id: string;
  coachId: string | any;
  clientId: string | any;
  date: Date;
  duration?: number;
  status: string;
  completedAt?: Date;
  notes?: string;
  cancellationInfo?: any;
  reschedulingInfo?: any;
}

export type SessionStatus = 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
export type CancellationReason = 'coach_emergency' | 'client_request' | 'illness' | 'scheduling_conflict' | 'technical_issues' | 'weather' | 'personal_emergency' | 'other';
export interface ICancellationInfo {
  reason: CancellationReason;
  reasonText?: string;
  cancelledBy: string;
  cancelledAt: Date;
  refundEligible: boolean;
  cancellationFee: number;
  notificationSent: boolean;
}

export interface IReschedulingInfo {
  originalDate: Date;
  rescheduleReason: string;
  rescheduledBy: string;
  rescheduledAt: Date;
  rescheduleCount: number;
  isFromCancellation: boolean;
}

export interface CancellationRequest {
  sessionId: string;
  reason: CancellationReason;
  reasonText?: string;
  cancelledBy: string; // User ID
}

export interface ReschedulingRequest {
  sessionId: string;
  newDate: Date;
  reason: string;
  rescheduledBy: string; // User ID
}

export interface CancellationPolicy {
  minimumNoticeHours: number;
  cancellationFeePercent: number; // 0-100
  refundEligibleReasons: CancellationReason[];
  maxCancellationsPerMonth: number;
}

export interface ReschedulingPolicy {
  minimumNoticeHours: number;
  maxRescheduleCount: number;
  rescheduleWindowDays: number; // How far in advance can reschedule
}

export class SessionService {
  private static readonly DEFAULT_CANCELLATION_POLICY: CancellationPolicy = {
    minimumNoticeHours: 24,
    cancellationFeePercent: 0,
    refundEligibleReasons: ['illness', 'coach_emergency', 'weather', 'technical_issues'],
    maxCancellationsPerMonth: 3,
  };

  private static readonly DEFAULT_RESCHEDULING_POLICY: ReschedulingPolicy = {
    minimumNoticeHours: 2,
    maxRescheduleCount: 2,
    rescheduleWindowDays: 30,
  };

  /**
   * Cancel a session with proper validation and business rules
   */
  static async cancelSession(
    request: CancellationRequest,
    policy: CancellationPolicy = SessionService.DEFAULT_CANCELLATION_POLICY
  ): Promise<ICoachingSession> {
    console.warn('cancelSession is a placeholder. Implement with Supabase.');
    return { _id: request.sessionId, coachId: '', clientId: '', date: new Date(), status: 'cancelled' };
  }

  /**
   * Reschedule a session with conflict detection and validation
   */
  static async rescheduleSession(
    request: ReschedulingRequest,
    policy: ReschedulingPolicy = SessionService.DEFAULT_RESCHEDULING_POLICY
  ): Promise<ICoachingSession> {
    console.warn('rescheduleSession is a placeholder. Implement with Supabase.');
    return { _id: request.sessionId, coachId: '', clientId: '', date: request.newDate, status: 'rescheduled' };
  }

  /**
   * Get sessions that need confirmation or reminders
   */
  static async getSessionsNeedingNotification(
    type: 'confirmation' | 'reminder',
    lookAheadHours: number = 24
  ): Promise<ICoachingSession[]> {
    console.warn('getSessionsNeedingNotification is a placeholder. Implement with Supabase.');
    return [];
  }

  /**
   * Mark notification as sent
   */
  static async markNotificationSent(
    sessionId: string,
    type: 'confirmation' | 'reminder' | 'cancellation'
  ): Promise<void> {
    console.warn('markNotificationSent is a placeholder. Implement with Supabase.');
  }

  /**
   * Get cancellation statistics for a user
   */
  static async getCancellationStats(
    userId: string,
    role: 'coach' | 'client',
    months: number = 6
  ): Promise<{
    totalCancellations: number;
    cancellationsByReason: Record<CancellationReason, number>;
    monthlyTrend: Array<{ month: string; count: number }>;
  }> {
    console.warn('getCancellationStats is a placeholder. Implement with Supabase.');
    return {
      totalCancellations: 0,
      cancellationsByReason: {} as Record<CancellationReason, number>,
      monthlyTrend: [],
    };
  }

  /**
   * Get available time slots for rescheduling
   */
  static async getAvailableSlots(
    coachId: string,
    clientId: string,
    excludeSessionId: string,
    fromDate: Date,
    toDate: Date,
    duration: number = 60
  ): Promise<Date[]> {
    console.warn('getAvailableSlots is a placeholder. Implement with Supabase.');
    return [];
  }

  /**
   * Create a session through public booking (no authentication required)
   * This method handles client creation/lookup and session scheduling
   */
  static async createPublicBookingSession(sessionData: {
    coachId: string;
    clientEmail: string;
    clientFirstName: string;
    clientLastName: string;
    clientPhone?: string;
    date: Date;
    duration?: number;
    notes?: string;
    status?: SessionStatus;
    isPublicBooking?: boolean;
  }): Promise<ICoachingSession> {
    console.warn('createPublicBookingSession is a placeholder. Implement with Supabase.');
    return { _id: 'mock_session_id', coachId: sessionData.coachId, clientId: 'mock_client_id', date: sessionData.date, status: 'pending' };
  }
}

export default SessionService; 