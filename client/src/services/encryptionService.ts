interface EncryptionMetrics {
  totalEncryptions: number;
  totalDecryptions: number;
  keyRotations: number;
  failedOperations: number;
  averageEncryptionTime: number;
  averageDecryptionTime: number;
  keyUsageStats: Record<string, number>;
  lastRotation: string | null;
  nextScheduledRotation: string | null;
}

interface EncryptionKey {
  id: string;
  version: number;
  purpose: 'data' | 'backup' | 'transit';
  algorithm: string;
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
  usageCount: number;
  lastUsedAt?: string;
  daysUntilExpiration: number | null;
}

interface KeyRotationPolicy {
  id: string;
  purpose: 'data' | 'backup' | 'transit';
  rotationIntervalDays: number;
  maxKeyAge: number;
  requiresApproval: boolean;
  notifyBefore: number;
  autoRotate: boolean;
  retentionPeriod: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class EncryptionService {
  private baseUrl = '/api/encryption';

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Network error' }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Encryption API error (${endpoint}):`, error);
      throw error;
    }
  }

  // Get encryption metrics and statistics
  async getMetrics(): Promise<EncryptionMetrics & { keyUsageStats: any[] }> {
    const response = await this.makeRequest<EncryptionMetrics & { keyUsageStats: any[] }>('/metrics');
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch encryption metrics');
    }
    return response.data;
  }

  // Get encryption keys information
  async getKeys(purpose?: string): Promise<{
    keys: EncryptionKey[];
    totalKeys: number;
    activeKeys: number;
  }> {
    const query = purpose ? `?purpose=${purpose}` : '';
    const response = await this.makeRequest<{
      keys: EncryptionKey[];
      totalKeys: number;
      activeKeys: number;
    }>(`/keys${query}`);
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch encryption keys');
    }
    return response.data;
  }

  // Rotate encryption key
  async rotateKey(purpose: string, force: boolean = false, reason?: string): Promise<{
    keyId: string;
    purpose: string;
    createdAt: string;
    expiresAt?: string;
  }> {
    const response = await this.makeRequest<{
      keyId: string;
      purpose: string;
      createdAt: string;
      expiresAt?: string;
    }>(`/keys/${purpose}/rotate`, {
      method: 'POST',
      body: JSON.stringify({ force, reason }),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to rotate encryption key');
    }
    return response.data;
  }

  // Get keys nearing expiration
  async getKeysNearingExpiration(days: number = 7): Promise<{
    keys: Array<{
      keyId: string;
      purpose: string;
      expiresAt?: string;
      daysUntilExpiration: number | null;
      isActive: boolean;
    }>;
    count: number;
    checkPeriod: number;
  }> {
    const response = await this.makeRequest<{
      keys: Array<{
        keyId: string;
        purpose: string;
        expiresAt?: string;
        daysUntilExpiration: number | null;
        isActive: boolean;
      }>;
      count: number;
      checkPeriod: number;
    }>(`/keys/expiring?days=${days}`);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch expiring keys');
    }
    return response.data;
  }

  // Get rotation policies
  async getRotationPolicies(): Promise<KeyRotationPolicy[]> {
    const response = await this.makeRequest<KeyRotationPolicy[]>('/policies');
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch rotation policies');
    }
    return response.data;
  }

  // Update rotation policy
  async updateRotationPolicy(purpose: string, policy: Partial<KeyRotationPolicy>): Promise<KeyRotationPolicy> {
    const response = await this.makeRequest<KeyRotationPolicy>(`/policies/${purpose}`, {
      method: 'PUT',
      body: JSON.stringify(policy),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update rotation policy');
    }
    return response.data;
  }

  // Export encryption key
  async exportKey(keyId: string, password: string): Promise<{
    encryptedKey: string;
    keyId: string;
  }> {
    const response = await this.makeRequest<{
      encryptedKey: string;
      keyId: string;
    }>(`/keys/${keyId}/export`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to export encryption key');
    }
    return response.data;
  }

  // Import encryption key
  async importKey(encryptedKeyData: string, password: string): Promise<{
    keyId: string;
    isActive: boolean;
  }> {
    const response = await this.makeRequest<{
      keyId: string;
      isActive: boolean;
    }>('/keys/import', {
      method: 'POST',
      body: JSON.stringify({ encryptedKeyData, password }),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to import encryption key');
    }
    return response.data;
  }

  // Test encryption functionality
  async testEncryption(testData?: string, purpose: string = 'data'): Promise<{
    testPassed: boolean;
    originalData: string;
    encryptedData: string;
    decryptedData: string;
    keyId: string;
    algorithm: string;
  }> {
    const response = await this.makeRequest<{
      testPassed: boolean;
      originalData: string;
      encryptedData: string;
      decryptedData: string;
      keyId: string;
      algorithm: string;
    }>('/test', {
      method: 'POST',
      body: JSON.stringify({ testData, purpose }),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to test encryption');
    }
    return response.data;
  }

  // Cleanup expired keys
  async cleanupExpiredKeys(): Promise<{
    cleanedCount: number;
  }> {
    const response = await this.makeRequest<{
      cleanedCount: number;
    }>('/keys/cleanup', {
      method: 'DELETE',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to cleanup expired keys');
    }
    return response.data;
  }
}

export const encryptionService = new EncryptionService();
export type { EncryptionMetrics, EncryptionKey, KeyRotationPolicy }; 