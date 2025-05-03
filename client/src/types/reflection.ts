export interface Reflection {
  id: string;
  sessionId: string;
  clientId: string;
  coachId: string;
  text?: string;
  audioUrl?: string;
  isOffline?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReflectionDto {
  sessionId: string;
  text?: string;
  audio?: {
    mimeType: string;
    size: number;
  };
} 