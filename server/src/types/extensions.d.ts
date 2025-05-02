import { Session, Reflection, Resource } from '../../db';

// Extend the Session interface
declare global {
  interface Session {
    coachReflectionReminderSent?: boolean;
    clientReflectionReminderSent?: boolean;
    audioNotes?: string;
    dateTime?: Date;
  }
  
  interface Reflection {
    sharedWithCoach?: boolean;
    audioEntry?: string;
  }
  
  interface Resource {
    visibleToClients?: boolean;
    featured?: boolean;
    category?: string;
    difficulty?: string;
    languageCode?: string;
    durationMinutes?: number;
    tags?: string[];
  }
}

export {}; 