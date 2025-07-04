export interface IConsent {
  id: string;
  userId: string;
  consentType: string;
  isGranted: boolean;
  grantedAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
}

export class Consent implements IConsent {
  id: string;
  userId: string;
  consentType: string;
  isGranted: boolean;
  grantedAt?: Date;
  revokedAt?: Date;
  createdAt: Date;

  constructor(data: IConsent) {
    this.id = data.id;
    this.userId = data.userId;
    this.consentType = data.consentType;
    this.isGranted = data.isGranted;
    this.grantedAt = data.grantedAt;
    this.revokedAt = data.revokedAt;
    this.createdAt = data.createdAt || new Date();
  }
} 