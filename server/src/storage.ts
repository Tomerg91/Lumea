import prisma from './models/index';
import { z } from 'zod';

// Type imports for Prisma models
import type { 
  User, 
  CoachingSession, 
  File, 
  Tag, 
  CoachNote, 
  Reflection 
} from '@prisma/client';

// Session schemas
export const createSessionSchema = z.object({
  clientId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  dateTime: z.string().datetime(),
  duration: z.number().default(60),
  notes: z.string().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show']).default('scheduled'),
  type: z.enum(['individual', 'group', 'workshop']).default('individual'),
  format: z.enum(['video', 'phone', 'in_person']).default('video'),
});

export const updateSessionSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  dateTime: z.string().datetime().optional(),
  duration: z.number().optional(),
  notes: z.string().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show']).optional(),
  type: z.enum(['individual', 'group', 'workshop']).optional(),
  format: z.enum(['video', 'phone', 'in_person']).optional(),
});

// Tag schemas
export const createTagSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
  description: z.string().optional(),
});

export const updateTagSchema = createTagSchema.partial();

// Coach Note schemas
export const createCoachNoteSchema = z.object({
  title: z.string().optional(),
  content: z.string(),
  sessionId: z.string(),
  type: z.enum(['session', 'client', 'goal', 'observation']).default('session'),
});

export const updateCoachNoteSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  type: z.enum(['session', 'client', 'goal', 'observation']).optional(),
});

// Reflection schemas
export const createReflectionSchema = z.object({
  title: z.string(),
  content: z.string(),
  mood: z.string().optional(),
  tags: z.string().optional(), // comma-separated tags
  isPrivate: z.boolean().default(true),
  template: z.string().optional(),
});

export const updateReflectionSchema = createReflectionSchema.partial();

// Session storage functions using Prisma
export async function createSession(data: z.infer<typeof createSessionSchema>): Promise<CoachingSession> {
  return await prisma.coachingSession.create({
    data: {
      clientId: data.clientId,
      title: data.title,
      description: data.description,
      date: new Date(data.dateTime),
      duration: data.duration,
      status: data.status,
      type: data.type,
      format: data.format,
      notes: data.notes,
    }
  });
}

export async function updateSession(
  id: string,
  data: z.infer<typeof updateSessionSchema>
): Promise<CoachingSession | null> {
  try {
    return await prisma.coachingSession.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.dateTime && { date: new Date(data.dateTime) }),
        ...(data.duration && { duration: data.duration }),
        ...(data.status && { status: data.status }),
        ...(data.type && { type: data.type }),
        ...(data.format && { format: data.format }),
        ...(data.notes && { notes: data.notes }),
      }
    });
  } catch {
    return null;
  }
}

export async function getSessionById(id: string): Promise<CoachingSession | null> {
  return await prisma.coachingSession.findUnique({
    where: { id }
  });
}

export async function getSessionsByClientId(clientId: string): Promise<CoachingSession[]> {
  return await prisma.coachingSession.findMany({
    where: { clientId }
  });
}

export async function deleteSession(id: string): Promise<boolean> {
  try {
    await prisma.coachingSession.delete({
      where: { id }
    });
    return true;
  } catch {
    return false;
  }
}

// Tag storage functions using Prisma
export async function createTag(
  data: z.infer<typeof createTagSchema>
): Promise<Tag> {
  return await prisma.tag.create({
    data: {
      name: data.name,
      color: data.color,
      description: data.description,
    }
  });
}

export async function updateTag(
  id: string,
  data: z.infer<typeof updateTagSchema>
): Promise<Tag | null> {
  try {
    return await prisma.tag.update({
      where: { id },
      data: {
        name: data.name,
        color: data.color,
        description: data.description,
      }
    });
  } catch {
    return null;
  }
}

export async function getTagById(id: string): Promise<Tag | null> {
  return await prisma.tag.findUnique({
    where: { id }
  });
}

export async function getAllTags(): Promise<Tag[]> {
  return await prisma.tag.findMany();
}

export async function getTagsByUser(userId: string): Promise<Tag[]> {
  return await prisma.tag.findMany({
    where: { createdBy: userId }
  });
}

export async function deleteTag(id: string): Promise<boolean> {
  try {
    await prisma.tag.delete({
      where: { id }
    });
    return true;
  } catch {
    return false;
  }
}

