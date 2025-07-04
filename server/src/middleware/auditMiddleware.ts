import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/auditService';
import { getClientIp } from './security';
import crypto from 'crypto';

// PHI-sensitive endpoints that require special audit logging
const PHI_ENDPOINTS = [
  '/api/sessions',
  '/api/reflections',
  '/api/coach-notes',
  '/api/users',
  '/api/coach/clients'
];

// High-risk endpoints that require elevated audit logging
const HIGH_RISK_ENDPOINTS = [
  '/api/admin',
  '/api/auth',
  '/api/compliance'
];

// Determine if endpoint accesses PHI data
function isPHIEndpoint(endpoint: string): boolean {
  return PHI_ENDPOINTS.some(pattern => endpoint.startsWith(pattern));
}

// Determine if endpoint is high-risk
function isHighRiskEndpoint(endpoint: string): boolean {
  return HIGH_RISK_ENDPOINTS.some(pattern => endpoint.startsWith(pattern));
}

// Determine PHI type based on endpoint
function getPHIType(endpoint: string): string | undefined {
  if (endpoint.startsWith('/api/sessions')) return 'coaching_session';
  if (endpoint.startsWith('/api/reflections')) return 'reflection';
  if (endpoint.startsWith('/api/coach-notes')) return 'session_notes';
  if (endpoint.startsWith('/api/users')) return 'user_profile';
  if (endpoint.startsWith('/api/coach/clients')) return 'user_profile';
  return undefined;
}

// Determine data classification based on endpoint and method
function getDataClassification(endpoint: string, method: string): 'public' | 'internal' | 'confidential' | 'restricted' {
  if (isPHIEndpoint(endpoint)) return 'restricted';
  if (isHighRiskEndpoint(endpoint)) return 'confidential';
  if (endpoint.startsWith('/api/auth')) return 'confidential';
  if (method === 'GET' && endpoint.startsWith('/api/public')) return 'public';
  return 'internal';
}

// Determine risk level based on endpoint, method, and context
function getRiskLevel(endpoint: string, method: string, statusCode?: number): 'low' | 'medium' | 'high' | 'critical' {
  // Failed authentication attempts
  if (endpoint.includes('/auth') && statusCode && statusCode >= 400) return 'high';
  
  // PHI data modifications
  if (isPHIEndpoint(endpoint) && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return 'high';
  
  // PHI data access
  if (isPHIEndpoint(endpoint) && method === 'GET') return 'medium';
  
  // High-risk endpoint access
  if (isHighRiskEndpoint(endpoint)) return 'medium';
  
  // Admin operations
  if (endpoint.startsWith('/api/admin')) return 'high';
  
  // Failed requests
  if (statusCode && statusCode >= 500) return 'medium';
  if (statusCode && statusCode >= 400) return 'low';
  
  return 'low';
}

// Get event type based on endpoint and method
function getEventType(endpoint: string, method: string): 'user_action' | 'system_event' | 'security_event' | 'data_access' | 'admin_action' {
  if (endpoint.startsWith('/api/admin')) return 'admin_action';
  if (endpoint.includes('/auth') || endpoint.includes('/security')) return 'security_event';
  if (method === 'GET') return 'data_access';
  return 'user_action';
}

// Get event category based on endpoint and method
function getEventCategory(endpoint: string, method: string): 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'system_admin' | 'security_incident' {
  if (endpoint.includes('/auth')) return 'authentication';
  if (endpoint.startsWith('/api/admin')) return 'system_admin';
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return 'data_modification';
  return 'data_access';
}

// Extract resource name from endpoint
function getResourceName(endpoint: string): string {
  const parts = endpoint.split('/').filter(Boolean);
  if (parts.length >= 2) {
    return parts[1]; // e.g., '/api/users' -> 'users'
  }
  return 'unknown';
}

// Get action name based on HTTP method
function getActionName(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET': return 'READ';
    case 'POST': return 'CREATE';
    case 'PUT': 
    case 'PATCH': return 'UPDATE';
    case 'DELETE': return 'DELETE';
    default: return method.toUpperCase();
  }
}

/**
 * Audit middleware for automatic request/response logging
 */
