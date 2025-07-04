export interface ICoachingSession {
  id: string;
  sessionId: string;
  coachId: string;
  clientId: string;
  title: string;
  description?: string;
  objectives: string[];
  outcomes?: string[];
  notes?: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  actualStartTime?: Date;
  actualEndTime?: Date;
  duration?: number;
  feedback?: {
    coachFeedback?: string;
    clientFeedback?: string;
    rating?: number;
  };
  actionItems?: string[];
  nextSteps?: string[];
  tools?: string[];
  methodologies?: string[];
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class CoachingSession implements ICoachingSession {
  id: string;
  sessionId: string;
  coachId: string;
  clientId: string;
  title: string;
  description?: string;
  objectives: string[];
  outcomes?: string[];
  notes?: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  actualStartTime?: Date;
  actualEndTime?: Date;
  duration?: number;
  feedback?: {
    coachFeedback?: string;
    clientFeedback?: string;
    rating?: number;
  };
  actionItems?: string[];
  nextSteps?: string[];
  tools?: string[];
  methodologies?: string[];
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<ICoachingSession> & {
    id: string;
    sessionId: string;
    coachId: string;
    clientId: string;
    title: string;
    objectives: string[];
    status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  }) {
    this.id = data.id;
    this.sessionId = data.sessionId;
    this.coachId = data.coachId;
    this.clientId = data.clientId;
    this.title = data.title;
    this.description = data.description;
    this.objectives = data.objectives;
    this.outcomes = data.outcomes;
    this.notes = data.notes;
    this.status = data.status;
    this.actualStartTime = data.actualStartTime;
    this.actualEndTime = data.actualEndTime;
    this.duration = data.duration;
    this.feedback = data.feedback;
    this.actionItems = data.actionItems;
    this.nextSteps = data.nextSteps;
    this.tools = data.tools;
    this.methodologies = data.methodologies;
    this.attachments = data.attachments;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }
} 