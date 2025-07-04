export interface ITag {
  id: string;
  name: string;
  description?: string;
  color?: string;
  category: 'session' | 'note' | 'reflection' | 'file' | 'general';
  createdBy: string;
  isPublic: boolean;
  usageCount: number;
  lastUsed?: Date;
  metadata?: {
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class Tag implements ITag {
  id: string;
  name: string;
  description?: string;
  color?: string;
  category: 'session' | 'note' | 'reflection' | 'file' | 'general';
  createdBy: string;
  isPublic: boolean;
  usageCount: number;
  lastUsed?: Date;
  metadata?: {
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<ITag> & {
    id: string;
    name: string;
    category: 'session' | 'note' | 'reflection' | 'file' | 'general';
    createdBy: string;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.color = data.color;
    this.category = data.category;
    this.createdBy = data.createdBy;
    this.isPublic = data.isPublic ?? false;
    this.usageCount = data.usageCount ?? 0;
    this.lastUsed = data.lastUsed;
    this.metadata = data.metadata;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }
} 