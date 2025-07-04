export interface INotificationPreferences {
  id: string;
  userId: string;
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
  createdAt: Date;
}

export class NotificationPreferences implements INotificationPreferences {
  id: string;
  userId: string;
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
  createdAt: Date;

  constructor(data: INotificationPreferences) {
    this.id = data.id;
    this.userId = data.userId;
    this.email = data.email ?? true;
    this.sms = data.sms ?? false;
    this.push = data.push ?? true;
    this.inApp = data.inApp ?? true;
    this.createdAt = data.createdAt || new Date();
  }
} 