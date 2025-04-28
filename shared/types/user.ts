export enum UserRole {
  Client = 'client',
  Coach = 'coach',
  Admin = 'admin',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  profilePicture?: string;
  phoneNumber?: string;
  timezone?: string;
  language?: string;
  lastLoginAt?: string;
}

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phoneNumber?: string;
  timezone?: string;
  language?: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  timezone?: string;
  language?: string;
  profilePicture?: string;
  isActive?: boolean;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
} 