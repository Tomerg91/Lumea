import { supabase } from './supabase.js';
import { z } from 'zod';
import crypto from 'crypto';

// Type definitions for our entities
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'client' | 'coach' | 'admin';
  password?: string;
  profilePicture?: string;
  phone?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserLink {
  id: string;
  coachId: string;
  clientId: string;
  createdAt: string;
}

export interface Session {
  id: string;
  coachId: string;
  clientId: string;
  dateTime: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  paymentStatus: 'pending' | 'paid' | 'overdue';
  isRecurring: boolean;
  recurrenceRule?: string;
  recurrenceEndDate?: string;
  textNotes?: string;
  audioNotes?: string;
  clientReflectionReminderSent: boolean;
  coachReflectionReminderSent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Reflection {
  id: string;
  clientId: string;
  sessionId?: string;
  content: string;
  mood?: string;
  sharedWithCoach: boolean;
  audioEntry?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  coachId: string;
  clientId: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  reminderSent: boolean;
  sessionsCovered: number;
  createdAt: string;
  updatedAt: string;
}

export interface Resource {
  id: string;
  coachId: string;
  title: string;
  description?: string;
  type: string;
  content?: string;
  url?: string;
  visibleToClients: boolean;
  featured: boolean;
  category?: string;
  difficulty?: string;
  languageCode?: string;
  durationMinutes?: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ResourceAccess {
  id: string;
  resourceId: string;
  clientId: string;
  coachId: string;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CoachNote {
  id: string;
  coachId: string;
  sessionId: string;
  title?: string;
  textContent: string;
  audioFileId?: string;
  tags: string[];
  isEncrypted: boolean;
  privacySettings: {
    accessLevel: 'private' | 'supervisor' | 'team' | 'organization';
    allowExport: boolean;
    allowSharing: boolean;
    retentionPeriodDays?: number;
    autoDeleteAfterDays?: number;
    requireReasonForAccess: boolean;
    sensitiveContent: boolean;
    supervisionRequired: boolean;
  };
  sharedWith: string[];
  createdAt: string;
  updatedAt: string;
}

export interface File {
  id: string;
  userId: string;
  url: string;
  filename: string;
  mimetype: string;
  size: number;
  context: 'profile' | 'resource' | 'audio_note';
  createdAt: string;
}

// Validation schemas
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

export const createReflectionSchema = z.object({
  clientId: z.string(),
  sessionId: z.string().optional(),
  content: z.string(),
  mood: z.string().optional(),
  sharedWithCoach: z.boolean().default(false),
  audioEntry: z.string().optional(),
});

export const createTagSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
  description: z.string().optional(),
});

export const createCoachNoteSchema = z.object({
  sessionId: z.string(),
  textContent: z.string(),
  title: z.string().optional(),
  audioFileId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isEncrypted: z.boolean().default(true),
  privacySettings: z.object({
    accessLevel: z.enum(['private', 'supervisor', 'team', 'organization']).default('private'),
    allowExport: z.boolean().default(false),
    allowSharing: z.boolean().default(false),
    retentionPeriodDays: z.number().optional(),
    autoDeleteAfterDays: z.number().optional(),
    requireReasonForAccess: z.boolean().default(false),
    sensitiveContent: z.boolean().default(false),
    supervisionRequired: z.boolean().default(false),
  }).optional(),
  sharedWith: z.array(z.string()).optional(),
});

// Resource filters interface
export interface ResourceFilters {
  type?: string | string[];
  category?: string | string[];
  tags?: string[];
  difficulty?: string;
  search?: string;
  featured?: boolean;
  languageCode?: string;
  minDuration?: number;
  maxDuration?: number;
}

export class SupabaseStorage {
  // User methods
  async getUser(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }

    return data;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      console.error('Error fetching user by email:', error);
      return null;
    }

