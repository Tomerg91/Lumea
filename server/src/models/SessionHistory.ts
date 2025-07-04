export interface ISessionHistory {
  id: string;
  sessionId: string;
  action: string;
  timestamp: Date;
  userId: string;
  details?: Record<string, any>;
}

export class SessionHistory implements ISessionHistory {
  id: string;
  sessionId: string;
  action: string;
  timestamp: Date;
  userId: string;
  details?: Record<string, any>;

  constructor(data: ISessionHistory) {
    this.id = data.id;
    this.sessionId = data.sessionId;
    this.action = data.action;
    this.timestamp = data.timestamp || new Date();
    this.userId = data.userId;
    this.details = data.details;
  }
} 