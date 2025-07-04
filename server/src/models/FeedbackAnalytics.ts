export interface IFeedbackAnalytics {
  id: string;
  sessionId: string;
  averageRating: number;
  totalFeedback: number;
  insights: string[];
  createdAt: Date;
}

export class FeedbackAnalytics implements IFeedbackAnalytics {
  id: string;
  sessionId: string;
  averageRating: number;
  totalFeedback: number;
  insights: string[];
  createdAt: Date;

  constructor(data: IFeedbackAnalytics) {
    this.id = data.id;
    this.sessionId = data.sessionId;
    this.averageRating = data.averageRating;
    this.totalFeedback = data.totalFeedback;
    this.insights = data.insights;
    this.createdAt = data.createdAt || new Date();
  }
} 