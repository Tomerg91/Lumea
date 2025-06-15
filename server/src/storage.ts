import mongoose, { HydratedDocument } from 'mongoose';
import { Session, ISession } from './models/Session.js';
import { z } from 'zod';
import { File, IFile } from './models/File.js';
import { Tag, ITag } from './models/Tag.js';
import { CoachNote, ICoachNote } from './models/CoachNote.js';
import { Reflection, IReflection } from './models/Reflection.js';
import { IRole } from './models/Role.js';

// Session schemas
export const createSessionSchema = z.object({
  coachId: z.string(),
  clientId: z.string(),
  dateTime: z.string().datetime(),
  duration: z.number().min(1),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'rescheduled']).default('scheduled'),
  paymentStatus: z.enum(['pending', 'paid', 'overdue']).default('pending'),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().optional(),
  recurrenceEndDate: z.string().datetime().optional(),
});

export const updateSessionSchema = z.object({
  dateTime: z.string().datetime().optional(),
  duration: z.number().min(1).optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'rescheduled']).optional(),
  paymentStatus: z.enum(['pending', 'paid', 'overdue']).optional(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: z.string().optional(),
  recurrenceEndDate: z.string().datetime().optional(),
});

// Tag schemas
export const createTagSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
  description: z.string().optional(),
});

export const updateTagSchema = createTagSchema.partial();

// Coach Note schemas
export const privacySettingsSchema = z.object({
  accessLevel: z.enum(['private', 'supervisor', 'team', 'organization']).default('private'),
  allowExport: z.boolean().default(false),
  allowSharing: z.boolean().default(false),
  retentionPeriodDays: z.number().optional(),
  autoDeleteAfterDays: z.number().optional(),
  requireReasonForAccess: z.boolean().default(false),
  sensitiveContent: z.boolean().default(false),
  supervisionRequired: z.boolean().default(false),
});

export const createCoachNoteSchema = z.object({
  sessionId: z.string(),
  textContent: z.string(),
  title: z.string().optional(),
  audioFileId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isEncrypted: z.boolean().default(true),
  privacySettings: privacySettingsSchema.optional(),
  sharedWith: z.array(z.string()).optional(),
});

export const updateCoachNoteSchema = z.object({
  textContent: z.string().optional(),
  title: z.string().optional(),
  audioFileId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isEncrypted: z.boolean().optional(),
  privacySettings: privacySettingsSchema.optional(),
  sharedWith: z.array(z.string()).optional(),
});

// Session storage functions
export async function createSession(data: z.infer<typeof createSessionSchema>): Promise<ISession> {
  const session = new Session({
    ...data,
    coachId: new mongoose.Types.ObjectId(data.coachId),
    clientId: new mongoose.Types.ObjectId(data.clientId),
  });
  return await session.save();
}

export async function updateSession(
  id: string,
  data: z.infer<typeof updateSessionSchema>
): Promise<ISession | null> {
  return await Session.findByIdAndUpdate(id, data, { new: true });
}

export async function getSessionById(id: string): Promise<ISession | null> {
  return await Session.findById(id);
}

export async function getSessionsByCoachId(coachId: string): Promise<ISession[]> {
  return await Session.find({ coachId: new mongoose.Types.ObjectId(coachId) });
}

export async function getSessionsByClientId(clientId: string): Promise<ISession[]> {
  return await Session.find({ clientId: new mongoose.Types.ObjectId(clientId) });
}

export async function deleteSession(id: string): Promise<boolean> {
  const result = await Session.findByIdAndDelete(id);
  return !!result;
}

// Tag storage functions
export async function createTag(
  data: z.infer<typeof createTagSchema>,
  userId: string
): Promise<ITag> {
  const tag = new Tag({
    ...data,
    createdBy: new mongoose.Types.ObjectId(userId),
  });
  return await tag.save();
}

export async function updateTag(
  id: string,
  data: z.infer<typeof updateTagSchema>
): Promise<ITag | null> {
  return await Tag.findByIdAndUpdate(id, data, { new: true });
}

export async function getTagById(id: string): Promise<ITag | null> {
  return await Tag.findById(id);
}

export async function getTagsByUser(userId: string): Promise<ITag[]> {
  return await Tag.find({ createdBy: new mongoose.Types.ObjectId(userId) });
}

export async function deleteTag(id: string): Promise<boolean> {
  const result = await Tag.findByIdAndDelete(id);
  return !!result;
}