    return data;
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return null;
    }

    return data;
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .update({ ...userData, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return null;
    }

    return data;
  }

  // Password reset methods
  async createPasswordResetToken(email: string): Promise<string | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { error } = await supabase
      .from('password_reset_tokens')
      .insert([{
        userId: user.id,
        token,
        expiresAt: expiresAt.toISOString(),
      }]);

    if (error) {
      console.error('Error creating password reset token:', error);
      return null;
    }

    return token;
  }

  async validatePasswordResetToken(token: string): Promise<User | null> {
    const { data: tokenData, error } = await supabase
      .from('password_reset_tokens')
      .select('userId, expiresAt')
      .eq('token', token)
      .single();

    if (error || !tokenData) return null;

    if (new Date(tokenData.expiresAt) < new Date()) {
      // Token expired, delete it
      await supabase
        .from('password_reset_tokens')
        .delete()
        .eq('token', token);
      return null;
    }

    return await this.getUser(tokenData.userId);
  }

  async resetPassword(userId: string, newPassword: string): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update({ password: newPassword, updatedAt: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      console.error('Error resetting password:', error);
      return false;
    }

    // Delete all password reset tokens for this user
    await supabase
      .from('password_reset_tokens')
      .delete()
      .eq('userId', userId);

    return true;
  }

  // UserLink methods
  async createUserLink(linkData: Omit<UserLink, 'id' | 'createdAt'>): Promise<UserLink | null> {
    const { data, error } = await supabase
      .from('user_links')
      .insert([linkData])
      .select()
      .single();

    if (error) {
      console.error('Error creating user link:', error);
      return null;
    }

    return data;
  }

  async getUserLinksByCoachId(coachId: string): Promise<UserLink[]> {
    const { data, error } = await supabase
      .from('user_links')
      .select('*')
      .eq('coachId', coachId);

    if (error) {
      console.error('Error fetching user links by coach:', error);
      return [];
    }

    return data || [];
  }

  async getUserLinksByClientId(clientId: string): Promise<UserLink[]> {
    const { data, error } = await supabase
      .from('user_links')
      .select('*')
      .eq('clientId', clientId);

    if (error) {
      console.error('Error fetching user links by client:', error);
      return [];
    }

    return data || [];
  }

  async getUserLink(coachId: string, clientId: string): Promise<UserLink | null> {
    const { data, error } = await supabase
      .from('user_links')
      .select('*')
      .eq('coachId', coachId)
      .eq('clientId', clientId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      console.error('Error fetching user link:', error);
      return null;
    }

    return data;
  }

  // Session methods
  async createSession(sessionData: any): Promise<Session | null> {
    const { data, error } = await supabase
      .from('sessions')
      .insert([{
        ...sessionData,
        clientReflectionReminderSent: false,
        coachReflectionReminderSent: false,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      return null;
    }

    return data;
  }

  async getSessionById(id: string): Promise<Session | null> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      console.error('Error fetching session:', error);
      return null;
    }

    return data;
  }

  async getSessionsByCoachId(coachId: string): Promise<Session[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('coachId', coachId)
      .order('dateTime', { ascending: false });

    if (error) {
      console.error('Error fetching sessions by coach:', error);
      return [];
    }

    return data || [];
  }

  async getSessionsByClientId(clientId: string): Promise<Session[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('clientId', clientId)
      .order('dateTime', { ascending: false });

    if (error) {
      console.error('Error fetching sessions by client:', error);
      return [];
    }

    return data || [];
  }

  async updateSession(id: string, sessionData: Partial<Session>): Promise<Session | null> {
    const { data, error } = await supabase
      .from('sessions')
      .update({ ...sessionData, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating session:', error);
      return null;
    }

    return data;
  }

  // Reflection methods
  async createReflection(reflectionData: any): Promise<Reflection | null> {
    const { data, error } = await supabase
      .from('reflections')
      .insert([reflectionData])
      .select()
      .single();

    if (error) {
      console.error('Error creating reflection:', error);
      return null;
    }

    return data;
  }

  async getReflectionById(id: string): Promise<Reflection | null> {
    const { data, error } = await supabase
      .from('reflections')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      console.error('Error fetching reflection:', error);
      return null;
    }

    return data;
  }

  async getReflectionsByClientId(clientId: string): Promise<Reflection[]> {
    const { data, error } = await supabase
      .from('reflections')
      .select('*')
      .eq('clientId', clientId)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Error fetching reflections by client:', error);
      return [];
    }

    return data || [];
  }

  async getReflectionsBySessionId(sessionId: string): Promise<Reflection[]> {
    const { data, error } = await supabase
      .from('reflections')
      .select('*')
      .eq('sessionId', sessionId)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Error fetching reflections by session:', error);
      return [];
    }

    return data || [];
  }

  async getSharedReflectionsForCoach(coachId: string): Promise<Reflection[]> {
    // Get all client IDs linked to this coach
    const links = await this.getUserLinksByCoachId(coachId);
    const clientIds = links.map(link => link.clientId);

    if (clientIds.length === 0) return [];

    const { data, error } = await supabase
      .from('reflections')
      .select('*')
      .in('clientId', clientIds)
      .eq('sharedWithCoach', true)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Error fetching shared reflections for coach:', error);
      return [];
    }

    return data || [];
  }

  async updateReflection(id: string, reflectionData: Partial<Reflection>): Promise<Reflection | null> {
    const { data, error } = await supabase
      .from('reflections')
      .update({ ...reflectionData, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating reflection:', error);
      return null;
    }

    return data;
  }

  // Payment methods
  async createPayment(paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Payment | null> {
    const { data, error } = await supabase
      .from('payments')
      .insert([paymentData])
      .select()
      .single();

    if (error) {
      console.error('Error creating payment:', error);
      return null;
    }

    return data;
  }

  async getPaymentById(id: string): Promise<Payment | null> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      console.error('Error fetching payment:', error);
      return null;
    }

    return data;
  }

  async getPaymentsByCoachId(coachId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('coachId', coachId)
      .order('dueDate', { ascending: false });

    if (error) {
      console.error('Error fetching payments by coach:', error);
      return [];
    }

    return data || [];
  }

  async getPaymentsByClientId(clientId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('clientId', clientId)
      .order('dueDate', { ascending: false });

    if (error) {
      console.error('Error fetching payments by client:', error);
      return [];
    }

    return data || [];
  }

  async updatePayment(id: string, paymentData: Partial<Payment>): Promise<Payment | null> {
    const { data, error } = await supabase
      .from('payments')
      .update({ ...paymentData, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating payment:', error);
      return null;
    }

    return data;
  }

  // Resource methods
  async createResource(resourceData: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>): Promise<Resource | null> {
    const { data, error } = await supabase
      .from('resources')
      .insert([resourceData])
      .select()
      .single();

    if (error) {
      console.error('Error creating resource:', error);
      return null;
    }

    return data;
  }

  async getResourceById(id: string): Promise<Resource | null> {
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      console.error('Error fetching resource:', error);
      return null;
    }

    return data;
  }

  async getResourcesByCoachId(coachId: string): Promise<Resource[]> {
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('coachId', coachId)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Error fetching resources by coach:', error);
      return [];
    }

    return data || [];
  }

  async getVisibleResourcesForClient(clientId: string): Promise<Resource[]> {
    // Get coach IDs linked to this client
    const links = await this.getUserLinksByClientId(clientId);
    const coachIds = links.map(link => link.coachId);

    if (coachIds.length === 0) return [];

    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .in('coachId', coachIds)
      .eq('visibleToClients', true)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Error fetching visible resources for client:', error);
      return [];
    }

    return data || [];
  }

  async getFeaturedResources(limit?: number): Promise<Resource[]> {
    let query = supabase
      .from('resources')
      .select('*')
      .eq('featured', true)
      .eq('visibleToClients', true)
      .order('createdAt', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching featured resources:', error);
      return [];
    }

    return data || [];
  }

  async getResourcesByTag(tag: string): Promise<Resource[]> {
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .contains('tags', [tag])
      .eq('visibleToClients', true)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Error fetching resources by tag:', error);
      return [];
    }

    return data || [];
  }

  async getResourcesByCategory(category: string): Promise<Resource[]> {
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('category', category)
      .eq('visibleToClients', true)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Error fetching resources by category:', error);
      return [];
    }

    return data || [];
  }

  // ResourceAccess methods
  async createResourceAccess(accessData: Omit<ResourceAccess, 'id' | 'createdAt'>): Promise<ResourceAccess | null> {
    const { data, error } = await supabase
      .from('resource_access')
      .insert([accessData])
      .select()
      .single();

    if (error) {
      console.error('Error creating resource access:', error);
      return null;
    }

    return data;
  }

  async getResourceAccessByResourceId(resourceId: string): Promise<ResourceAccess[]> {
    const { data, error } = await supabase
      .from('resource_access')
      .select('*')
      .eq('resourceId', resourceId);

    if (error) {
      console.error('Error fetching resource access:', error);
      return [];
    }

    return data || [];
  }

  // Tag methods
  async createTag(tagData: any, userId: string): Promise<Tag | null> {
    const { data, error } = await supabase
      .from('tags')
      .insert([{ ...tagData, createdBy: userId }])
      .select()
      .single();

    if (error) {
      console.error('Error creating tag:', error);
      return null;
    }

    return data;
  }

  async getTagById(id: string): Promise<Tag | null> {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      console.error('Error fetching tag:', error);
      return null;
    }

    return data;
  }

  async getTagsByUser(userId: string): Promise<Tag[]> {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('createdBy', userId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching tags by user:', error);
      return [];
    }

    return data || [];
  }

  async updateTag(id: string, tagData: Partial<Tag>): Promise<Tag | null> {
    const { data, error } = await supabase
      .from('tags')
      .update({ ...tagData, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating tag:', error);
      return null;
    }

    return data;
  }

  async deleteTag(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting tag:', error);
      return false;
    }

    return true;
  }

  // CoachNote methods
  async createCoachNote(noteData: any, coachId: string): Promise<CoachNote | null> {
    const { data, error } = await supabase
      .from('coach_notes')
      .insert([{
        ...noteData,
        coachId,
        tags: noteData.tags || [],
        privacySettings: noteData.privacySettings || {
          accessLevel: 'private',
          allowExport: false,
          allowSharing: false,
          requireReasonForAccess: false,
          sensitiveContent: false,
          supervisionRequired: false
        },
        sharedWith: noteData.sharedWith || []
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating coach note:', error);
      return null;
    }

    return data;
  }

  async getCoachNoteById(id: string): Promise<CoachNote | null> {
    const { data, error } = await supabase
      .from('coach_notes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      console.error('Error fetching coach note:', error);
      return null;
    }

    return data;
  }

  async getCoachNotesBySession(sessionId: string): Promise<CoachNote[]> {
    const { data, error } = await supabase
      .from('coach_notes')
      .select('*')
      .eq('sessionId', sessionId)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Error fetching coach notes by session:', error);
      return [];
    }

    return data || [];
  }

  async getCoachNotesByCoach(coachId: string): Promise<CoachNote[]> {
    const { data, error } = await supabase
      .from('coach_notes')
      .select('*')
      .eq('coachId', coachId)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Error fetching coach notes by coach:', error);
      return [];
    }

    return data || [];
  }

  async updateCoachNote(id: string, noteData: Partial<CoachNote>): Promise<CoachNote | null> {
    const { data, error } = await supabase
      .from('coach_notes')
      .update({ ...noteData, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating coach note:', error);
      return null;
    }

    return data;
  }

  async deleteCoachNote(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('coach_notes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting coach note:', error);
      return false;
    }

    return true;
  }

  // File methods
  async createFileRecord(userId: string, fileData: {
    url: string;
    filename: string;
    mimetype: string;
    size: number;
    context: 'profile' | 'resource' | 'audio_note';
  }): Promise<File | null> {
    const { data, error } = await supabase
      .from('files')
      .insert([{ ...fileData, userId }])
      .select()
      .single();

    if (error) {
      console.error('Error creating file record:', error);
      return null;
    }

    return data;
  }

  async getFileById(fileId: string, userId: string): Promise<File | null> {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .eq('userId', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      console.error('Error fetching file:', error);
      return null;
    }

    return data;
  }

  async getFilesByUserAndContext(userId: string, context: 'profile' | 'resource' | 'audio_note'): Promise<File[]> {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('userId', userId)
      .eq('context', context)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Error fetching files by user and context:', error);
      return [];
    }

    return data || [];
  }

  async deleteFileRecord(fileId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId)
      .eq('userId', userId);

    if (error) {
      console.error('Error deleting file record:', error);
      return false;
    }

    return true;
  }
}

// Export singleton instance
export const supabaseStorage = new SupabaseStorage(); 