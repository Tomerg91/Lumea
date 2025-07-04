export interface IPasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
}

export class PasswordResetToken implements IPasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;

  constructor(data: IPasswordResetToken) {
    this.id = data.id;
    this.userId = data.userId;
    this.token = data.token;
    this.expiresAt = data.expiresAt;
    this.isUsed = data.isUsed ?? false;
    this.createdAt = data.createdAt || new Date();
  }
} 