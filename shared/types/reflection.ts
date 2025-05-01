export interface Reflection {
  id: string;
  sessionId: string;
  clientId: string;
  coachId: string;
  text: string;
  audioFile?: string;
  sharedWithCoach: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReflectionDto {
  sessionId: string;
  text: string;
  audioFile?: File;
  sharedWithCoach: boolean;
}

export interface UpdateReflectionDto {
  text?: string;
  audioFile?: File;
  sharedWithCoach?: boolean;
}
