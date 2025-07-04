export interface IFeedbackTemplate {
  id: string;
  title: string;
  questions: string[];
  type: string;
  createdAt: Date;
}

export class FeedbackTemplate implements IFeedbackTemplate {
  id: string;
  title: string;
  questions: string[];
  type: string;
  createdAt: Date;

  constructor(data: IFeedbackTemplate) {
    this.id = data.id;
    this.title = data.title;
    this.questions = data.questions;
    this.type = data.type;
    this.createdAt = data.createdAt || new Date();
  }
} 