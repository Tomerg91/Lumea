import { encryptionService, EncryptedData } from '../services/encryptionService';
import { supabase } from '../lib/supabase';

/**
 * PHI (Protected Health Information) field encryption utility
 * For HIPAA compliance - encrypts sensitive client data at the field level
 */

// Define which fields contain PHI data and should be encrypted
export const PHI_FIELDS = {
  users: ['name', 'email', 'bio', 'phone'],
  sessions: ['notes', 'audio_file'],
  coach_notes: ['title', 'content'],
  reflections: ['content'],
  notifications: ['html_body', 'text_body'],
  files: ['original_name', 'storage_path'],
  // Add more tables and fields as needed
} as const;

export type PHITables = keyof typeof PHI_FIELDS;
export type PHIField<T extends PHITables> = typeof PHI_FIELDS[T][number];

/**
 * Encrypted field wrapper for database storage
 */
export interface EncryptedField {
  encrypted: true;
  data: EncryptedData;
}

/**
 * Check if a value is an encrypted field
 */
export function isEncryptedField(value: any): value is EncryptedField {
  return (
    typeof value === 'object' &&
    value !== null &&
    value.encrypted === true &&
    typeof value.data === 'object' &&
    typeof value.data.data === 'string' &&
    typeof value.data.keyId === 'string'
  );
}

/**
 * Encrypt a single field value
 */
export async function encryptFieldValue(
  value: any,
  fieldName: string,
  tableName: string,
  entityId: string
): Promise<EncryptedField> {
  if (value === null || value === undefined) {
    return {
      encrypted: true,
      data: await encryptionService.encryptField('', fieldName, tableName, entityId)
    };
  }

  const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
  
  return {
    encrypted: true,
    data: await encryptionService.encryptField(stringValue, fieldName, tableName, entityId)
  };
}

/**
 * Decrypt a single field value
 */
export async function decryptFieldValue(encryptedField: EncryptedField): Promise<any> {
  const decrypted = await encryptionService.decryptField(encryptedField.data);
  
  // Handle empty encrypted values
  if (decrypted === '') {
    return null;
  }
  
  return decrypted;
}

/**
 * Encrypt PHI fields in an object before database storage
 */
export async function encryptPHIFields<T extends PHITables>(
  data: Record<string, any>,
  tableName: T,
  entityId: string
): Promise<Record<string, any>> {
  const encrypted = { ...data };
  const fieldsToEncrypt = PHI_FIELDS[tableName];

  for (const field of fieldsToEncrypt) {
    if (field in encrypted && encrypted[field] !== undefined) {
      try {
        encrypted[field] = await encryptFieldValue(
          encrypted[field],
          field,
          tableName,
          entityId
        );
      } catch (error) {
        console.error(`Failed to encrypt field ${field} in table ${tableName}:`, error);
        throw new Error(`Encryption failed for sensitive field: ${field}`);
      }
    }
  }

  return encrypted;
}

/**
 * Decrypt PHI fields in an object after database retrieval
 */
export async function decryptPHIFields<T extends PHITables>(
  data: Record<string, any>,
  tableName: T
): Promise<Record<string, any>> {
  if (!data) return data;

  const decrypted = { ...data };
  const fieldsToDecrypt = PHI_FIELDS[tableName];

  for (const field of fieldsToDecrypt) {
    if (field in decrypted && isEncryptedField(decrypted[field])) {
      try {
        decrypted[field] = await decryptFieldValue(decrypted[field]);
      } catch (error) {
        console.error(`Failed to decrypt field ${field} in table ${tableName}:`, error);
        // Don't throw error for decryption failures - return masked value
        decrypted[field] = '[DECRYPTION_ERROR]';
      }
    }
  }

  return decrypted;
}

/**
 * Decrypt array of records with PHI fields
 */
export async function decryptPHIArray<T extends PHITables>(
  records: Record<string, any>[],
  tableName: T
): Promise<Record<string, any>[]> {
  if (!records || records.length === 0) return records;

  return Promise.all(
    records.map(record => decryptPHIFields(record, tableName))
  );
}

/**
 * Middleware to automatically encrypt PHI fields before database operations
 */
export function createEncryptionMiddleware<T extends PHITables>(tableName: T) {
  return {
    async beforeInsert(data: Record<string, any>, entityId: string) {
      return encryptPHIFields(data, tableName, entityId);
    },
    
    async beforeUpdate(data: Record<string, any>, entityId: string) {
      return encryptPHIFields(data, tableName, entityId);
    },
    
    async afterSelect(data: Record<string, any> | Record<string, any>[]) {
      if (Array.isArray(data)) {
        return decryptPHIArray(data, tableName);
      }
      return decryptPHIFields(data, tableName);
    }
  };
}