// Coach Note storage functions
export async function createCoachNote(
  data: z.infer<typeof createCoachNoteSchema>,
  coachId: string
): Promise<HydratedDocument<ICoachNote>> {
  const coachNote = new CoachNote({
    ...data,
    coachId: new mongoose.Types.ObjectId(coachId),
    sessionId: new mongoose.Types.ObjectId(data.sessionId),
    audioFileId: data.audioFileId ? new mongoose.Types.ObjectId(data.audioFileId) : undefined,
    // Convert string tags to string array (no longer ObjectId references)
    tags: data.tags || [],
    // Set default privacy settings if not provided
    privacySettings: data.privacySettings || {
      accessLevel: 'private',
      allowExport: false,
      allowSharing: false,
      requireReasonForAccess: false,
      sensitiveContent: false,
      supervisionRequired: false
    },
    sharedWith: data.sharedWith || []
  });
  return await coachNote.save();
}

export async function updateCoachNote(
  id: string,
  data: z.infer<typeof updateCoachNoteSchema>
): Promise<HydratedDocument<ICoachNote> | null> {
  const updateData: any = {
    ...data,
    // Convert string tags to string array (no longer ObjectId references)
    tags: data.tags || undefined,
    audioFileId: data.audioFileId ? new mongoose.Types.ObjectId(data.audioFileId) : undefined,
  };
  
  // Remove undefined values to avoid overwriting with undefined
  Object.keys(updateData).forEach(key => 
    updateData[key] === undefined && delete updateData[key]
  );
  
  return await CoachNote.findByIdAndUpdate(id, updateData, { new: true });
}

export async function getCoachNoteById(id: string): Promise<HydratedDocument<ICoachNote> | null> {
  return await CoachNote.findById(id);
}

export async function getCoachNotesBySession(
  sessionId: string
): Promise<HydratedDocument<ICoachNote>[]> {
  return await CoachNote.find({ sessionId: new mongoose.Types.ObjectId(sessionId) });
}

export async function getCoachNotesByCoach(
  coachId: string
): Promise<HydratedDocument<ICoachNote>[]> {
  return await CoachNote.find({ coachId: new mongoose.Types.ObjectId(coachId) });
}

export async function deleteCoachNote(id: string): Promise<boolean> {
  const result = await CoachNote.findByIdAndDelete(id);
  return !!result;
}

// File storage functions
export async function createFileRecord(
  userId: string,
  fileData: {
    url: string;
    filename: string;
    mimetype: string;
    size: number;
    context?: 'profile' | 'resource' | 'audio_note';
  }
): Promise<IFile> {
  const file = new File({
    userId: new mongoose.Types.ObjectId(userId),
    ...fileData,
  });

  return await file.save();
}

export async function getFileById(fileId: string, userId: string): Promise<IFile | null> {
  return await File.findOne({
    _id: new mongoose.Types.ObjectId(fileId),
    userId: new mongoose.Types.ObjectId(userId),
  });
}

export async function getFilesByUserAndContext(
  userId: string,
  context: 'profile' | 'resource' | 'audio_note'
): Promise<IFile[]> {
  return await File.find({
    userId: new mongoose.Types.ObjectId(userId),
    context,
  });
}

export async function deleteFileRecord(fileId: string, userId: string): Promise<boolean> {
  const file = await getFileById(fileId, userId);
  if (!file) return false;
  const result = await File.findByIdAndDelete(fileId);
  return !!result;
}

// Reflection schemas
export const createReflectionSchema = z.object({
  sessionId: z.string(),
  textContent: z.string(),
  audioFileId: z.string().optional(),
});

export const updateReflectionSchema = createReflectionSchema.partial();

