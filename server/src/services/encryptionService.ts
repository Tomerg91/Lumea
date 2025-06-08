import crypto from 'crypto';
import { promisify } from 'util';
import bcrypt from 'bcrypt';

export interface EncryptionKey {
  id: string;
  key: Buffer;
  version: number;
  createdAt: Date;
  expiresAt?: Date;
  algorithm: string;
  purpose: 'data' | 'backup' | 'transit';
  isActive: boolean;
}

export interface EncryptedData {
  data: string;
  keyId: string;
  keyVersion: number;
  algorithm: string;
  iv: string;
  authTag?: string;
  metadata?: Record<string, any>;
}

export interface KeyRotationPolicy {
  id: string;
  purpose: 'data' | 'backup' | 'transit';
  rotationIntervalDays: number;
  maxKeyAge: number;
  requiresApproval: boolean;
  notifyBefore: number; // days before expiration
  autoRotate: boolean;
  retentionPeriod: number; // days to keep old keys
}

export interface EncryptionMetrics {
  totalEncryptions: number;
  totalDecryptions: number;
  keyRotations: number;
  failedOperations: number;
  averageEncryptionTime: number;
  averageDecryptionTime: number;
  keyUsageStats: Record<string, number>;
  lastRotation: Date | null;
  nextScheduledRotation: Date | null;
}

export class EncryptionService {
  private static instance: EncryptionService;
  private keys: Map<string, EncryptionKey> = new Map();
  private activeKeys: Map<string, string> = new Map(); // purpose -> keyId
  private metrics: EncryptionMetrics = {
    totalEncryptions: 0,
    totalDecryptions: 0,
    keyRotations: 0,
    failedOperations: 0,
    averageEncryptionTime: 0,
    averageDecryptionTime: 0,
    keyUsageStats: {},
    lastRotation: null,
    nextScheduledRotation: null
  };
  private rotationPolicies: Map<string, KeyRotationPolicy> = new Map();

  private constructor() {
    this.initializeDefaultKeys();
    this.initializeDefaultPolicies();
    this.scheduleKeyRotation();
  }

  public static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  private initializeDefaultKeys(): void {
    // Initialize default encryption keys for different purposes
    const purposes: Array<'data' | 'backup' | 'transit'> = ['data', 'backup', 'transit'];
    
    purposes.forEach(purpose => {
      const key = this.generateKey(purpose);
      this.keys.set(key.id, key);
      this.activeKeys.set(purpose, key.id);
    });
  }

  private initializeDefaultPolicies(): void {
    const defaultPolicies: KeyRotationPolicy[] = [
      {
        id: 'data-policy',
        purpose: 'data',
        rotationIntervalDays: 90, // HIPAA compliance: rotate every 90 days
        maxKeyAge: 365,
        requiresApproval: false,
        notifyBefore: 7,
        autoRotate: true,
        retentionPeriod: 2555 // 7 years for HIPAA
      },
      {
        id: 'backup-policy',
        purpose: 'backup',
        rotationIntervalDays: 180,
        maxKeyAge: 730,
        requiresApproval: true,
        notifyBefore: 14,
        autoRotate: false,
        retentionPeriod: 2555
      },
      {
        id: 'transit-policy',
        purpose: 'transit',
        rotationIntervalDays: 30,
        maxKeyAge: 90,
        requiresApproval: false,
        notifyBefore: 3,
        autoRotate: true,
        retentionPeriod: 365
      }
    ];

    defaultPolicies.forEach(policy => {
      this.rotationPolicies.set(policy.purpose, policy);
    });
  }