/**
 * Supabase wrapper with automatic encryption/decryption
 */
export class EncryptedSupabaseClient {
  constructor(private client = supabase) {}

  /**
   * Insert with automatic encryption
   */
  async insert<T extends PHITables>(
    tableName: T,
    data: Record<string, any>,
    entityId?: string
  ) {
    const id = entityId || crypto.randomUUID();
    const encryptedData = await encryptPHIFields(data, tableName, id);
    
    return this.client
      .from(tableName)
      .insert({ ...encryptedData, id });
  }

  /**
   * Update with automatic encryption
   */
  async update<T extends PHITables>(
    tableName: T,
    data: Record<string, any>,
    entityId: string
  ) {
    const encryptedData = await encryptPHIFields(data, tableName, entityId);
    
    return this.client
      .from(tableName)
      .update(encryptedData)
      .eq('id', entityId);
  }

  /**
   * Select with automatic decryption
   */
  async select<T extends PHITables>(
    tableName: T,
    query?: string
  ) {
    const result = await this.client
      .from(tableName)
      .select(query || '*');

    if (result.data) {
      result.data = await decryptPHIArray(result.data, tableName);
    }

    return result;
  }

  /**
   * Select single record with automatic decryption
   */
  async selectOne<T extends PHITables>(
    tableName: T,
    id: string,
    query?: string
  ) {
    const result = await this.client
      .from(tableName)
      .select(query || '*')
      .eq('id', id)
      .single();

    if (result.data) {
      result.data = await decryptPHIFields(result.data, tableName);
    }

    return result;
  }
}

/**
 * Audit logging for encryption operations
 */
export async function logEncryptionEvent(
  operation: 'encrypt' | 'decrypt',
  tableName: string,
  fieldName: string,
  entityId: string,
  userId?: string,
  success: boolean = true,
  error?: string
) {
  try {
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: `field_${operation}`,
        resource: tableName,
        resource_id: entityId,
        description: `Field ${operation}ion: ${fieldName}`,
        metadata: {
          field_name: fieldName,
          operation,
          success,
          error,
          phi_accessed: true,
          data_classification: 'restricted'
        },
        phi_accessed: true,
        phi_type: 'field_data',
        data_classification: 'restricted',
        event_type: 'security_event',
        event_category: 'data_access',
        risk_level: 'medium',
        compliance_flags: ['HIPAA'],
        created_at: new Date().toISOString()
      });
  } catch (auditError) {
    console.error('Failed to log encryption event:', auditError);
    // Don't throw - audit logging failure shouldn't break encryption
  }
}

/**
 * Batch encryption for data migration
 */
export async function batchEncryptTable<T extends PHITables>(
  tableName: T,
  batchSize: number = 100
): Promise<{
  processed: number;
  errors: Array<{ id: string; error: string }>;
}> {
  let processed = 0;
  const errors: Array<{ id: string; error: string }> = [];
  let offset = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data: batch, error } = await supabase
      .from(tableName)
      .select('*')
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error(`Error fetching batch for ${tableName}:`, error);
      break;
    }

    if (!batch || batch.length === 0) {
      break;
    }

    for (const record of batch) {
      try {
        const encryptedData = await encryptPHIFields(record, tableName, record.id);
        
        const { error: updateError } = await supabase
          .from(tableName)
          .update(encryptedData)
          .eq('id', record.id);

        if (updateError) {
          errors.push({ id: record.id, error: updateError.message });
        } else {
          processed++;
        }
      } catch (encryptError) {
        errors.push({ 
          id: record.id, 
          error: encryptError instanceof Error ? encryptError.message : 'Unknown error'
        });
      }
    }

    offset += batchSize;
  }

  return { processed, errors };
}

/**
 * Create an encrypted Supabase client instance
 */
export const encryptedSupabase = new EncryptedSupabaseClient();

/**
 * Export encryption middleware for different tables
 */
export const userEncryption = createEncryptionMiddleware('users');
export const sessionEncryption = createEncryptionMiddleware('sessions');
export const coachNotesEncryption = createEncryptionMiddleware('coach_notes');
export const reflectionEncryption = createEncryptionMiddleware('reflections');
export const notificationEncryption = createEncryptionMiddleware('notifications');
export const fileEncryption = createEncryptionMiddleware('files');