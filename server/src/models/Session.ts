export interface ISession {
  id: string;
  coachId: string;
  clientId: string;
  title: string;
  description?: string;
  scheduledAt: Date;
  duration: number; // in minutes
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  type: 'coaching' | 'discovery' | 'follow-up' | 'group';
  location?: {
    type: 'online' | 'in-person';
    details?: string;
    meetingUrl?: string;
  };
  notes?: string;
  objectives?: string[];
  outcomes?: string[];
  rating?: {
    coach: number;
    client: number;
  };
  tags?: string[];
  isRecurring: boolean;
  recurringPattern?: {
    frequency: 'weekly' | 'biweekly' | 'monthly';
    endDate?: Date;
  };
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class Session implements ISession {
  id: string;
  coachId: string;
  clientId: string;
  title: string;
  description?: string;
  scheduledAt: Date;
  duration: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  type: 'coaching' | 'discovery' | 'follow-up' | 'group';
  location?: {
    type: 'online' | 'in-person';
    details?: string;
    meetingUrl?: string;
  };
  notes?: string;
  objectives?: string[];
  outcomes?: string[];
  rating?: {
    coach: number;
    client: number;
  };
  tags?: string[];
  isRecurring: boolean;
  recurringPattern?: {
    frequency: 'weekly' | 'biweekly' | 'monthly';
    endDate?: Date;
  };
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<ISession> & { 
    id: string; 
    coachId: string; 
    clientId: string; 
    title: string; 
    scheduledAt: Date; 
    duration: number;
    status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
    type: 'coaching' | 'discovery' | 'follow-up' | 'group';
  }) {
    this.id = data.id;
    this.coachId = data.coachId;
    this.clientId = data.clientId;
    this.title = data.title;
    this.description = data.description;
    this.scheduledAt = data.scheduledAt;
    this.duration = data.duration;
    this.status = data.status;
    this.type = data.type;
    this.location = data.location;
    this.notes = data.notes;
    this.objectives = data.objectives;
    this.outcomes = data.outcomes;
    this.rating = data.rating;
    this.tags = data.tags;
    this.isRecurring = data.isRecurring ?? false;
    this.recurringPattern = data.recurringPattern;
    this.attachments = data.attachments;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }
} 