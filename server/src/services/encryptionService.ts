import crypto from 'crypto';

export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-cbc';
  private static readonly IV_LENGTH = 16;
  private static readonly KEY_LENGTH = 32;
  
  private static getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    
    // Ensure key is the correct length
    const keyBuffer = Buffer.from(key, 'hex');
    if (keyBuffer.length !== this.KEY_LENGTH) {
      throw new Error(`ENCRYPTION_KEY must be ${this.KEY_LENGTH} bytes (${this.KEY_LENGTH * 2} hex characters)`);
    }
    
    return keyBuffer;
  }
  
  /**
   * Encrypts text using AES-256-CBC with a random IV
   * @param text - The text to encrypt
   * @returns Object containing encrypted data and IV
   */
  static encrypt(text: string): { encrypted: string; iv: string } {
    if (!text) {
      throw new Error('Text to encrypt cannot be empty');
    }
    
    // Generate a random IV for each encryption operation
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.getEncryptionKey(), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex')
    };
  }
  
  /**
   * Decrypts text using AES-256-CBC with the provided IV
   * @param encryptedData - The encrypted data in hex format
   * @param ivHex - The IV used for encryption in hex format
   * @returns The decrypted text
   */
  static decrypt(encryptedData: string, ivHex: string): string {
    if (!encryptedData || !ivHex) {
      throw new Error('Encrypted data and IV are required for decryption');
    }
    
    const iv = Buffer.from(ivHex, 'hex');
    if (iv.length !== this.IV_LENGTH) {
      throw new Error(`IV must be ${this.IV_LENGTH} bytes`);
    }
    
    const decipher = crypto.createDecipheriv(this.ALGORITHM, this.getEncryptionKey(), iv);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  /**
   * Generates a secure random encryption key
   * @returns A 32-byte key in hex format
   */
  static generateKey(): string {
    return crypto.randomBytes(this.KEY_LENGTH).toString('hex');
  }
  
  /**
   * Validates that an encryption key is properly formatted
   * @param key - The key to validate
   * @returns True if valid, false otherwise
   */
  static validateKey(key: string): boolean {
    try {
      const keyBuffer = Buffer.from(key, 'hex');
      return keyBuffer.length === this.KEY_LENGTH;
    } catch {
      return false;
    }
  }
} 