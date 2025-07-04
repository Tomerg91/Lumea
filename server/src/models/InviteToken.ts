export interface IInviteToken {
  id: string;
  email: string;
  token: string;
  role: string;
  expiresAt: Date;
  isUsed: boolean;
  createdBy: string;
  createdAt: Date;
}

export class InviteToken implements IInviteToken {
  id: string;
  email: string;
  token: string;
  role: string;
  expiresAt: Date;
  isUsed: boolean;
  createdBy: string;
  createdAt: Date;

  constructor(data: IInviteToken) {
    this.id = data.id;
    this.email = data.email;
    this.token = data.token;
    this.role = data.role;
    this.expiresAt = data.expiresAt;
    this.isUsed = data.isUsed ?? false;
    this.createdBy = data.createdBy;
    this.createdAt = data.createdAt || new Date();
  }
} 