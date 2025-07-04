export interface IUser {
  id: string;
  email: string;
  password?: string;
  role: 'admin' | 'coach' | 'client';
  firstName: string;
  lastName: string;
  profile?: {
    bio?: string;
    phone?: string;
    timezone?: string;
    avatar?: string;
  };
  preferences?: {
    language: 'en' | 'he';
    notifications: boolean;
    theme: 'light' | 'dark';
  };
  isActive: boolean;
  isVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class User implements IUser {
  id: string;
  email: string;
  password?: string;
  role: 'admin' | 'coach' | 'client';
  firstName: string;
  lastName: string;
  profile?: {
    bio?: string;
    phone?: string;
    timezone?: string;
    avatar?: string;
  };
  preferences?: {
    language: 'en' | 'he';
    notifications: boolean;
    theme: 'light' | 'dark';
  };
  isActive: boolean;
  isVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<IUser> & { id: string; email: string; role: 'admin' | 'coach' | 'client'; firstName: string; lastName: string }) {
    this.id = data.id;
    this.email = data.email;
    this.password = data.password;
    this.role = data.role;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.profile = data.profile;
    this.preferences = data.preferences || {
      language: 'en',
      notifications: true,
      theme: 'light'
    };
    this.isActive = data.isActive ?? true;
    this.isVerified = data.isVerified ?? false;
    this.lastLogin = data.lastLogin;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }
} 