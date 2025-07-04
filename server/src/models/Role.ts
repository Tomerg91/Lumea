export interface IRole {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isDefault: boolean;
  isSystem: boolean;
  hierarchy: number; // Higher number = higher privileges
  metadata?: {
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class Role implements IRole {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isDefault: boolean;
  isSystem: boolean;
  hierarchy: number;
  metadata?: {
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<IRole> & {
    id: string;
    name: string;
    permissions: string[];
    hierarchy: number;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.permissions = data.permissions;
    this.isDefault = data.isDefault ?? false;
    this.isSystem = data.isSystem ?? false;
    this.hierarchy = data.hierarchy;
    this.metadata = data.metadata;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  hasPermission(permission: string): boolean {
    return this.permissions.includes(permission);
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(permission => this.permissions.includes(permission));
  }

  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every(permission => this.permissions.includes(permission));
  }
} 