export interface IFile {
  id: string;
  originalName: string;
  fileName: string;
  path: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  sessionId?: string;
  noteId?: string;
  reflectionId?: string;
  category: 'document' | 'image' | 'audio' | 'video' | 'other';
  tags?: string[];
  isEncrypted: boolean;
  accessLevel: 'private' | 'coach' | 'client' | 'shared';
  downloadCount: number;
  lastAccessed?: Date;
  expiresAt?: Date;
  isArchived: boolean;
  virusScanResult?: 'clean' | 'infected' | 'pending';
  checksumMd5?: string;
  checksumSha256?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    pages?: number;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class File implements IFile {
  id: string;
  originalName: string;
  fileName: string;
  path: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  sessionId?: string;
  noteId?: string;
  reflectionId?: string;
  category: 'document' | 'image' | 'audio' | 'video' | 'other';
  tags?: string[];
  isEncrypted: boolean;
  accessLevel: 'private' | 'coach' | 'client' | 'shared';
  downloadCount: number;
  lastAccessed?: Date;
  expiresAt?: Date;
  isArchived: boolean;
  virusScanResult?: 'clean' | 'infected' | 'pending';
  checksumMd5?: string;
  checksumSha256?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    pages?: number;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<IFile> & {
    id: string;
    originalName: string;
    fileName: string;
    path: string;
    mimeType: string;
    size: number;
    uploadedBy: string;
    category: 'document' | 'image' | 'audio' | 'video' | 'other';
    accessLevel: 'private' | 'coach' | 'client' | 'shared';
  }) {
    this.id = data.id;
    this.originalName = data.originalName;
    this.fileName = data.fileName;
    this.path = data.path;
    this.mimeType = data.mimeType;
    this.size = data.size;
    this.uploadedBy = data.uploadedBy;
    this.sessionId = data.sessionId;
    this.noteId = data.noteId;
    this.reflectionId = data.reflectionId;
    this.category = data.category;
    this.tags = data.tags;
    this.isEncrypted = data.isEncrypted ?? false;
    this.accessLevel = data.accessLevel;
    this.downloadCount = data.downloadCount ?? 0;
    this.lastAccessed = data.lastAccessed;
    this.expiresAt = data.expiresAt;
    this.isArchived = data.isArchived ?? false;
    this.virusScanResult = data.virusScanResult;
    this.checksumMd5 = data.checksumMd5;
    this.checksumSha256 = data.checksumSha256;
    this.metadata = data.metadata;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }
} 