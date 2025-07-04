import { logger } from './logger';
import { getClientIp } from '../middleware/security';
import crypto from 'crypto';

export interface CreateHistoryEntryRequest {
  sessionId: string;
  action: SessionHistoryAction;
  actionBy: string; // User ID
  description: string;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: {
    cancellationReason?: string;
    cancellationReasonText?: string;
    cancellationFee?: number;
    refundEligible?: boolean;
    originalDate?: Date;
    newDate?: Date;
    rescheduleReason?: string;
    rescheduleCount?: number;
    field?: string;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
    source?: 'web' | 'mobile' | 'api' | 'system';
  };
  systemGenerated?: boolean;
}

export interface SessionHistoryFilter {
  sessionId?: string;
  actionBy?: string;
  action?: SessionHistoryAction | SessionHistoryAction[];
  dateFrom?: Date;
  dateTo?: Date;
  systemGenerated?: boolean;
  limit?: number;
  offset?: number;
}

export interface SessionAnalytics {
  totalSessions: number;
  totalCancellations: number;
  totalRescheduling: number;
  cancellationRate: number;
  reschedulingRate: number;
  commonCancellationReasons: Array<{ reason: string; count: number }>;
  commonRescheduleReasons: Array<{ reason: string; count: number }>;
  monthlyTrends: Array<{
    month: string;
    year: number;
    created: number;
    cancelled: number;
    rescheduled: number;
    completed: number;
  }>;
  userActivitySummary: Array<{
    userId: string;
    userName: string;
    role: string;
    totalActions: number;
    cancellations: number;
    rescheduling: number;
  }>;
}

export interface AuditLogEntry {
  // Required fields
  action: string;
  resource: string;
  description: string;
  ipAddress: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  eventType: 'user_action' | 'system_event' | 'security_event' | 'data_access' | 'admin_action';
  eventCategory: 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'system_admin' | 'security_incident';
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  
  // Optional fields
  userId?: string;
  userEmail?: string;
  userRole?: string;
  sessionId?: string;
  resourceId?: string;
  userAgent?: string;
  requestId?: string;
  
  // HIPAA-specific
  phiAccessed?: boolean;
  phiType?: string;
  
  // Security context
  authMethod?: string;
  
  // Request details
  httpMethod?: string;
  endpoint?: string;
  statusCode?: number;
  responseTime?: number;
  
  // Data changes
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changedFields?: string[];
  
  // Additional context
  metadata?: Record<string, any>;
  complianceFlags?: string[];
  
  // Security flags
  suspicious?: boolean;
  flaggedReason?: string;
  
  // Geolocation
  location?: {
    country?: string;
    region?: string;
    city?: string;
    coordinates?: [number, number];
  };
  
  // Correlation
  correlationId?: string;
  parentEventId?: string;
}

export interface AuditQueryOptions {
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  action?: string;
  resource?: string;
  eventType?: string;
  eventCategory?: string;
  riskLevel?: string;
  phiAccessed?: boolean;
  suspicious?: boolean;
  investigationStatus?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  searchText?: string;
}

export interface AuditStatistics {
  totalLogs: number;
  phiAccessCount: number;
  suspiciousActivityCount: number;
  riskLevelBreakdown: Record<string, number>;
  eventTypeBreakdown: Record<string, number>;
  topUsers: Array<{ userId: string; userEmail: string; count: number }>;
  topResources: Array<{ resource: string; count: number }>;
  recentActivity: IAuditLog[];
  complianceMetrics: {
    hipaaCompliantLogs: number;
    retentionCompliance: number;
    dataClassificationBreakdown: Record<string, number>;
  };
}

export class AuditService {
  private static instance: AuditService;
  private correlationIdMap = new Map<string, string>();

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  /**
   * Create a new history entry for a session
   */
  static async createHistoryEntry(request: CreateHistoryEntryRequest): Promise<ISessionHistory> {
    try {
      const historyEntry = new SessionHistory({
        sessionId: new Types.ObjectId(request.sessionId),
        action: request.action,
        actionBy: new Types.ObjectId(request.actionBy),
        timestamp: new Date(),
        previousValues: request.previousValues,
        newValues: request.newValues,
        metadata: request.metadata,
        description: request.description,
        systemGenerated: request.systemGenerated || false,
      });

      return await historyEntry.save();
    } catch (error) {
      console.error('Error creating history entry:', error);
      throw new Error('Failed to create audit trail entry');
    }
  }

