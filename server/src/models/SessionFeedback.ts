export interface ISessionFeedback {
  id: string;
  sessionId: string;
  userId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}

export class SessionFeedback implements ISessionFeedback {
  id: string;
  sessionId: string;
  userId: string;
  rating: number;
  comment?: string;
  createdAt: Date;

  constructor(data: ISessionFeedback) {
    this.id = data.id;
    this.sessionId = data.sessionId;
    this.userId = data.userId;
    this.rating = data.rating;
    this.comment = data.comment;
    this.createdAt = data.createdAt || new Date();
  }
} 