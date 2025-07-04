export interface IEncryptionKey {
  id: string;
  keyId: string;
  algorithm: string;
  keySize: number;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export interface EncryptionKeyMetadata {
  keyId: string;
  algorithm: string;
  keySize: number;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export class EncryptionKey implements IEncryptionKey {
  id: string;
  keyId: string;
  algorithm: string;
  keySize: number;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;

  constructor(data: IEncryptionKey) {
    this.id = data.id;
    this.keyId = data.keyId;
    this.algorithm = data.algorithm;
    this.keySize = data.keySize;
    this.createdAt = data.createdAt || new Date();
    this.expiresAt = data.expiresAt;
    this.isActive = data.isActive ?? true;
  }
} 