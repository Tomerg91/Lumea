import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { APIError, ErrorCode } from './error';

// API Key configuration
interface ApiKeyConfig {
  id: string;
  key: string;
  name: string;
  permissions: string[];
  rateLimit: {
    windowMs: number;
    max: number;
  };
  allowedIps?: string[];
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
  lastUsed?: Date;
  usageCount: number;
}

// In-memory store for API keys (in production, use database)
const apiKeysStore = new Map<string, ApiKeyConfig>();
const apiKeyUsageStore = new Map<string, { count: number; resetTime: number }>();

// Initialize with some example API keys (in production, manage through admin interface)
const initializeApiKeys = () => {
  if (process.env.NODE_ENV === 'development') {
    // Example API key for development
    const devKey = {
      id: 'dev-key-1',
      key: 'sk_dev_' + crypto.randomBytes(32).toString('hex'),
      name: 'Development Key',
      permissions: ['read', 'write', 'admin'],
      rateLimit: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 1000 // 1000 requests per hour
      },
      isActive: true,
      createdAt: new Date(),
      usageCount: 0
    };
    
    apiKeysStore.set(devKey.key, devKey);
    console.log(`🔑 Development API Key created: ${devKey.key.substring(0, 20)}...`);
  }
};

// Initialize API keys on module load
initializeApiKeys();

// Generate a new API key
export const generateApiKey = (config: {
  name: string;
  permissions: string[];
  rateLimit?: { windowMs: number; max: number };
  allowedIps?: string[];
  expiresAt?: Date;
}): ApiKeyConfig => {
  const id = crypto.randomUUID();
  const key = 'sk_' + crypto.randomBytes(32).toString('hex');
  
  const apiKey: ApiKeyConfig = {
    id,
    key,
    name: config.name,
    permissions: config.permissions,
    rateLimit: config.rateLimit || {
      windowMs: 60 * 60 * 1000, // 1 hour default
      max: 100 // 100 requests per hour default
    },
    allowedIps: config.allowedIps,
    isActive: true,
    expiresAt: config.expiresAt,
    createdAt: new Date(),
    usageCount: 0
  };
  
  apiKeysStore.set(key, apiKey);
  return apiKey;
};

// Validate API key format
const isValidApiKeyFormat = (key: string): boolean => {
  return /^sk_[a-f0-9]{64}$/.test(key) || /^sk_dev_[a-f0-9]{64}$/.test(key);
};

// Check IP address against allowed IPs
const isIpAllowed = (clientIp: string, allowedIps: string[]): boolean => {
  if (!allowedIps || allowedIps.length === 0) {
    return true; // No IP restrictions
  }
  
  // Simple IP matching (in production, support CIDR notation)
  return allowedIps.includes(clientIp) || allowedIps.includes('*');
};

// Rate limiting for API keys
const checkApiKeyRateLimit = (apiKey: ApiKeyConfig): boolean => {
  const now = Date.now();
  const usage = apiKeyUsageStore.get(apiKey.key);
  
  if (!usage || now > usage.resetTime) {
    // Reset or create new usage tracking
    apiKeyUsageStore.set(apiKey.key, {
      count: 1,
      resetTime: now + apiKey.rateLimit.windowMs
    });
    return true;
  }
  
  if (usage.count >= apiKey.rateLimit.max) {
    return false; // Rate limit exceeded
  }
  
  usage.count++;
  return true;
};

