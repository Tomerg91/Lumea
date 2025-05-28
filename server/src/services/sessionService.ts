import { Types } from 'mongoose';
import { CoachingSession, ICoachingSession, SessionStatus, CancellationReason, ICancellationInfo, IReschedulingInfo } from '../models/CoachingSession';
import { User } from '../models/User';
import { AuditService } from './auditService';
import { notificationScheduler } from './notificationSchedulerService';

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
    // Validate session exists and can be cancelled
    const session = await CoachingSession.findById(request.sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Check if session can be cancelled
    if (session.status === 'completed') {
      throw new Error('Cannot cancel a completed session');
    }
    
    if (session.status === 'cancelled') {
      throw new Error('Session is already cancelled');
    }

    // Validate user authorization
    const cancellingUser = await User.findById(request.cancelledBy);
    if (!cancellingUser) {
      throw new Error('User not found');
    }

    // Handle both ObjectId and populated cases
    const coachIdString = typeof session.coachId === 'string' ? session.coachId : session.coachId.toString();
    const clientIdString = typeof session.clientId === 'string' ? session.clientId : session.clientId.toString();
    
    const isCoach = coachIdString === request.cancelledBy;
    const isClient = clientIdString === request.cancelledBy;
    const isAdmin = (typeof cancellingUser.role === 'object' && 'name' in cancellingUser.role) 
      ? cancellingUser.role.name === 'admin' 
      : cancellingUser.role.toString() === 'admin';

    if (!isCoach && !isClient && !isAdmin) {
      throw new Error('Not authorized to cancel this session');
    }

    // Check minimum notice period
    const now = new Date();
    const sessionDate = new Date(session.date);
    const hoursUntilSession = (sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilSession > 0 && hoursUntilSession < policy.minimumNoticeHours) {
      throw new Error(
        `Cancellation requires at least ${policy.minimumNoticeHours} hours notice. ` +
        `Session is in ${Math.ceil(hoursUntilSession)} hours.`
      );
    }

    // Check monthly cancellation limit for clients
    if (isClient) {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const monthlyCancellations = await CoachingSession.countDocuments({
        clientId: request.cancelledBy,
        status: 'cancelled',
        'cancellationInfo.cancelledAt': {
          $gte: monthStart,
          $lte: monthEnd,
        },
      });

      if (monthlyCancellations >= policy.maxCancellationsPerMonth) {
        throw new Error(
          `Maximum of ${policy.maxCancellationsPerMonth} cancellations per month reached`
        );
      }
    }

    // Calculate cancellation fee and refund eligibility
    const isRefundEligible = policy.refundEligibleReasons.includes(request.reason);
    const cancellationFee = isRefundEligible ? 0 : 
      Math.round((session.duration || 60) * policy.cancellationFeePercent / 100);

    // Create cancellation info
    const cancellationInfo: ICancellationInfo = {
      reason: request.reason,
      reasonText: request.reasonText,
      cancelledBy: new Types.ObjectId(request.cancelledBy),
      cancelledAt: now,
      refundEligible: isRefundEligible,
      cancellationFee,
      notificationSent: false,
    };

    // Update session
    const updatedSession = await CoachingSession.findByIdAndUpdate(
      request.sessionId,
      {
        status: 'cancelled',
        cancelledAt: now,
        cancellationInfo,
      },
      { new: true }
    ).populate('coachId clientId cancellationInfo.cancelledBy', 'firstName lastName email');

    if (!updatedSession) {
      throw new Error('Failed to update session');
    }

    // Cancel scheduled reminders for this session
    try {
      await notificationScheduler.cancelSessionReminders(request.sessionId);
    } catch (error) {
      console.error('Failed to cancel session reminders:', error);
      // Don't fail the operation if reminder cancellation fails
    }

    // Track cancellation in audit trail
    try {
      await AuditService.trackSessionCancelled(
        updatedSession,
        request.cancelledBy,
        request.reason,
        request.reasonText,
        {
          cancellationFee,
          refundEligible: isRefundEligible,
          source: 'web',
        }
      );
    } catch (auditError) {
      // Log audit error but don't fail the operation
      console.error('Failed to track session cancellation in audit trail:', auditError);
    }

    return updatedSession;
  }

  /**
   * Reschedule a session with conflict detection and validation
   */
  static async rescheduleSession(
    request: ReschedulingRequest,
    policy: ReschedulingPolicy = SessionService.DEFAULT_RESCHEDULING_POLICY
  ): Promise<ICoachingSession> {
    // Validate session exists
    const session = await CoachingSession.findById(request.sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Check if session can be rescheduled
    if (session.status === 'completed') {
      throw new Error('Cannot reschedule a completed session');
    }

    if (session.status === 'cancelled') {
      throw new Error('Cannot reschedule a cancelled session. Please create a new session instead.');
    }

    // Validate user authorization
    const reschedulingUser = await User.findById(request.rescheduledBy);
    if (!reschedulingUser) {
      throw new Error('User not found');
    }

    // Handle both ObjectId and populated cases
    const coachIdString = typeof session.coachId === 'string' ? session.coachId : session.coachId.toString();
    const clientIdString = typeof session.clientId === 'string' ? session.clientId : session.clientId.toString();
    
    const isCoach = coachIdString === request.rescheduledBy;
    const isClient = clientIdString === request.rescheduledBy;
    const isAdmin = (typeof reschedulingUser.role === 'object' && 'name' in reschedulingUser.role) 
      ? reschedulingUser.role.name === 'admin' 
      : reschedulingUser.role.toString() === 'admin';

    if (!isCoach && !isClient && !isAdmin) {
      throw new Error('Not authorized to reschedule this session');
    }

    // Check minimum notice period
    const now = new Date();
    const originalDate = new Date(session.date);
    const newDate = new Date(request.newDate);
    const hoursUntilSession = (originalDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilSession > 0 && hoursUntilSession < policy.minimumNoticeHours) {
      throw new Error(
        `Rescheduling requires at least ${policy.minimumNoticeHours} hours notice. ` +
        `Session is in ${Math.ceil(hoursUntilSession)} hours.`
      );
    }

    // Validate new date is in the future
    if (newDate <= now) {
      throw new Error('New session date must be in the future');
    }

    // Check reschedule window
    const maxRescheduleDate = new Date(now.getTime() + (policy.rescheduleWindowDays * 24 * 60 * 60 * 1000));
    if (newDate > maxRescheduleDate) {
      throw new Error(
        `Sessions can only be rescheduled within ${policy.rescheduleWindowDays} days. ` +
        `Please contact support for dates beyond this period.`
      );
    }

    // Check reschedule count limit
    const currentRescheduleCount = session.reschedulingInfo?.rescheduleCount || 0;
    if (currentRescheduleCount >= policy.maxRescheduleCount) {
      throw new Error(
        `Maximum of ${policy.maxRescheduleCount} reschedules allowed per session`
      );
    }

    // Check for conflicts at new time slot
    const conflictSessions = await CoachingSession.find({
      $or: [
        { coachId: session.coachId },
        { clientId: session.clientId }
      ],
      _id: { $ne: session._id },
      date: {
        $gte: newDate,
        $lt: new Date(newDate.getTime() + (session.duration * 60 * 1000))
      },
      status: { $in: ['pending', 'in-progress', 'rescheduled'] }
    });

    if (conflictSessions.length > 0) {
      throw new Error('The new time slot conflicts with existing sessions');
    }

    // Create rescheduling info
    const reschedulingInfo: IReschedulingInfo = {
      originalDate: session.reschedulingInfo?.originalDate || originalDate,
      rescheduleReason: request.reason,
      rescheduledBy: new Types.ObjectId(request.rescheduledBy),
      rescheduledAt: now,
      rescheduleCount: currentRescheduleCount + 1,
      isFromCancellation: false, // This is always false since we check status !== 'cancelled' above
    };

    // Update session
    const updatedSession = await CoachingSession.findByIdAndUpdate(
      request.sessionId,
      {
        date: newDate,
        status: 'rescheduled',
        rescheduledAt: now,
        reschedulingInfo,
        // Reset notification flags since it's a new time
        reminderSent: false,
        confirmationSent: false,
      },
      { new: true }
    ).populate('coachId clientId reschedulingInfo.rescheduledBy', 'firstName lastName email');

    if (!updatedSession) {
      throw new Error('Failed to update session');
    }

    // Cancel old reminders and schedule new ones
    try {
      await notificationScheduler.cancelSessionReminders(request.sessionId);
      await notificationScheduler.scheduleSessionReminders(updatedSession);
    } catch (error) {
      console.error('Failed to reschedule session reminders:', error);
      // Don't fail the operation if reminder rescheduling fails
    }

    // Track rescheduling in audit trail
    try {
      await AuditService.trackSessionRescheduled(
        updatedSession,
        request.rescheduledBy,
        originalDate,
        newDate,
        request.reason,
        currentRescheduleCount + 1,
        { source: 'web' }
      );
    } catch (auditError) {
      // Log audit error but don't fail the operation
      console.error('Failed to track session rescheduling in audit trail:', auditError);
    }

    return updatedSession;
  }

  /**
   * Get sessions that need confirmation or reminders
   */
  static async getSessionsNeedingNotification(
    type: 'confirmation' | 'reminder',
    lookAheadHours: number = 24
  ): Promise<ICoachingSession[]> {
    const now = new Date();
    const lookAheadTime = new Date(now.getTime() + (lookAheadHours * 60 * 60 * 1000));

    const filter: any = {
      date: {
        $gte: now,
        $lte: lookAheadTime,
      },
      status: { $in: ['pending', 'rescheduled'] },
    };

    if (type === 'confirmation') {
      filter.confirmationSent = false;
    } else {
      filter.reminderSent = false;
    }

    return CoachingSession.find(filter)
      .populate('coachId clientId', 'firstName lastName email')
      .sort({ date: 1 });
  }

  /**
   * Mark notification as sent
   */
  static async markNotificationSent(
    sessionId: string,
    type: 'confirmation' | 'reminder' | 'cancellation'
  ): Promise<void> {
    const update: any = {};
    
    if (type === 'confirmation') {
      update.confirmationSent = true;
    } else if (type === 'reminder') {
      update.reminderSent = true;
    } else if (type === 'cancellation') {
      update['cancellationInfo.notificationSent'] = true;
    }

    await CoachingSession.findByIdAndUpdate(sessionId, update);
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
    const endDate = new Date();
    const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - months, 1);

    const matchField = role === 'coach' ? 'coachId' : 'clientId';
    
    const pipeline = [
      {
        $match: {
          [matchField]: new Types.ObjectId(userId),
          status: 'cancelled',
          'cancellationInfo.cancelledAt': { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            reason: '$cancellationInfo.reason',
            year: { $year: '$cancellationInfo.cancelledAt' },
            month: { $month: '$cancellationInfo.cancelledAt' },
          },
          count: { $sum: 1 },
        },
      },
    ];

    const results = await CoachingSession.aggregate(pipeline);
    
    // Process results
    const cancellationsByReason: Record<CancellationReason, number> = {} as any;
    const monthlyData: Record<string, number> = {};
    let totalCancellations = 0;

    results.forEach((result) => {
      const reason = result._id.reason;
      const monthKey = `${result._id.year}-${result._id.month.toString().padStart(2, '0')}`;
      
      cancellationsByReason[reason] = (cancellationsByReason[reason] || 0) + result.count;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + result.count;
      totalCancellations += result.count;
    });

    // Generate monthly trend
    const monthlyTrend = [];
    for (let i = 0; i < months; i++) {
      const date = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      monthlyTrend.unshift({
        month: monthKey,
        count: monthlyData[monthKey] || 0,
      });
    }

    return {
      totalCancellations,
      cancellationsByReason,
      monthlyTrend,
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
    // Get all existing sessions in the date range
    const existingSessions = await CoachingSession.find({
      $or: [
        { coachId: new Types.ObjectId(coachId) },
        { clientId: new Types.ObjectId(clientId) }
      ],
      _id: { $ne: new Types.ObjectId(excludeSessionId) },
      date: { $gte: fromDate, $lte: toDate },
      status: { $in: ['pending', 'in-progress', 'rescheduled'] }
    }).select('date duration');

    // Generate potential time slots (every 30 minutes during business hours)
    const availableSlots: Date[] = [];
    const current = new Date(fromDate);
    
    while (current <= toDate) {
      // Only consider business hours (9 AM - 6 PM)
      const hour = current.getHours();
      if (hour >= 9 && hour < 18) {
        // Check if this slot conflicts with existing sessions
        const slotEnd = new Date(current.getTime() + (duration * 60 * 1000));
        
        const hasConflict = existingSessions.some(session => {
          const sessionStart = new Date(session.date);
          const sessionEnd = new Date(sessionStart.getTime() + ((session.duration || 60) * 60 * 1000));
          
          return (current < sessionEnd && slotEnd > sessionStart);
        });

        if (!hasConflict) {
          availableSlots.push(new Date(current));
        }
      }
      
      // Move to next 30-minute slot
      current.setMinutes(current.getMinutes() + 30);
    }

    return availableSlots;
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
    const {
      coachId,
      clientEmail,
      clientFirstName,
      clientLastName,
      date,
      duration = 60,
      notes = '',
      status = 'scheduled',
    } = sessionData;

    // Validate coach exists
    const coach = await User.findById(coachId);
    if (!coach) {
      throw new Error('Coach not found');
    }

    // Check if coach has the coach role
    const coachRole = typeof coach.role === 'object' && 'name' in coach.role 
      ? coach.role.name 
      : coach.role.toString();
    
    if (coachRole !== 'coach') {
      throw new Error('User is not a coach');
    }

    // Validate session date is in the future
    const now = new Date();
    if (date <= now) {
      throw new Error('Session date must be in the future');
    }

    // Check for scheduling conflicts
    const conflictingSession = await CoachingSession.findOne({
      coachId,
      date: {
        $gte: new Date(date.getTime() - (duration * 60 * 1000) / 2),
        $lte: new Date(date.getTime() + (duration * 60 * 1000) / 2),
      },
      status: { $in: ['scheduled', 'in-progress'] },
    });

    if (conflictingSession) {
      throw new Error('Coach is not available at the requested time');
    }

    // Find or create client
    let client = await User.findOne({ email: clientEmail.toLowerCase() });
    
    if (!client) {
      // Create new client
      client = await User.create({
        email: clientEmail.toLowerCase(),
        firstName: clientFirstName,
        lastName: clientLastName,
        role: 'client',
        passwordHash: 'temp', // Will be set when user creates account
        passwordSalt: 'temp',
      });
    } else {
      // Update existing client info if needed (in case they provided updated info)
      const updateData: Partial<typeof client> = {};
      if (client.firstName !== clientFirstName) updateData.firstName = clientFirstName;
      if (client.lastName !== clientLastName) updateData.lastName = clientLastName;
      
      if (Object.keys(updateData).length > 0) {
        await User.findByIdAndUpdate(client._id, updateData);
      }
    }

    // Create the session
    const session = await CoachingSession.create({
      coachId: new Types.ObjectId(coachId),
      clientId: client._id,
      date,
      duration,
      notes,
      status,
      isPublicBooking: true,
      createdAt: now,
    });

    // Schedule notifications for the new session
    try {
      await notificationScheduler.scheduleSessionReminders(session);
    } catch (error) {
      console.error('Failed to schedule session reminders:', error);
      // Don't fail the session creation if notification scheduling fails
    }

    // Populate the session with coach and client info before returning
    const populatedSession = await CoachingSession.findById(session._id)
      .populate('coachId', 'firstName lastName email')
      .populate('clientId', 'firstName lastName email');

    if (!populatedSession) {
      throw new Error('Failed to retrieve created session');
    }

    return populatedSession;
  }
}

export default SessionService; 