import { Session, Resource, Reflection } from '@shared/schema';

// Global augmentations to add properties to base types
declare global {
  namespace Express {
    interface User {
      id: string;
      name: string;
      email: string;
      role: 'coach' | 'client' | 'admin';
      createdAt: Date;
      password: string;
      profilePicture: string;
      phone: string;
      bio: string;
      passwordResetToken: string;
      passwordResetExpires: Date;
      _id?: string;
      [key: string]: unknown;
    }
  }

  // Augment the Session type
  interface Session extends Express.Session {
    coachReflectionReminderSent?: boolean;
    clientReflectionReminderSent?: boolean;
    audioNotes?: string;
    dateTime?: Date;
  }

  // Augment the Reflection type
  interface Reflection {
    sharedWithCoach?: boolean;
    audioEntry?: string;
  }

  // Augment the Resource type
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