export const auditMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Add request ID and start time for tracking
  (req as any).id = crypto.randomUUID();
  (req as any).startTime = Date.now();

  // Skip audit logging for health checks and static assets
  if (req.path === '/api/health' || 
      req.path.startsWith('/static') || 
      req.path.startsWith('/assets') ||
      req.path.endsWith('.js') ||
      req.path.endsWith('.css') ||
      req.path.endsWith('.ico')) {
    return next();
  }

  // Capture original response methods
  const originalSend = res.send;
  const originalJson = res.json;

  // Override response methods to capture response data
  res.send = function(body) {
    logAuditEvent(req, res, body);
    return originalSend.call(this, body);
  };

  res.json = function(body) {
    logAuditEvent(req, res, body);
    return originalJson.call(this, body);
  };

  next();
};

/**
 * Log audit event after response is sent
 */
async function logAuditEvent(req: Request, res: Response, responseBody?: any) {
  try {
    const endpoint = req.originalUrl;
    const method = req.method;
    const statusCode = res.statusCode;
    const user = req.user as any;
    
    const isPHI = isPHIEndpoint(endpoint);
    const phiType = getPHIType(endpoint);
    const dataClassification = getDataClassification(endpoint, method);
    const riskLevel = getRiskLevel(endpoint, method, statusCode);
    const eventType = getEventType(endpoint, method);
    const eventCategory = getEventCategory(endpoint, method);
    const resource = getResourceName(endpoint);
    const action = getActionName(method);

    // Create audit log entry
    await auditService.auditRequest(
      req,
      action,
      resource,
      `${method} ${endpoint} - ${statusCode}`,
      {
        phiAccessed: isPHI,
        phiType,
        dataClassification,
        riskLevel,
        eventType,
        eventCategory,
        statusCode,
        complianceFlags: isPHI ? ['HIPAA'] : undefined,
        suspicious: statusCode >= 400 && statusCode < 500 && endpoint.includes('/auth'),
        metadata: {
          responseSize: responseBody ? JSON.stringify(responseBody).length : 0,
          userAgent: req.get('User-Agent'),
          referer: req.get('Referer'),
          contentType: req.get('Content-Type')
        }
      }
    );
  } catch (error) {
    // Don't let audit logging failures break the application
    console.error('Audit logging failed:', error);
  }
}

/**
 * Middleware specifically for PHI access logging
 */
export const auditPHIAccess = (phiType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract resource ID from request params
      const resourceId = req.params.id || req.params.sessionId || req.params.userId;
      
      await auditService.auditPHIAccess(
        req,
        phiType,
        resourceId || 'unknown',
        getActionName(req.method),
        `Accessed ${phiType} via ${req.method} ${req.originalUrl}`
      );
    } catch (error) {
      console.error('PHI audit logging failed:', error);
    }
    
    next();
  };
};

/**
 * Middleware for authentication event logging
 */
export const auditAuthentication = (action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      const userId = user?.id || user?._id || req.body?.email;
      const authMethod = req.body?.provider || 'password';
      const success = action !== 'LOGIN_FAILED';

      await auditService.auditAuthentication(
        req,
        action,
        userId,
        authMethod,
        success
      );
    } catch (error) {
      console.error('Authentication audit logging failed:', error);
    }
    
    next();
  };
};

/**
 * Middleware for data modification logging
 */
export const auditDataModification = (resource: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const resourceId = req.params.id || req.params.sessionId || req.params.userId;
      const action = getActionName(req.method) as 'CREATE' | 'UPDATE' | 'DELETE';
      
      // For UPDATE operations, we might want to capture old values
      // This would require additional logic to fetch the current state
      const oldValues = req.method === 'PUT' || req.method === 'PATCH' ? 
        { note: 'Old values not captured in this implementation' } : undefined;
      
      const newValues = req.body;

      await auditService.auditDataModification(
        req,
        resource,
        resourceId || 'unknown',
        action,
        oldValues,
        newValues
      );
    } catch (error) {
      console.error('Data modification audit logging failed:', error);
    }
    
    next();
  };
};

/**
 * Middleware for security event logging
 */
export const auditSecurityEvent = (description: string, riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await auditService.auditSecurityEvent(
        req,
        description,
        riskLevel,
        riskLevel === 'high' || riskLevel === 'critical'
      );
    } catch (error) {
      console.error('Security event audit logging failed:', error);
    }
    
    next();
  };
}; 