// Coach Note storage functions using Prisma
export async function createCoachNote(
  data: z.infer<typeof createCoachNoteSchema>,
  coachId: string
): Promise<CoachNote> {
  return await prisma.coachNote.create({
    data: {
      title: data.title,
      content: data.content,
      coachId,
      sessionId: data.sessionId,
      type: data.type,
    }
  });
}

export async function updateCoachNote(
  id: string,
  data: z.infer<typeof updateCoachNoteSchema>
): Promise<CoachNote | null> {
  try {
    return await prisma.coachNote.update({
      where: { id },
      data: {
        title: data.title,
        content: data.content,
        type: data.type,
      }
    });
  } catch {
    return null;
  }
}

export async function getCoachNoteById(id: string): Promise<CoachNote | null> {
  return await prisma.coachNote.findUnique({
    where: { id }
  });
}

export async function getCoachNotesBySession(sessionId: string): Promise<CoachNote[]> {
  return await prisma.coachNote.findMany({
    where: { sessionId }
  });
}

export async function getCoachNotesByCoach(coachId: string): Promise<CoachNote[]> {
  return await prisma.coachNote.findMany({
    where: { coachId }
  });
}

export async function deleteCoachNote(id: string): Promise<boolean> {
  try {
    await prisma.coachNote.delete({
      where: { id }
    });
    return true;
  } catch {
    return false;
  }
}

// File storage functions using Prisma
export async function createFileRecord(
  userId: string,
  fileData: {
    url: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    path: string;
    category?: 'document' | 'image' | 'video' | 'audio' | 'other';
  }
): Promise<File> {
  return await prisma.file.create({
    data: {
      userId,
      filename: fileData.filename,
      originalName: fileData.originalName,
      mimeType: fileData.mimeType,
      size: fileData.size,
      path: fileData.path,
      url: fileData.url,
      category: fileData.category || 'document',
    }
  });
}

export async function getFileById(fileId: string, userId: string): Promise<File | null> {
  return await prisma.file.findFirst({
    where: { 
      id: fileId,
      userId: userId
    }
  });
}

export async function getFilesByUser(userId: string): Promise<File[]> {
  return await prisma.file.findMany({
    where: { userId }
  });
}

export async function deleteFileRecord(fileId: string, userId: string): Promise<boolean> {
  try {
    await prisma.file.delete({
      where: { 
        id: fileId,
        userId: userId
      }
    });
    return true;
  } catch {
    return false;
  }
}

// Reflection storage functions using Prisma
export async function createReflection(
  data: z.infer<typeof createReflectionSchema>,
  userId: string
): Promise<Reflection> {
  return await prisma.reflection.create({
    data: {
      userId,
      title: data.title,
      content: data.content,
      mood: data.mood,
      tags: data.tags,
      isPrivate: data.isPrivate,
      template: data.template,
    }
  });
}

export async function getReflectionById(reflectionId: string): Promise<Reflection | null> {
  return await prisma.reflection.findUnique({
    where: { id: reflectionId }
  });
}

export async function getReflectionsByUserId(userId: string): Promise<Reflection[]> {
  return await prisma.reflection.findMany({
    where: { userId }
  });
}

export async function updateReflection(
  reflectionId: string,
  updateData: z.infer<typeof updateReflectionSchema>,
  userId: string
): Promise<Reflection | null> {
  const reflection = await prisma.reflection.findUnique({
    where: { id: reflectionId }
  });

  if (!reflection || reflection.userId !== userId) {
    return null;
  }

  try {
    return await prisma.reflection.update({
      where: { id: reflectionId },
      data: {
        title: updateData.title,
        content: updateData.content,
        mood: updateData.mood,
        tags: updateData.tags,
        isPrivate: updateData.isPrivate,
        template: updateData.template,
      }
    });
  } catch {
    return null;
  }
}

export async function deleteReflection(reflectionId: string, userId: string): Promise<boolean> {
  const reflection = await prisma.reflection.findUnique({
    where: { id: reflectionId }
  });

  if (!reflection || reflection.userId !== userId) {
    return false;
  }

  try {
    await prisma.reflection.delete({
      where: { id: reflectionId }
    });
    return true;
  } catch {
    return false;
  }
}

// User helper functions
export async function getUserByEmail(email: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { email }
  });
}

export async function createUser(userData: {
  email: string;
  name?: string;
  password?: string;
  role?: string;
}): Promise<User> {
  return await prisma.user.create({
    data: {
      email: userData.email,
      name: userData.name,
      password: userData.password,
      role: userData.role || 'client',
    }
  });
}