// Reflection storage functions
export async function createReflection(
  data: z.infer<typeof createReflectionSchema>,
  userId: string
): Promise<IReflection> {
  try {
    console.log('[createReflection] Starting reflection creation for session:', data.sessionId);

    // Check if the session exists
    const session = await Session.findById(data.sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Check if the user is authorized to create a reflection for this session
    if (session.clientId.toString() !== userId && session.coachId.toString() !== userId) {
      throw new Error('Not authorized to create a reflection for this session');
    }

    // Check if a reflection already exists for this session
    const existingReflection = await Reflection.findOne({ sessionId: data.sessionId });
    if (existingReflection) {
      throw new Error('Reflection already exists for this session');
    }

    const reflection = new Reflection({
      ...data,
      sessionId: new mongoose.Types.ObjectId(data.sessionId),
      clientId: new mongoose.Types.ObjectId(userId),
      coachId: session.coachId,
      audioFileId: data.audioFileId ? new mongoose.Types.ObjectId(data.audioFileId) : undefined,
    });

    console.log('[createReflection] Saving reflection to database');
    const savedReflection = await reflection.save();
    console.log('[createReflection] Reflection saved successfully:', savedReflection._id);

    return savedReflection;
  } catch (error) {
    console.error('[createReflection] Error creating reflection:', error);
    throw error;
  }
}

export async function getReflectionById(reflectionId: string): Promise<IReflection | null> {
  try {
    console.log('[getReflectionById] Fetching reflection with ID:', reflectionId);
    const reflection = await Reflection.findById(reflectionId);
    if (!reflection) {
      console.log('[getReflectionById] Reflection not found for ID:', reflectionId);
      return null;
    }
    console.log('[getReflectionById] Successfully found reflection:', reflectionId);
    return reflection;
  } catch (error) {
    console.error('[getReflectionById] Error fetching reflection:', error);
    throw new Error('Failed to get reflection by ID');
  }
}

export async function getReflectionBySessionId(sessionId: string): Promise<IReflection | null> {
  try {
    console.log('[getReflectionBySessionId] Fetching reflection for session:', sessionId);
    const reflection = await Reflection.findOne({
      sessionId: new mongoose.Types.ObjectId(sessionId),
    });
    if (!reflection) {
      console.log('[getReflectionBySessionId] Reflection not found for session:', sessionId);
      return null;
    }
    console.log('[getReflectionBySessionId] Successfully found reflection for session:', sessionId);
    return reflection;
  } catch (error) {
    console.error('[getReflectionBySessionId] Error fetching reflection:', error);
    throw new Error('Failed to get reflection by session ID');
  }
}

export async function getReflectionsByUserId(userId: string): Promise<IReflection[]> {
  try {
    console.log('[getReflectionsByUserId] Fetching reflections for user:', userId);
    const reflections = await Reflection.find({ clientId: new mongoose.Types.ObjectId(userId) });
    console.log('[getReflectionsByUserId] Successfully found reflections for user:', userId);
    return reflections;
  } catch (error) {
    console.error('[getReflectionsByUserId] Error fetching reflections:', error);
    throw new Error('Failed to get reflections by user ID');
  }
}

export async function updateReflection(
  reflectionId: string,
  updateData: z.infer<typeof updateReflectionSchema>,
  userId: string
): Promise<IReflection | null> {
  try {
    console.log('[updateReflection] Updating reflection:', reflectionId);

    const reflection = await Reflection.findById(reflectionId);
    if (!reflection) {
      throw new Error('Reflection not found');
    }

    // Check if the user is authorized to update this reflection
    if (reflection.clientId.toString() !== userId) {
      throw new Error('Not authorized to update this reflection');
    }

    const update: Record<string, unknown> = { ...updateData };

    if (updateData.sessionId) {
      // Check if the session exists
      const session = await Session.findById(updateData.sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Check if the user is authorized to update a reflection for this session
      if (session.clientId.toString() !== userId && session.coachId.toString() !== userId) {
        throw new Error('Not authorized to update a reflection for this session');
      }

      update.sessionId = new mongoose.Types.ObjectId(updateData.sessionId);
    }

    if (updateData.audioFileId) {
      update.audioFileId = new mongoose.Types.ObjectId(updateData.audioFileId);
    }

    const updatedReflection = await Reflection.findByIdAndUpdate(reflectionId, update, {
      new: true,
    });

    console.log('[updateReflection] Reflection updated successfully:', reflectionId);
    return updatedReflection;
  } catch (error) {
    console.error('[updateReflection] Error updating reflection:', error);
    throw error;
  }
}

export async function deleteReflection(reflectionId: string, userId: string): Promise<boolean> {
  try {
    console.log('[deleteReflection] Deleting reflection:', reflectionId);

    const reflection = await Reflection.findById(reflectionId);
    if (!reflection) {
      throw new Error('Reflection not found');
    }

    // Check if the user is authorized to delete this reflection
    if (reflection.clientId.toString() !== userId) {
      throw new Error('Not authorized to delete this reflection');
    }

    const result = await Reflection.findByIdAndDelete(reflectionId);
    console.log('[deleteReflection] Reflection deleted successfully:', reflectionId);
    return !!result;
  } catch (error) {
    console.error('[deleteReflection] Error deleting reflection:', error);
    throw error;
  }
}