  /**
   * Get session history with filtering and pagination
   */
  static async getSessionHistory(filter: SessionHistoryFilter): Promise<{
    history: ISessionHistory[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const query: Record<string, any> = {};

      // Build query based on filters
      if (filter.sessionId) {
        query.sessionId = new Types.ObjectId(filter.sessionId);
      }

      if (filter.actionBy) {
        query.actionBy = new Types.ObjectId(filter.actionBy);
      }

      if (filter.action) {
        if (Array.isArray(filter.action)) {
          query.action = { $in: filter.action };
        } else {
          query.action = filter.action;
        }
      }

      if (filter.dateFrom || filter.dateTo) {
        query.timestamp = {};
        if (filter.dateFrom) {
          query.timestamp.$gte = filter.dateFrom;
        }
        if (filter.dateTo) {
          query.timestamp.$lte = filter.dateTo;
        }
      }

      if (filter.systemGenerated !== undefined) {
        query.systemGenerated = filter.systemGenerated;
      }

      // Pagination
      const limit = filter.limit || 20;
      const offset = filter.offset || 0;
      const page = Math.floor(offset / limit) + 1;

      // Execute query
      const [history, total] = await Promise.all([
        SessionHistory.find(query)
          .populate('actionBy', 'firstName lastName email role')
          .populate('sessionId', 'date status coachId clientId')
          .sort({ timestamp: -1 })
          .limit(limit)
          .skip(offset)
          .lean(),
        SessionHistory.countDocuments(query),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        history: history as ISessionHistory[],
        total,
        page,
        totalPages,
      };
    } catch (error) {
      console.error('Error fetching session history:', error);
      throw new Error('Failed to fetch session history');
    }
  }

  /**
   * Get analytics for session changes and patterns
   */
  static async getSessionAnalytics(
    coachId?: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<SessionAnalytics> {
    try {
      // Build base match conditions
      const matchConditions: Record<string, any> = {};

      if (dateFrom || dateTo) {
        matchConditions.timestamp = {};
        if (dateFrom) matchConditions.timestamp.$gte = dateFrom;
        if (dateTo) matchConditions.timestamp.$lte = dateTo;
      }

      // If coachId is provided, we need to match sessions for that coach
      let sessionFilter = {};
      if (coachId) {
        sessionFilter = { coachId: new Types.ObjectId(coachId) };
      }

      // Use simpler queries instead of complex aggregation pipeline
      // Get action counts
      const actionCountsResult = await SessionHistory.aggregate([
        ...(coachId ? [
          {
            $lookup: {
              from: 'coachingsessions',
              localField: 'sessionId',
              foreignField: '_id',
              as: 'session',
            },
          },
          { $match: { 'session.coachId': new Types.ObjectId(coachId) } }
        ] : []),
        { $match: matchConditions },
        { $group: { _id: '$action', count: { $sum: 1 } } },
      ]);

      // Get cancellation reasons
      const cancellationReasons = await SessionHistory.aggregate([
        ...(coachId ? [
          {
            $lookup: {
              from: 'coachingsessions',
              localField: 'sessionId',
              foreignField: '_id',
              as: 'session',
            },
          },
          { $match: { 'session.coachId': new Types.ObjectId(coachId) } }
        ] : []),
        { $match: { ...matchConditions, action: 'cancelled' } },
        { $group: { _id: '$metadata.cancellationReason', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      // Get reschedule reasons
      const rescheduleReasons = await SessionHistory.aggregate([
        ...(coachId ? [
          {
            $lookup: {
              from: 'coachingsessions',
              localField: 'sessionId',
              foreignField: '_id',
              as: 'session',
            },
          },
          { $match: { 'session.coachId': new Types.ObjectId(coachId) } }
        ] : []),
        { $match: { ...matchConditions, action: 'rescheduled' } },
        { $group: { _id: '$metadata.rescheduleReason', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      // Get monthly trends
      const monthlyTrends = await SessionHistory.aggregate([
        ...(coachId ? [
          {
            $lookup: {
              from: 'coachingsessions',
              localField: 'sessionId',
              foreignField: '_id',
              as: 'session',
            },
          },
          { $match: { 'session.coachId': new Types.ObjectId(coachId) } }
        ] : []),
        { $match: matchConditions },
        {
          $group: {
            _id: {
              year: { $year: '$timestamp' },
              month: { $month: '$timestamp' },
              action: '$action',
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
      ]);

      // Get user activity
      const userActivity = await SessionHistory.aggregate([
        ...(coachId ? [
          {
            $lookup: {
              from: 'coachingsessions',
              localField: 'sessionId',
              foreignField: '_id',
              as: 'session',
            },
          },
          { $match: { 'session.coachId': new Types.ObjectId(coachId) } }
        ] : []),
        { $match: matchConditions },
        {
          $group: {
            _id: {
              userId: '$actionBy',
              action: '$action',
            },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: '$_id.userId',
            totalActions: { $sum: '$count' },
            actions: {
              $push: {
                action: '$_id.action',
                count: '$count',
              },
            },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
      ]);

      const results = {
        actionCounts: actionCountsResult,
        cancellationReasons,
        rescheduleReasons,
        monthlyTrends,
        userActivity,
      };

      // Process results to create analytics object
      const actionCountsByType = results.actionCounts.reduce((acc: Record<string, number>, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {});

      const totalSessions = actionCountsByType.created || 0;
      const totalCancellations = actionCountsByType.cancelled || 0;
      const totalRescheduling = actionCountsByType.rescheduled || 0;

      // Calculate rates
      const cancellationRate = totalSessions > 0 ? (totalCancellations / totalSessions) * 100 : 0;
      const reschedulingRate = totalSessions > 0 ? (totalRescheduling / totalSessions) * 100 : 0;

      // Process monthly trends
      const monthlyTrendsMap = new Map();
      results.monthlyTrends.forEach((item: any) => {
        const key = `${item._id.year}-${item._id.month}`;
        if (!monthlyTrendsMap.has(key)) {
          monthlyTrendsMap.set(key, {
            month: new Date(item._id.year, item._id.month - 1).toLocaleString('default', { month: 'long' }),
            year: item._id.year,
            created: 0,
            cancelled: 0,
            rescheduled: 0,
            completed: 0,
          });
        }
        const trend = monthlyTrendsMap.get(key);
        trend[item._id.action] = item.count;
      });

      // Process user activity
      const userActivitySummary = results.userActivity.map((item: any) => {
        const cancellations = item.actions.find((a: any) => a.action === 'cancelled')?.count || 0;
        const rescheduling = item.actions.find((a: any) => a.action === 'rescheduled')?.count || 0;

        return {
          userId: item._id.toString(),
          userName: `${item.user.firstName} ${item.user.lastName}`,
          role: item.user.role,
          totalActions: item.totalActions,
          cancellations,
          rescheduling,
        };
      });

      return {
        totalSessions,
        totalCancellations,
        totalRescheduling,
        cancellationRate: Math.round(cancellationRate * 100) / 100,
        reschedulingRate: Math.round(reschedulingRate * 100) / 100,
        commonCancellationReasons: results.cancellationReasons.map((item: any) => ({
          reason: item._id || 'Unknown',
          count: item.count,
        })),
        commonRescheduleReasons: results.rescheduleReasons.map((item: any) => ({
          reason: item._id || 'Unknown',
          count: item.count,
        })),
        monthlyTrends: Array.from(monthlyTrendsMap.values()),
        userActivitySummary,
      };
    } catch (error) {
      console.error('Error generating session analytics:', error);
      throw new Error('Failed to generate session analytics');
    }
  }

  /**
   * Track session creation
   */
  static async trackSessionCreated(
    session: ICoachingSession,
    createdBy: string,
    metadata?: { source?: 'web' | 'mobile' | 'api'; ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    await this.createHistoryEntry({
      sessionId: session._id.toString(),
      action: 'created',
      actionBy: createdBy,
      description: `Session created for ${new Date(session.date).toLocaleString()}`,
      newValues: {
        date: session.date,
        status: session.status,
        duration: session.duration,
      },
      metadata: {
        source: metadata?.source || 'web',
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      },
      systemGenerated: false,
    });
  }

  /**
   * Track session cancellation
   */
  static async trackSessionCancelled(
    session: ICoachingSession,
    cancelledBy: string,
    reason: string,
    reasonText?: string,
    metadata?: { cancellationFee?: number; refundEligible?: boolean; source?: 'web' | 'mobile' | 'api' }
  ): Promise<void> {
    await this.createHistoryEntry({
      sessionId: session._id.toString(),
      action: 'cancelled',
      actionBy: cancelledBy,
      description: `Session cancelled: ${reason}${reasonText ? ` - ${reasonText}` : ''}`,
      previousValues: {
        status: 'pending',
        date: session.date,
      },
      newValues: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
      metadata: {
        cancellationReason: reason,
        cancellationReasonText: reasonText,
        cancellationFee: metadata?.cancellationFee,
        refundEligible: metadata?.refundEligible,
        source: metadata?.source || 'web',
      },
      systemGenerated: false,
    });
  }

  /**
   * Track session rescheduling
   */
  static async trackSessionRescheduled(
    session: ICoachingSession,
    rescheduledBy: string,
    originalDate: Date,
    newDate: Date,
    reason: string,
    rescheduleCount: number,
    metadata?: { source?: 'web' | 'mobile' | 'api' }
  ): Promise<void> {
    await this.createHistoryEntry({
      sessionId: session._id.toString(),
      action: 'rescheduled',
      actionBy: rescheduledBy,
      description: `Session rescheduled from ${originalDate.toLocaleString()} to ${newDate.toLocaleString()}: ${reason}`,
      previousValues: {
        date: originalDate,
        status: 'pending',
      },
      newValues: {
        date: newDate,
        status: 'rescheduled',
        rescheduledAt: new Date(),
      },
      metadata: {
        originalDate,
        newDate,
        rescheduleReason: reason,
        rescheduleCount,
        source: metadata?.source || 'web',
      },
      systemGenerated: false,
    });
  }

  /**
   * Track status changes
   */
  static async trackStatusChange(
    session: ICoachingSession,
    changedBy: string,
    previousStatus: string,
    newStatus: string,
    metadata?: { reason?: string; source?: 'web' | 'mobile' | 'api' | 'system' }
  ): Promise<void> {
    await this.createHistoryEntry({
      sessionId: session._id.toString(),
      action: 'status_changed',
      actionBy: changedBy,
      description: `Session status changed from ${previousStatus} to ${newStatus}`,
      previousValues: { status: previousStatus },
      newValues: { status: newStatus },
      metadata: {
        field: 'status',
        reason: metadata?.reason,
        source: metadata?.source || 'web',
      },
      systemGenerated: metadata?.source === 'system',
    });
  }

  /**
   * Create an audit log entry
   */
  async createAuditLog(entry: AuditLogEntry): Promise<IAuditLog> {
    try {
      const auditLog = new AuditLog({
        timestamp: new Date(),
        ...entry,
        serverInstance: process.env.SERVER_INSTANCE || 'default',
        applicationVersion: process.env.npm_package_version || '1.0.0'
      });

      const savedLog = await auditLog.save();
      
      // Log high-risk or suspicious activities immediately
      if (entry.riskLevel === 'critical' || entry.riskLevel === 'high' || entry.suspicious) {
        logger.warn('High-risk audit event recorded', {
          auditLogId: savedLog._id,
          action: entry.action,
          resource: entry.resource,
          userId: entry.userId,
          riskLevel: entry.riskLevel,
          suspicious: entry.suspicious
        });
      }

      return savedLog;
    } catch (error) {
      logger.error('Failed to create audit log', error);
      throw new Error('Failed to create audit log');
    }
  }

  /**
   * Create audit log from Express request
   */
  async auditRequest(
    req: Request,
    action: string,
    resource: string,
    description: string,
    options: Partial<AuditLogEntry> = {}
  ): Promise<IAuditLog> {
    const user = req.user as any;
    const startTime = (req as any).startTime || Date.now();
    const responseTime = Date.now() - startTime;

    const entry: AuditLogEntry = {
      action,
      resource,
      description,
      ipAddress: getClientIp(req),
      userAgent: req.get('User-Agent'),
      httpMethod: req.method,
      endpoint: req.originalUrl,
      responseTime,
      requestId: (req as any).id || crypto.randomUUID(),
      
      // User information
      userId: user?.id || user?._id,
      userEmail: user?.email,
      userRole: user?.role,
      sessionId: req.sessionID,
      
      // Default values
      riskLevel: 'low',
      eventType: 'user_action',
      eventCategory: 'data_access',
      dataClassification: 'internal',
      
      // Override with provided options
      ...options
    };

    return this.createAuditLog(entry);
  }

  /**
   * Audit PHI access
   */
  async auditPHIAccess(
    req: Request,
    phiType: string,
    resourceId: string,
    action: string = 'READ',
    description?: string
  ): Promise<IAuditLog> {
    return this.auditRequest(
      req,
      action,
      'phi_data',
      description || `Accessed ${phiType} data`,
      {
        phiAccessed: true,
        phiType,
        resourceId,
        riskLevel: 'medium',
        eventType: 'data_access',
        eventCategory: 'data_access',
        dataClassification: 'restricted',
        complianceFlags: ['HIPAA']
      }
    );
  }

  /**
   * Audit authentication events
   */
  async auditAuthentication(
    req: Request,
    action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED',
    userId?: string,
    authMethod?: string,
    success: boolean = true
  ): Promise<IAuditLog> {
    return this.auditRequest(
      req,
      action,
      'authentication',
      `User ${action.toLowerCase()} ${success ? 'successful' : 'failed'}`,
      {
        userId,
        authMethod,
        riskLevel: success ? 'low' : 'medium',
        eventType: 'security_event',
        eventCategory: 'authentication',
        dataClassification: 'internal',
        suspicious: !success
      }
    );
  }

  /**
   * Audit data modifications
   */
  async auditDataModification(
    req: Request,
    resource: string,
    resourceId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>
  ): Promise<IAuditLog> {
    const changedFields = oldValues && newValues 
      ? Object.keys(newValues).filter(key => 
          JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])
        )
      : undefined;

    return this.auditRequest(
      req,
      action,
      resource,
      `${action} operation on ${resource}`,
      {
        resourceId,
        oldValues,
        newValues,
        changedFields,
        riskLevel: action === 'DELETE' ? 'high' : 'medium',
        eventType: 'user_action',
        eventCategory: 'data_modification',
        dataClassification: 'confidential'
      }
    );
  }

  /**
   * Audit security events
   */
  async auditSecurityEvent(
    req: Request,
    description: string,
    riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    suspicious: boolean = false,
    flaggedReason?: string
  ): Promise<IAuditLog> {
    return this.auditRequest(
      req,
      'SECURITY_EVENT',
      'security',
      description,
      {
        riskLevel,
        eventType: 'security_event',
        eventCategory: 'security_incident',
        dataClassification: 'restricted',
        suspicious,
        flaggedReason
      }
    );
  }

  /**
   * Query audit logs with filtering and pagination
   */
  async queryAuditLogs(options: AuditQueryOptions = {}): Promise<{
    logs: IAuditLog[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        userId,
        startDate,
        endDate,
        action,
        resource,
        eventType,
        eventCategory,
        riskLevel,
        phiAccessed,
        suspicious,
        investigationStatus,
        limit = 50,
        offset = 0,
        sortBy = 'timestamp',
        sortOrder = 'desc',
        searchText
      } = options;

      // Build query
      const query: any = {};

      if (userId) query.userId = userId;
      if (action) query.action = action;
      if (resource) query.resource = resource;
      if (eventType) query.eventType = eventType;
      if (eventCategory) query.eventCategory = eventCategory;
      if (riskLevel) query.riskLevel = riskLevel;
      if (phiAccessed !== undefined) query.phiAccessed = phiAccessed;
      if (suspicious !== undefined) query.suspicious = suspicious;
      if (investigationStatus) query.investigationStatus = investigationStatus;

      // Date range
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = startDate;
        if (endDate) query.timestamp.$lte = endDate;
      }

      // Text search
      if (searchText) {
        query.$text = { $search: searchText };
      }

      // Execute query
      const sortDirection = sortOrder === 'desc' ? -1 : 1;
      const sortOptions: any = { [sortBy]: sortDirection };

      const [logs, total] = await Promise.all([
        AuditLog.find(query)
          .sort(sortOptions)
          .skip(offset)
          .limit(limit)
          .lean(),
        AuditLog.countDocuments(query)
      ]);

      const page = Math.floor(offset / limit) + 1;
      const totalPages = Math.ceil(total / limit);

      return {
        logs: logs as IAuditLog[],
        total,
        page,
        totalPages
      };
    } catch (error) {
      logger.error('Failed to query audit logs', error);
      throw new Error('Failed to query audit logs');
    }
  }

  /**
   * Get audit statistics for dashboard
   */
  async getAuditStatistics(
    startDate?: Date,
    endDate?: Date
  ): Promise<AuditStatistics> {
    try {
      const dateFilter: any = {};
      if (startDate || endDate) {
        dateFilter.timestamp = {};
        if (startDate) dateFilter.timestamp.$gte = startDate;
        if (endDate) dateFilter.timestamp.$lte = endDate;
      }

      const [
        totalLogs,
        phiAccessCount,
        suspiciousActivityCount,
        riskLevelBreakdown,
        eventTypeBreakdown,
        topUsers,
        topResources,
        recentActivity,
        dataClassificationBreakdown,
        hipaaCompliantLogs
      ] = await Promise.all([
        // Total logs
        AuditLog.countDocuments(dateFilter),
        
        // PHI access count
        AuditLog.countDocuments({ ...dateFilter, phiAccessed: true }),
        
        // Suspicious activity count
        AuditLog.countDocuments({ ...dateFilter, suspicious: true }),
        
        // Risk level breakdown
        AuditLog.aggregate([
          { $match: dateFilter },
          { $group: { _id: '$riskLevel', count: { $sum: 1 } } }
        ]),
        
        // Event type breakdown
        AuditLog.aggregate([
          { $match: dateFilter },
          { $group: { _id: '$eventType', count: { $sum: 1 } } }
        ]),
        
        // Top users
        AuditLog.aggregate([
          { $match: { ...dateFilter, userId: { $exists: true } } },
          { $group: { 
            _id: { userId: '$userId', userEmail: '$userEmail' }, 
            count: { $sum: 1 } 
          }},
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]),
        
        // Top resources
        AuditLog.aggregate([
          { $match: dateFilter },
          { $group: { _id: '$resource', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]),
        
        // Recent activity
        AuditLog.find(dateFilter)
          .sort({ timestamp: -1 })
          .limit(20)
          .lean(),
        
        // Data classification breakdown
        AuditLog.aggregate([
          { $match: dateFilter },
          { $group: { _id: '$dataClassification', count: { $sum: 1 } } }
        ]),
        
        // HIPAA compliant logs
        AuditLog.countDocuments({ 
          ...dateFilter, 
          complianceFlags: 'HIPAA' 
        })
      ]);

      // Format aggregation results
      const formatBreakdown = (data: any[]) => 
        data.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {});

      return {
        totalLogs,
        phiAccessCount,
        suspiciousActivityCount,
        riskLevelBreakdown: formatBreakdown(riskLevelBreakdown),
        eventTypeBreakdown: formatBreakdown(eventTypeBreakdown),
        topUsers: topUsers.map((user: any) => ({
          userId: user._id.userId,
          userEmail: user._id.userEmail,
          count: user.count
        })),
        topResources: topResources.map((resource: any) => ({
          resource: resource._id,
          count: resource.count
        })),
        recentActivity: recentActivity as IAuditLog[],
        complianceMetrics: {
          hipaaCompliantLogs,
          retentionCompliance: Math.round((totalLogs / Math.max(totalLogs, 1)) * 100),
          dataClassificationBreakdown: formatBreakdown(dataClassificationBreakdown)
        }
      };
    } catch (error) {
      logger.error('Failed to get audit statistics', error);
      throw new Error('Failed to get audit statistics');
    }
  }

  /**
   * Generate correlation ID for related events
   */
  generateCorrelationId(): string {
    return crypto.randomUUID();
  }

  /**
   * Mark audit log as suspicious
   */
  async markSuspicious(
    auditLogId: string,
    flaggedReason: string,
    investigationStatus: string = 'pending'
  ): Promise<void> {
    try {
      await AuditLog.findByIdAndUpdate(auditLogId, {
        suspicious: true,
        flaggedReason,
        investigationStatus
      });

      logger.warn('Audit log marked as suspicious', {
        auditLogId,
        flaggedReason,
        investigationStatus
      });
    } catch (error) {
      logger.error('Failed to mark audit log as suspicious', error);
      throw new Error('Failed to mark audit log as suspicious');
    }
  }

  /**
   * Clean up expired audit logs (based on retention date)
   */
  async cleanupExpiredLogs(): Promise<number> {
    console.warn('cleanupExpiredLogs is a placeholder. Implement with Supabase.');
    return 0;
  }
}

// Export singleton instance
export const auditService = AuditService.getInstance(); 