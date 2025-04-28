export type SessionStatus = 'Upcoming' | 'Completed' | 'Cancelled';

export interface Session {
  id: string;
  clientId: string;
  coachId: string;
  dateTime: string;
  status: SessionStatus;
  notes?: string;
  audioFile?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionDto {
  clientId: string;
  dateTime: string;
  notes?: string;
  audioFile?: string;
  isRecurring?: boolean;
  recurringPattern?: {
    frequency: 'weekly' | 'biweekly' | 'monthly';
    endDate?: string;
  };
}

export interface UpdateSessionDto {
  status?: SessionStatus;
  notes?: string;
  audioFile?: string;
  dateTime?: string;
} 