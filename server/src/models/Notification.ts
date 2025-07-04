export interface INotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: Date;
}

export class Notification implements INotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: Date;

  constructor(data: INotification) {
    this.id = data.id;
    this.userId = data.userId;
    this.title = data.title;
    this.message = data.message;
    this.type = data.type;
    this.isRead = data.isRead ?? false;
    this.createdAt = data.createdAt || new Date();
  }
}

export const NotificationTemplates = {
  create: (data: any) => new Notification(data),
  findById: (id: string) => null,
  findByUserId: (userId: string) => []
};

export const NotificationChannel = {
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push',
  IN_APP: 'in_app'
}; 