  private generateKey(purpose: 'data' | 'backup' | 'transit'): EncryptionKey {
    const keyId = `${purpose}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const key = crypto.randomBytes(32); // 256-bit key
    const now = new Date();
    
    const policy = this.rotationPolicies.get(purpose);
    const expiresAt = policy ? new Date(now.getTime() + policy.rotationIntervalDays * 24 * 60 * 60 * 1000) : undefined;

    return {
      id: keyId,
      key,
      version: 1,
      createdAt: now,
      expiresAt,
      algorithm: 'aes-256-gcm',
      purpose,
      isActive: true
    };
  }

  public async encryptData(
    data: string | object,
    purpose: 'data' | 'backup' | 'transit' = 'data',
    metadata?: Record<string, any>
  ): Promise<EncryptedData> {
    const startTime = Date.now();
    
    try {
      const keyId = this.activeKeys.get(purpose);
      if (!keyId) {
        throw new Error(`No active key found for purpose: ${purpose}`);
      }

      const encryptionKey = this.keys.get(keyId);
      if (!encryptionKey || !encryptionKey.isActive) {
        throw new Error(`Invalid or inactive key: ${keyId}`);
      }

      const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey.key, iv);
      cipher.setAAD(Buffer.from(JSON.stringify(metadata || {})));
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();

      const result: EncryptedData = {
        data: encrypted,
        keyId: encryptionKey.id,
        keyVersion: encryptionKey.version,
        algorithm: encryptionKey.algorithm,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        metadata
      };

      // Update metrics
      this.metrics.totalEncryptions++;
      this.metrics.keyUsageStats[keyId] = (this.metrics.keyUsageStats[keyId] || 0) + 1;
      
      const operationTime = Date.now() - startTime;
      this.metrics.averageEncryptionTime = 
        (this.metrics.averageEncryptionTime + operationTime) / 2;

      return result;
    } catch (error) {
      this.metrics.failedOperations++;
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async decryptData(encryptedData: EncryptedData): Promise<string> {
    const startTime = Date.now();
    
    try {
      const encryptionKey = this.keys.get(encryptedData.keyId);
      if (!encryptionKey) {
        throw new Error(`Key not found: ${encryptedData.keyId}`);
      }

      const iv = Buffer.from(encryptedData.iv, 'hex');
      const authTag = encryptedData.authTag ? Buffer.from(encryptedData.authTag, 'hex') : undefined;
      
      const decipher = crypto.createDecipheriv(encryptedData.algorithm, encryptionKey.key, iv);
      if (authTag) {
        (decipher as any).setAuthTag(authTag);
      }
      if (encryptedData.metadata) {
        (decipher as any).setAAD(Buffer.from(JSON.stringify(encryptedData.metadata)));
      }

      let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      // Update metrics
      this.metrics.totalDecryptions++;
      this.metrics.keyUsageStats[encryptedData.keyId] = 
        (this.metrics.keyUsageStats[encryptedData.keyId] || 0) + 1;
      
      const operationTime = Date.now() - startTime;
      this.metrics.averageDecryptionTime = 
        (this.metrics.averageDecryptionTime + operationTime) / 2;

      return decrypted;
    } catch (error) {
      this.metrics.failedOperations++;
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async encryptField(
    value: any,
    fieldName: string,
    entityType: string,
    entityId: string
  ): Promise<EncryptedData> {
    const metadata = {
      fieldName,
      entityType,
      entityId,
      timestamp: new Date().toISOString()
    };

    return this.encryptData(value, 'data', metadata);
  }

  public async decryptField(encryptedData: EncryptedData): Promise<any> {
    const decrypted = await this.decryptData(encryptedData);
    
    // Try to parse as JSON, fallback to string
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  }

  public async rotateKey(purpose: 'data' | 'backup' | 'transit', force: boolean = false): Promise<EncryptionKey> {
    try {
      const currentKeyId = this.activeKeys.get(purpose);
      const currentKey = currentKeyId ? this.keys.get(currentKeyId) : null;
      const policy = this.rotationPolicies.get(purpose);

      // Check if rotation is needed
      if (!force && currentKey && policy) {
        const keyAge = Date.now() - currentKey.createdAt.getTime();
        const maxAge = policy.rotationIntervalDays * 24 * 60 * 60 * 1000;
        
        if (keyAge < maxAge) {
          throw new Error(`Key rotation not needed yet. Key age: ${Math.floor(keyAge / (24 * 60 * 60 * 1000))} days`);
        }

        if (policy.requiresApproval && !force) {
          throw new Error('Key rotation requires approval for this purpose');
        }
      }

      // Generate new key
      const newKey = this.generateKey(purpose);
      
      // Deactivate old key but keep it for decryption
      if (currentKey) {
        currentKey.isActive = false;
      }

      // Activate new key
      this.keys.set(newKey.id, newKey);
      this.activeKeys.set(purpose, newKey.id);

      // Update metrics
      this.metrics.keyRotations++;
      this.metrics.lastRotation = new Date();
      
      // Calculate next rotation
      if (policy) {
        this.metrics.nextScheduledRotation = new Date(
          Date.now() + policy.rotationIntervalDays * 24 * 60 * 60 * 1000
        );
      }

      return newKey;
    } catch (error) {
      this.metrics.failedOperations++;
      throw error;
    }
  }

  public async cleanupExpiredKeys(): Promise<number> {
    let cleanedCount = 0;
    const now = Date.now();

    for (const [keyId, key] of this.keys.entries()) {
      const policy = this.rotationPolicies.get(key.purpose);
      if (!policy) continue;

      const keyAge = now - key.createdAt.getTime();
      const maxRetention = policy.retentionPeriod * 24 * 60 * 60 * 1000;

      if (!key.isActive && keyAge > maxRetention) {
        this.keys.delete(keyId);
        delete this.metrics.keyUsageStats[keyId];
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  private scheduleKeyRotation(): void {
    // Check for key rotation every hour
    setInterval(async () => {
      for (const [purpose, policy] of this.rotationPolicies.entries()) {
        if (!policy.autoRotate) continue;

        const keyId = this.activeKeys.get(purpose as 'data' | 'backup' | 'transit');
        const key = keyId ? this.keys.get(keyId) : null;
        
        if (key && key.expiresAt && key.expiresAt.getTime() <= Date.now()) {
          try {
            await this.rotateKey(purpose as 'data' | 'backup' | 'transit', true);
            console.log(`🔄 Auto-rotated ${purpose} key`);
          } catch (error) {
            console.error(`❌ Failed to auto-rotate ${purpose} key:`, error);
          }
        }
      }

      // Cleanup expired keys
      try {
        const cleaned = await this.cleanupExpiredKeys();
        if (cleaned > 0) {
          console.log(`🧹 Cleaned up ${cleaned} expired encryption keys`);
        }
      } catch (error) {
        console.error('❌ Failed to cleanup expired keys:', error);
      }
    }, 60 * 60 * 1000); // Every hour
  }

  public getMetrics(): EncryptionMetrics {
    return { ...this.metrics };
  }

  public getKeyInfo(purpose?: 'data' | 'backup' | 'transit'): EncryptionKey[] {
    if (purpose) {
      return Array.from(this.keys.values()).filter(key => key.purpose === purpose);
    }
    return Array.from(this.keys.values());
  }

  public getActiveKeyId(purpose: 'data' | 'backup' | 'transit'): string | undefined {
    return this.activeKeys.get(purpose);
  }

  public updateRotationPolicy(policy: KeyRotationPolicy): void {
    this.rotationPolicies.set(policy.purpose, policy);
  }

  public getRotationPolicies(): KeyRotationPolicy[] {
    return Array.from(this.rotationPolicies.values());
  }

  public async exportKey(keyId: string, password: string): Promise<string> {
    const key = this.keys.get(keyId);
    if (!key) {
      throw new Error(`Key not found: ${keyId}`);
    }

    // Encrypt the key with password for secure export
    const salt = crypto.randomBytes(16);
    const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', derivedKey, iv);
    
    let encrypted = cipher.update(JSON.stringify({
      ...key,
      key: key.key.toString('hex')
    }), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return JSON.stringify({
      encrypted,
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      keyId
    });
  }

  public async importKey(encryptedKeyData: string, password: string): Promise<void> {
    try {
      const { encrypted, salt, iv, keyId } = JSON.parse(encryptedKeyData);
      
      const derivedKey = crypto.pbkdf2Sync(password, Buffer.from(salt, 'hex'), 100000, 32, 'sha256');
      const decipher = crypto.createDecipheriv('aes-256-cbc', derivedKey, Buffer.from(iv, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      const keyData = JSON.parse(decrypted);
      const key: EncryptionKey = {
        ...keyData,
        key: Buffer.from(keyData.key, 'hex'),
        createdAt: new Date(keyData.createdAt),
        expiresAt: keyData.expiresAt ? new Date(keyData.expiresAt) : undefined
      };

      this.keys.set(key.id, key);
    } catch (error) {
      throw new Error(`Failed to import key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const encryptionService = EncryptionService.getInstance(); 