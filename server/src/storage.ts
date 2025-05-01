import mongoose, { HydratedDocument } from 'mongoose';
import { Session, ISession } from './models/Session.js';
import { z } from 'zod';
import { File, IFile } from './models/File.js';
import { User, IUser } from './models/User.js';
import { Tag, ITag } from './models/Tag.js';
import { CoachNote, ICoachNote } from './models/CoachNote.js';
import { Reflection, IReflection } from './models/Reflection.js';
import scrypt from 'scrypt-js';
import crypto from 'crypto';

// Add these constants at the top of the file
const SCRYPT_N = 16384; // CPU/memory cost parameter
const SCRYPT_r = 8; // Block size parameter
const SCRYPT_p = 1; // Parallelization parameter
const SCRYPT_dkLen = 64; // Derived key length

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
export const createCoachNoteSchema = z.object({
  sessionId: z.string(),
  textContent: z.string(),
  audioFileId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isEncrypted: z.boolean().default(true),
});

export const updateCoachNoteSchema = z.object({
  textContent: z.string().optional(),
  audioFileId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isEncrypted: z.boolean().optional(),
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
    tags: data.tags?.map((id) => new mongoose.Types.ObjectId(id)),
  });
  return await coachNote.save();
}

export async function updateCoachNote(
  id: string,
  data: z.infer<typeof updateCoachNoteSchema>
): Promise<HydratedDocument<ICoachNote> | null> {
  const updateData = {
    ...data,
    tags: data.tags?.map((id) => new mongoose.Types.ObjectId(id)),
  };
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
  const result = await File.findOneAndDelete({
    _id: new mongoose.Types.ObjectId(fileId),
    userId: new mongoose.Types.ObjectId(userId),
  });

  return !!result;
}

export async function getUserByEmail(email: string): Promise<IUser | null> {
  try {
    console.log('[getUserByEmail] Fetching user with email:', email);
    const user = await User.findOne({ email });
    if (!user) {
      console.log('[getUserByEmail] User not found for email:', email);
      return null;
    }
    console.log('[getUserByEmail] Successfully found user:', user._id);
    return user;
  } catch (error) {
    console.error('[getUserByEmail] Error fetching user:', error);
    throw new Error('Failed to get user by email');
  }
}

export async function getUserById(id: string): Promise<IUser | null> {
  try {
    console.log('[getUserById] Fetching user with ID:', id);
    const user = await User.findById(id);
    if (!user) {
      console.log('[getUserById] User not found for ID:', id);
      return null;
    }
    console.log('[getUserById] Successfully found user:', id);
    return user;
  } catch (error) {
    console.error('[getUserById] Error fetching user:', error);
    throw new Error('Failed to get user by ID');
  }
}

export async function createUser({
  name,
  email,
  password,
  role,
}: {
  name: string;
  email: string;
  password: string;
  role: 'client' | 'coach' | 'admin';
}): Promise<IUser> {
  try {
    console.log('[createUser] Starting user creation for email:', email);

    // Generate a unique salt
    const salt = crypto.randomBytes(16).toString('hex');
    console.log('[createUser] Generated unique salt');

    // Hash the password with the unique salt
    const hashBuffer = await scrypt.scrypt(
      Buffer.from(password),
      Buffer.from(salt),
      SCRYPT_N,
      SCRYPT_r,
      SCRYPT_p,
      SCRYPT_dkLen
    );
    // Convert scrypt result to Buffer before toString
    const passwordHash = (hashBuffer as any).toString('hex'); // Force type to any

    console.log('[createUser] Password hashed successfully');

    const user = new User({
      name,
      email,
      passwordHash,
      passwordSalt: salt,
      role,
      status: role === 'coach' ? 'pending' : 'active', // Coaches need approval
    });

    console.log('[createUser] Saving user to database');
    const savedUser = await user.save();
    console.log('[createUser] User saved successfully:', savedUser._id);

    // Remove sensitive data before returning
    const userObjectForReturn: any = savedUser.toObject();
    delete userObjectForReturn.passwordHash;
    delete userObjectForReturn.passwordSalt;

    return userObjectForReturn;
  } catch (error) {
    console.error('[createUser] Error creating user:', error);
    throw new Error('Failed to create user');
  }
}

export async function setUserPasswordResetToken(
  userId: string,
  token: string,
  expiryDate: Date
): Promise<void> {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  await User.findByIdAndUpdate(userId, {
    passwordResetToken: hashedToken,
    passwordResetExpires: expiryDate,
  });
}

export async function findUserByPasswordResetToken(token: string): Promise<IUser | null> {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  return User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
}

export async function clearUserPasswordResetToken(userId: string): Promise<void> {
  await User.findByIdAndUpdate(userId, {
    $unset: { passwordResetToken: 1, passwordResetExpires: 1 },
  });
}

export async function updateUserPassword(userId: string, newPassword: string): Promise<void> {
  try {
    // Generate a new unique salt
    const salt = crypto.randomBytes(16).toString('hex');

    // Hash the new password with the new salt
    const hashBuffer = await scrypt.scrypt(
      Buffer.from(newPassword),
      Buffer.from(salt),
      SCRYPT_N,
      SCRYPT_r,
      SCRYPT_p,
      SCRYPT_dkLen
    );
    // Convert scrypt result to Buffer before toString
    const passwordHash = (hashBuffer as any).toString('hex'); // Force type to any

    await User.findByIdAndUpdate(userId, {
      passwordHash,
      passwordSalt: salt,
    });
  } catch (error) {
    console.error('[updateUserPassword] Error updating password:', error);
    throw new Error('Failed to update password');
  }
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
      userId: new mongoose.Types.ObjectId(userId),
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
    const reflections = await Reflection.find({ userId: new mongoose.Types.ObjectId(userId) });
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
    if (reflection.userId.toString() !== userId) {
      throw new Error('Not authorized to update this reflection');
    }

    const update: any = { ...updateData };

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
    if (reflection.userId.toString() !== userId) {
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
