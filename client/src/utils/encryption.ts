import _sodium from 'libsodium-wrappers';

/**
 * Class for handling encryption and decryption of data with AES-256-GCM
 * using libsodium-wrappers
 */
export class Encryption {
  private static sodium: typeof _sodium;
  private static initialized = false;

  /**
   * Initialize sodium library
   */
  public static async init(): Promise<void> {
    if (!this.initialized) {
      await _sodium.ready;
      this.sodium = _sodium;
      this.initialized = true;
    }
  }

  /**
   * Generate a new encryption key
   * @returns {Uint8Array} The generated encryption key
   */
  public static generateKey(): Uint8Array {
    this.ensureInitialized();
    return this.sodium.crypto_secretbox_keygen();
  }

  /**
   * Encrypt a file (Blob) using AES-256-GCM
   * @param {Blob} file - The file to encrypt
   * @param {Uint8Array} key - The encryption key
   * @returns {Promise<Blob>} The encrypted file
   */
  public static async encryptFile(file: Blob, key: Uint8Array): Promise<Blob> {
    this.ensureInitialized();
    
    // Convert Blob to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const fileData = new Uint8Array(arrayBuffer);
    
    // Generate a random nonce
    const nonce = this.sodium.randombytes_buf(this.sodium.crypto_secretbox_NONCEBYTES);
    
    // Encrypt the file data
    const encryptedData = this.sodium.crypto_secretbox_easy(fileData, nonce, key);
    
    // Combine nonce and encrypted data
    const combined = new Uint8Array(nonce.length + encryptedData.length);
    combined.set(nonce);
    combined.set(encryptedData, nonce.length);
    
    // Convert back to Blob
    return new Blob([combined]);
  }

  /**
   * Decrypt an encrypted file
   * @param {Blob} encryptedFile - The encrypted file
   * @param {Uint8Array} key - The decryption key
   * @returns {Promise<Blob>} The decrypted file
   */
  public static async decryptFile(encryptedFile: Blob, key: Uint8Array): Promise<Blob> {
    this.ensureInitialized();
    
    // Convert Blob to ArrayBuffer
    const arrayBuffer = await encryptedFile.arrayBuffer();
    const combinedData = new Uint8Array(arrayBuffer);
    
    // Extract nonce and encrypted data
    const nonce = combinedData.slice(0, this.sodium.crypto_secretbox_NONCEBYTES);
    const encryptedData = combinedData.slice(this.sodium.crypto_secretbox_NONCEBYTES);
    
    // Decrypt the data
    const decryptedData = this.sodium.crypto_secretbox_open_easy(encryptedData, nonce, key);
    
    // Convert back to Blob
    return new Blob([decryptedData]);
  }

  /**
   * Encrypt text using AES-256-GCM
   * @param {string} text - The text to encrypt
   * @param {Uint8Array} key - The encryption key
   * @returns {string} The encrypted text (Base64 encoded)
   */
  public static encryptText(text: string, key: Uint8Array): string {
    this.ensureInitialized();
    
    // Convert text to Uint8Array
    const textData = this.sodium.from_string(text);
    
    // Generate a random nonce
    const nonce = this.sodium.randombytes_buf(this.sodium.crypto_secretbox_NONCEBYTES);
    
    // Encrypt the text data
    const encryptedData = this.sodium.crypto_secretbox_easy(textData, nonce, key);
    
    // Combine nonce and encrypted data
    const combined = new Uint8Array(nonce.length + encryptedData.length);
    combined.set(nonce);
    combined.set(encryptedData, nonce.length);
    
    // Return as Base64 string
    return this.sodium.to_base64(combined);
  }

  /**
   * Decrypt encrypted text
   * @param {string} encryptedText - The encrypted text (Base64 encoded)
   * @param {Uint8Array} key - The decryption key
   * @returns {string} The decrypted text
   */
  public static decryptText(encryptedText: string, key: Uint8Array): string {
    this.ensureInitialized();
    
    // Convert Base64 string to Uint8Array
    const combinedData = this.sodium.from_base64(encryptedText);
    
    // Extract nonce and encrypted data
    const nonce = combinedData.slice(0, this.sodium.crypto_secretbox_NONCEBYTES);
    const encryptedData = combinedData.slice(this.sodium.crypto_secretbox_NONCEBYTES);
    
    // Decrypt the data
    const decryptedData = this.sodium.crypto_secretbox_open_easy(encryptedData, nonce, key);
    
    // Convert Uint8Array to string
    return this.sodium.to_string(decryptedData);
  }

  /**
   * Ensure that sodium is initialized
   * @private
   */
  private static ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Encryption not initialized. Call Encryption.init() first.');
    }
  }
} 