// API key validation middleware
export const validateApiKey = (requiredPermissions: string[] = []) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check for API key in header
      const authHeader = req.headers.authorization;
      const apiKey = authHeader?.startsWith('Bearer ') 
        ? authHeader.substring(7)
        : req.headers['x-api-key'] as string;
      
      if (!apiKey) {
        throw new APIError(
          ErrorCode.UNAUTHORIZED,
          'API key required. Provide key in Authorization header or x-api-key header.',
          401
        );
      }
      
      // Validate key format
      if (!isValidApiKeyFormat(apiKey)) {
        throw new APIError(
          ErrorCode.INVALID_TOKEN,
          'Invalid API key format',
          401
        );
      }
      
      // Look up API key
      const keyConfig = apiKeysStore.get(apiKey);
      if (!keyConfig) {
        throw new APIError(
          ErrorCode.INVALID_TOKEN,
          'Invalid API key',
          401
        );
      }
      
      // Check if key is active
      if (!keyConfig.isActive) {
        throw new APIError(
          ErrorCode.FORBIDDEN,
          'API key is disabled',
          403
        );
      }
      
      // Check if key has expired
      if (keyConfig.expiresAt && keyConfig.expiresAt < new Date()) {
        throw new APIError(
          ErrorCode.TOKEN_EXPIRED,
          'API key has expired',
          401
        );
      }
      
      // Check IP restrictions
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      if (!isIpAllowed(clientIp, keyConfig.allowedIps || [])) {
        throw new APIError(
          ErrorCode.FORBIDDEN,
          'API key not allowed from this IP address',
          403
        );
      }
      
      // Check permissions
      const hasRequiredPermissions = requiredPermissions.every(permission =>
        keyConfig.permissions.includes(permission) || keyConfig.permissions.includes('admin')
      );
      
      if (!hasRequiredPermissions) {
        throw new APIError(
          ErrorCode.INSUFFICIENT_PERMISSIONS,
          `API key lacks required permissions: ${requiredPermissions.join(', ')}`,
          403
        );
      }
      
      // Check rate limits
      if (!checkApiKeyRateLimit(keyConfig)) {
        const usage = apiKeyUsageStore.get(apiKey);
        const resetTime = usage ? new Date(usage.resetTime) : new Date();
        
        throw APIError.rateLimit('API key rate limit exceeded', {
          limit: keyConfig.rateLimit.max,
          windowMs: keyConfig.rateLimit.windowMs,
          resetTime: resetTime.toISOString()
        });
      }
      
      // Update usage tracking
      keyConfig.lastUsed = new Date();
      keyConfig.usageCount++;
      
      // Add API key info to request
      (req as any).apiKey = {
        id: keyConfig.id,
        name: keyConfig.name,
        permissions: keyConfig.permissions
      };
      
      // Log API key usage
      console.info('🔑 API Key Used:', {
        keyId: keyConfig.id,
        keyName: keyConfig.name,
        method: req.method,
        path: req.path,
        ip: clientIp,
        userAgent: req.headers['user-agent'],
        usageCount: keyConfig.usageCount,
        timestamp: new Date().toISOString()
      });
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

// API key management endpoints middleware
export const requireApiKeyPermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const apiKey = (req as any).apiKey;
    
    if (!apiKey) {
      throw new APIError(
        ErrorCode.UNAUTHORIZED,
        'API key authentication required',
        401
      );
    }
    
    if (!apiKey.permissions.includes(permission) && !apiKey.permissions.includes('admin')) {
      throw new APIError(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        `Required permission: ${permission}`,
        403
      );
    }
    
    next();
  };
};

// Get API key usage statistics
export const getApiKeyUsage = (keyId?: string) => {
  if (keyId) {
    const keyConfig = Array.from(apiKeysStore.values()).find(key => key.id === keyId);
    if (!keyConfig) {
      return null;
    }
    
    const usage = apiKeyUsageStore.get(keyConfig.key);
    return {
      id: keyConfig.id,
      name: keyConfig.name,
      usageCount: keyConfig.usageCount,
      lastUsed: keyConfig.lastUsed,
      isActive: keyConfig.isActive,
      currentPeriodUsage: usage?.count || 0,
      rateLimit: keyConfig.rateLimit
    };
  }
  
  // Return all API key usage
  return Array.from(apiKeysStore.values()).map(keyConfig => {
    const usage = apiKeyUsageStore.get(keyConfig.key);
    return {
      id: keyConfig.id,
      name: keyConfig.name,
      usageCount: keyConfig.usageCount,
      lastUsed: keyConfig.lastUsed,
      isActive: keyConfig.isActive,
      currentPeriodUsage: usage?.count || 0,
      rateLimit: keyConfig.rateLimit
    };
  });
};

// Disable/enable API key
export const setApiKeyStatus = (keyId: string, isActive: boolean): boolean => {
  const keyConfig = Array.from(apiKeysStore.values()).find(key => key.id === keyId);
  if (!keyConfig) {
    return false;
  }
  
  keyConfig.isActive = isActive;
  return true;
};

// Delete API key
export const deleteApiKey = (keyId: string): boolean => {
  const keyConfig = Array.from(apiKeysStore.values()).find(key => key.id === keyId);
  if (!keyConfig) {
    return false;
  }
  
  apiKeysStore.delete(keyConfig.key);
  apiKeyUsageStore.delete(keyConfig.key);
  return true;
};

// Cleanup expired keys and old usage data
export const cleanupApiKeys = () => {
  const now = new Date();
  
  // Remove expired keys
  for (const [key, config] of apiKeysStore.entries()) {
    if (config.expiresAt && config.expiresAt < now) {
      apiKeysStore.delete(key);
      apiKeyUsageStore.delete(key);
    }
  }
  
  // Clean up old usage data
  const currentTime = Date.now();
  for (const [key, usage] of apiKeyUsageStore.entries()) {
    if (currentTime > usage.resetTime + 24 * 60 * 60 * 1000) { // 24 hours old
      apiKeyUsageStore.delete(key);
    }
  }
};

// Start periodic cleanup
if (process.env.NODE_ENV !== 'test') {
  setInterval(cleanupApiKeys, 60 * 60 * 1000); // Clean every hour
}

// Export API key store for admin operations
export { apiKeysStore }; 