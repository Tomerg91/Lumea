export interface Reflection {
  id: string;
  sessionId: string;
  text: string;
  audioUrl?: string;
  createdAt: string;
  encryptionMetadata?: {
    version: string;
    algorithm: string;
    [key: string]: string;
  };
  // Add other properties as needed
}

export interface Session {
  id: string;
  coachId: string;
  clientId: string;
  date: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  // Add other properties as needed
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  coachId: string;
  // Add other properties as needed
} 