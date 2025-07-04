export interface IReflection {
  id: string;
  userId: string;
  sessionId?: string;
  title: string;
  content: string;
  type: 'session' | 'weekly' | 'monthly' | 'goal' | 'insight' | 'challenge';
  mood?: {
    rating: number; // 1-10
    description?: string;
  };
  tags?: string[];
  isPrivate: boolean;
  templateId?: string;
  questions?: {
    question: string;
    answer: string;
    rating?: number;
  }[];
  attachments?: string[];
  insights?: string[];
  actionItems?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class Reflection implements IReflection {
  id: string;
  userId: string;
  sessionId?: string;
  title: string;
  content: string;
  type: 'session' | 'weekly' | 'monthly' | 'goal' | 'insight' | 'challenge';
  mood?: {
    rating: number;
    description?: string;
  };
  tags?: string[];
  isPrivate: boolean;
  templateId?: string;
  questions?: {
    question: string;
    answer: string;
    rating?: number;
  }[];
  attachments?: string[];
  insights?: string[];
  actionItems?: string[];
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<IReflection> & {
    id: string;
    userId: string;
    title: string;
    content: string;
    type: 'session' | 'weekly' | 'monthly' | 'goal' | 'insight' | 'challenge';
  }) {
    this.id = data.id;
    this.userId = data.userId;
    this.sessionId = data.sessionId;
    this.title = data.title;
    this.content = data.content;
    this.type = data.type;
    this.mood = data.mood;
    this.tags = data.tags;
    this.isPrivate = data.isPrivate ?? true;
    this.templateId = data.templateId;
    this.questions = data.questions;
    this.attachments = data.attachments;
    this.insights = data.insights;
    this.actionItems = data.actionItems;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }
} 