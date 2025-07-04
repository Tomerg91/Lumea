import { supabaseStorage } from './supabaseStorage';
import session from 'express-session';
import createMemoryStore from 'memorystore';

// Temporary type definitions for missing types
type Payment = any;
type InsertPayment = any;
type ExtendedResource = any;
type InsertResource = any;
type ResourceAccess = any;
type InsertResourceAccess = any;

const MemoryStore = createMemoryStore(session);

// ResourceFilters interface for advanced filtering
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

// ID conversion utilities
function convertToNumericId(supabaseId: string): number {
  // For compatibility, we'll use a hash-based approach to convert UUIDs to numbers
  let hash = 0;
  for (let i = 0; i < supabaseId.length; i++) {
    const char = supabaseId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

function convertToStringId(numericId: number): string {
  return numericId.toString();
}

// Type conversion utilities
function convertUserFromSupabase(supabaseUser: any): any {
  return {
    id: convertToNumericId(supabaseUser.id),
    email: supabaseUser.email,
    name: supabaseUser.name,
    role: supabaseUser.role,
    password: supabaseUser.password,
    profilePicture: supabaseUser.profilePicture,
    phone: supabaseUser.phone,
    bio: supabaseUser.bio,
    createdAt: new Date(supabaseUser.createdAt),
    updatedAt: new Date(supabaseUser.updatedAt),
  };
}

function convertUserToSupabase(user: any): any {
  return {
    email: user.email,
    name: user.name,
    role: user.role,
    password: user.password,
    profilePicture: user.profilePicture,
    phone: user.phone,
    bio: user.bio,
  };
}

function convertUserLinkFromSupabase(supabaseLink: any): any {
  return {
    id: convertToNumericId(supabaseLink.id),
    coachId: convertToNumericId(supabaseLink.coachId),
    clientId: convertToNumericId(supabaseLink.clientId),
    createdAt: new Date(supabaseLink.createdAt),
  };
}

function convertUserLinkToSupabase(link: any): any {
  return {
    coachId: convertToStringId(link.coachId),
    clientId: convertToStringId(link.clientId),
  };
}

function convertSessionFromSupabase(supabaseSession: any): any {
  return {
    id: convertToNumericId(supabaseSession.id),
    coachId: convertToNumericId(supabaseSession.coachId),
    clientId: convertToNumericId(supabaseSession.clientId),
    dateTime: new Date(supabaseSession.dateTime),
    duration: supabaseSession.duration,
    status: supabaseSession.status,
    paymentStatus: supabaseSession.paymentStatus,
    isRecurring: supabaseSession.isRecurring,
    recurrenceRule: supabaseSession.recurrenceRule,
    recurrenceEndDate: supabaseSession.recurrenceEndDate ? new Date(supabaseSession.recurrenceEndDate) : undefined,
    textNotes: supabaseSession.textNotes,
    audioNotes: supabaseSession.audioNotes,
    clientReflectionReminderSent: supabaseSession.clientReflectionReminderSent,
    coachReflectionReminderSent: supabaseSession.coachReflectionReminderSent,
    createdAt: new Date(supabaseSession.createdAt),
    updatedAt: new Date(supabaseSession.updatedAt),
  };
}

function convertSessionToSupabase(session: any): any {
  return {
    coachId: convertToStringId(session.coachId),
    clientId: convertToStringId(session.clientId),
    dateTime: session.dateTime.toISOString(),
    duration: session.duration,
    status: session.status,
    paymentStatus: session.paymentStatus,
    isRecurring: session.isRecurring,
    recurrenceRule: session.recurrenceRule,
    recurrenceEndDate: session.recurrenceEndDate?.toISOString(),
    textNotes: session.textNotes,
    audioNotes: session.audioNotes,
  };
}

function convertReflectionFromSupabase(supabaseReflection: any): any {
  return {
    id: convertToNumericId(supabaseReflection.id),
    clientId: convertToNumericId(supabaseReflection.clientId),
    sessionId: supabaseReflection.sessionId ? convertToNumericId(supabaseReflection.sessionId) : undefined,
    content: supabaseReflection.content,
    mood: supabaseReflection.mood,
    sharedWithCoach: supabaseReflection.sharedWithCoach,
    audioEntry: supabaseReflection.audioEntry,
    createdAt: new Date(supabaseReflection.createdAt),
    updatedAt: new Date(supabaseReflection.updatedAt),
  };
}

function convertReflectionToSupabase(reflection: any): any {
  return {
    clientId: convertToStringId(reflection.clientId),
    sessionId: reflection.sessionId ? convertToStringId(reflection.sessionId) : undefined,
    content: reflection.content,
    mood: reflection.mood,
    sharedWithCoach: reflection.sharedWithCoach,
    audioEntry: reflection.audioEntry,
  };
}

function convertPaymentFromSupabase(supabasePayment: any): any {
  return {
    id: convertToNumericId(supabasePayment.id),
    coachId: convertToNumericId(supabasePayment.coachId),
    clientId: convertToNumericId(supabasePayment.clientId),
    amount: supabasePayment.amount,
    dueDate: new Date(supabasePayment.dueDate),
    status: supabasePayment.status,
    reminderSent: supabasePayment.reminderSent,
    sessionsCovered: supabasePayment.sessionsCovered,
    createdAt: new Date(supabasePayment.createdAt),
    updatedAt: new Date(supabasePayment.updatedAt),
  };
}

function convertPaymentToSupabase(payment: any): any {
  return {
    coachId: convertToStringId(payment.coachId),
    clientId: convertToStringId(payment.clientId),
    amount: payment.amount,
    dueDate: payment.dueDate.toISOString(),
    status: payment.status,
    reminderSent: payment.reminderSent,
    sessionsCovered: payment.sessionsCovered,
  };
}

function convertResourceFromSupabase(supabaseResource: any): any {
  return {
    id: convertToNumericId(supabaseResource.id),
    coachId: convertToNumericId(supabaseResource.coachId),
    title: supabaseResource.title,
    description: supabaseResource.description,
    type: supabaseResource.type,
    content: supabaseResource.content,
    url: supabaseResource.url,
    visibleToClients: supabaseResource.visibleToClients,
    featured: supabaseResource.featured,
    category: supabaseResource.category,
    difficulty: supabaseResource.difficulty,
    languageCode: supabaseResource.languageCode,
    durationMinutes: supabaseResource.durationMinutes,
    tags: supabaseResource.tags,
    createdAt: new Date(supabaseResource.createdAt),
    updatedAt: new Date(supabaseResource.updatedAt),
  };
}

function convertResourceToSupabase(resource: any): any {
  return {
    coachId: convertToStringId(resource.coachId),
    title: resource.title,
    description: resource.description,
    type: resource.type,
    content: resource.content,
    url: resource.url,
    visibleToClients: resource.visibleToClients,
    featured: resource.featured,
    category: resource.category,
    difficulty: resource.difficulty,
    languageCode: resource.languageCode,
    durationMinutes: resource.durationMinutes,
    tags: resource.tags,
  };
}

function convertResourceAccessFromSupabase(supabaseAccess: any): any {
  return {
    id: convertToNumericId(supabaseAccess.id),
    resourceId: convertToNumericId(supabaseAccess.resourceId),
    clientId: convertToNumericId(supabaseAccess.clientId),
    coachId: convertToNumericId(supabaseAccess.coachId),
    createdAt: new Date(supabaseAccess.createdAt),
  };
}

function convertResourceAccessToSupabase(access: any): any {
  return {
    resourceId: convertToStringId(access.resourceId),
    clientId: convertToStringId(access.clientId),
    coachId: convertToStringId(access.coachId),
  };
}

export class SupabaseStorageAdapter {
  sessionStore: any;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  // User methods
  async getUser(id: number): Promise<any> {
    const supabaseUser = await supabaseStorage.getUser(convertToStringId(id));
    return supabaseUser ? convertUserFromSupabase(supabaseUser) : undefined;
  }

  async getUserByEmail(email: string): Promise<any> {
    const supabaseUser = await supabaseStorage.getUserByEmail(email);
    return supabaseUser ? convertUserFromSupabase(supabaseUser) : undefined;
  }

  async createUser(user: any): Promise<any> {
    const supabaseUser = await supabaseStorage.createUser(convertUserToSupabase(user));
    if (!supabaseUser) {
      throw new Error('Failed to create user');
    }
    return convertUserFromSupabase(supabaseUser);
  }

  async updateUser(id: number, user: any): Promise<any> {
    const supabaseUser = await supabaseStorage.updateUser(convertToStringId(id), user);
    return supabaseUser ? convertUserFromSupabase(supabaseUser) : undefined;
  }

  // Password reset methods
  async createPasswordResetToken(email: string): Promise<string | null> {
    return await supabaseStorage.createPasswordResetToken(email);
  }

  async validatePasswordResetToken(token: string): Promise<any> {
    const supabaseUser = await supabaseStorage.validatePasswordResetToken(token);
    return supabaseUser ? convertUserFromSupabase(supabaseUser) : null;
  }

  async resetPassword(userId: number, newPassword: string): Promise<boolean> {
    return await supabaseStorage.resetPassword(convertToStringId(userId), newPassword);
  }

  // UserLink methods
  async createUserLink(userLink: any): Promise<any> {
    const supabaseLink = await supabaseStorage.createUserLink(convertUserLinkToSupabase(userLink));
    if (!supabaseLink) {
      throw new Error('Failed to create user link');
    }
    return convertUserLinkFromSupabase(supabaseLink);
  }

  async getUserLinksByCoachId(coachId: number): Promise<any[]> {
    const supabaseLinks = await supabaseStorage.getUserLinksByCoachId(convertToStringId(coachId));
    return supabaseLinks.map(convertUserLinkFromSupabase);
  }

  async getUserLinksByClientId(clientId: number): Promise<any[]> {
    const supabaseLinks = await supabaseStorage.getUserLinksByClientId(convertToStringId(clientId));
    return supabaseLinks.map(convertUserLinkFromSupabase);
  }

  async getUserLink(coachId: number, clientId: number): Promise<any> {
    const supabaseLink = await supabaseStorage.getUserLink(
      convertToStringId(coachId), 
      convertToStringId(clientId)
    );
    return supabaseLink ? convertUserLinkFromSupabase(supabaseLink) : undefined;
  }

  // Session methods
  async createSession(session: any): Promise<any> {
    const supabaseSession = await supabaseStorage.createSession(convertSessionToSupabase(session));
    if (!supabaseSession) {
      throw new Error('Failed to create session');
    }
    return convertSessionFromSupabase(supabaseSession);
  }

  async getSessionById(id: number): Promise<any> {
    const supabaseSession = await supabaseStorage.getSessionById(convertToStringId(id));
    return supabaseSession ? convertSessionFromSupabase(supabaseSession) : undefined;
  }

  async getSessionsByCoachId(coachId: number): Promise<any[]> {
    const supabaseSessions = await supabaseStorage.getSessionsByCoachId(convertToStringId(coachId));
    return supabaseSessions.map(convertSessionFromSupabase);
  }

  async getSessionsByClientId(clientId: number): Promise<any[]> {
    const supabaseSessions = await supabaseStorage.getSessionsByClientId(convertToStringId(clientId));
    return supabaseSessions.map(convertSessionFromSupabase);
  }

  async updateSession(id: number, session: any): Promise<any> {
    const supabaseSession = await supabaseStorage.updateSession(convertToStringId(id), session);
    return supabaseSession ? convertSessionFromSupabase(supabaseSession) : undefined;
  }

  // Reflection methods
  async createReflection(reflection: any): Promise<any> {
    const supabaseReflection = await supabaseStorage.createReflection(convertReflectionToSupabase(reflection));
    if (!supabaseReflection) {
      throw new Error('Failed to create reflection');
    }
    return convertReflectionFromSupabase(supabaseReflection);
  }

  async getReflectionById(id: number): Promise<any> {
    const supabaseReflection = await supabaseStorage.getReflectionById(convertToStringId(id));
    return supabaseReflection ? convertReflectionFromSupabase(supabaseReflection) : undefined;
  }

  async getReflectionsByClientId(clientId: number): Promise<any[]> {
    const supabaseReflections = await supabaseStorage.getReflectionsByClientId(convertToStringId(clientId));
    return supabaseReflections.map(convertReflectionFromSupabase);
  }

  async getReflectionsBySessionId(sessionId: number): Promise<any[]> {
    const supabaseReflections = await supabaseStorage.getReflectionsBySessionId(convertToStringId(sessionId));
    return supabaseReflections.map(convertReflectionFromSupabase);
  }

  async getSharedReflectionsForCoach(coachId: number): Promise<any[]> {
    const supabaseReflections = await supabaseStorage.getSharedReflectionsForCoach(convertToStringId(coachId));
    return supabaseReflections.map(convertReflectionFromSupabase);
  }

  async updateReflection(id: number, reflectionData: any): Promise<any> {
    const supabaseReflection = await supabaseStorage.updateReflection(convertToStringId(id), reflectionData);
    return supabaseReflection ? convertReflectionFromSupabase(supabaseReflection) : undefined;
  }

  // Payment methods
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const supabasePayment = await supabaseStorage.createPayment(convertPaymentToSupabase(payment));
    if (!supabasePayment) {
      throw new Error('Failed to create payment');
    }
    return convertPaymentFromSupabase(supabasePayment);
  }

  async getPaymentById(id: number): Promise<Payment | undefined> {
    const supabasePayment = await supabaseStorage.getPaymentById(convertToStringId(id));
    return supabasePayment ? convertPaymentFromSupabase(supabasePayment) : undefined;
  }

  async getPaymentsByCoachId(coachId: number): Promise<Payment[]> {
    const supabasePayments = await supabaseStorage.getPaymentsByCoachId(convertToStringId(coachId));
    return supabasePayments.map(convertPaymentFromSupabase);
  }

  async getPaymentsByClientId(clientId: number): Promise<Payment[]> {
    const supabasePayments = await supabaseStorage.getPaymentsByClientId(convertToStringId(clientId));
    return supabasePayments.map(convertPaymentFromSupabase);
  }

  async updatePayment(id: number, payment: Partial<Payment>): Promise<Payment | undefined> {
    const supabasePayment = await supabaseStorage.updatePayment(convertToStringId(id), payment);
    return supabasePayment ? convertPaymentFromSupabase(supabasePayment) : undefined;
  }

  // Resource methods
  async createResource(resource: InsertResource): Promise<ExtendedResource> {
    const supabaseResource = await supabaseStorage.createResource(convertResourceToSupabase(resource));
    if (!supabaseResource) {
      throw new Error('Failed to create resource');
    }
    return convertResourceFromSupabase(supabaseResource);
  }

  async getResourceById(id: number): Promise<ExtendedResource | undefined> {
    const supabaseResource = await supabaseStorage.getResourceById(convertToStringId(id));
    return supabaseResource ? convertResourceFromSupabase(supabaseResource) : undefined;
  }

  async getResourcesByCoachId(coachId: number): Promise<ExtendedResource[]> {
    const supabaseResources = await supabaseStorage.getResourcesByCoachId(convertToStringId(coachId));
    return supabaseResources.map(convertResourceFromSupabase);
  }

  async getResourcesByCoachIdAndFilters(coachId: number, filters: ResourceFilters): Promise<ExtendedResource[]> {
    // For now, get all resources and filter client-side
    // TODO: Implement server-side filtering in Supabase
    const resources = await this.getResourcesByCoachId(coachId);
    return this.applyResourceFilters(resources, filters);
  }

  async getVisibleResourcesForClient(clientId: number): Promise<ExtendedResource[]> {
    const supabaseResources = await supabaseStorage.getVisibleResourcesForClient(convertToStringId(clientId));
    return supabaseResources.map(convertResourceFromSupabase);
  }

  async getVisibleResourcesForClientByFilters(clientId: number, filters: ResourceFilters): Promise<ExtendedResource[]> {
    // For now, get all visible resources and filter client-side
    const resources = await this.getVisibleResourcesForClient(clientId);
    return this.applyResourceFilters(resources, filters);
  }

  async updateResource(id: number, resource: Partial<ExtendedResource>): Promise<ExtendedResource | undefined> {
    // TODO: Implement updateResource in SupabaseStorage
    throw new Error('updateResource not implemented yet');
  }

  async getFeaturedResources(limit?: number): Promise<ExtendedResource[]> {
    const supabaseResources = await supabaseStorage.getFeaturedResources(limit);
    return supabaseResources.map(convertResourceFromSupabase);
  }

  async getResourcesByTag(tag: string): Promise<ExtendedResource[]> {
    const supabaseResources = await supabaseStorage.getResourcesByTag(tag);
    return supabaseResources.map(convertResourceFromSupabase);
  }

  async getResourcesByCategory(category: string): Promise<ExtendedResource[]> {
    const supabaseResources = await supabaseStorage.getResourcesByCategory(category);
    return supabaseResources.map(convertResourceFromSupabase);
  }

  async getResourcesByDifficulty(difficulty: string): Promise<ExtendedResource[]> {
    // TODO: Implement getResourcesByDifficulty in SupabaseStorage
    throw new Error('getResourcesByDifficulty not implemented yet');
  }

  // ResourceAccess methods
  async createResourceAccess(resourceAccess: InsertResourceAccess): Promise<ResourceAccess> {
    const supabaseAccess = await supabaseStorage.createResourceAccess(convertResourceAccessToSupabase(resourceAccess));
    if (!supabaseAccess) {
      throw new Error('Failed to create resource access');
    }
    return convertResourceAccessFromSupabase(supabaseAccess);
  }

  async getResourceAccessByResourceId(resourceId: number): Promise<ResourceAccess[]> {
    const supabaseAccess = await supabaseStorage.getResourceAccessByResourceId(convertToStringId(resourceId));
    return supabaseAccess.map(convertResourceAccessFromSupabase);
  }

  // Helper method for filtering resources
  private applyResourceFilters(resources: ExtendedResource[], filters: ResourceFilters): ExtendedResource[] {
    return resources.filter(resource => {
      // Type filter
      if (filters.type) {
        const types = Array.isArray(filters.type) ? filters.type : [filters.type];
        if (!types.includes(resource.type)) return false;
      }

      // Category filter
      if (filters.category) {
        const categories = Array.isArray(filters.category) ? filters.category : [filters.category];
        if (!resource.category || !categories.includes(resource.category)) return false;
      }

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        if (!resource.tags || !filters.tags.some(tag => resource.tags!.includes(tag))) return false;
      }

      // Difficulty filter
      if (filters.difficulty && resource.difficulty !== filters.difficulty) return false;

      // Featured filter
      if (filters.featured !== undefined && resource.featured !== filters.featured) return false;

      // Language filter
      if (filters.languageCode && resource.languageCode !== filters.languageCode) return false;

      // Duration filters
      if (filters.minDuration && (!resource.durationMinutes || resource.durationMinutes < filters.minDuration)) return false;
      if (filters.maxDuration && (!resource.durationMinutes || resource.durationMinutes > filters.maxDuration)) return false;

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const titleMatch = resource.title.toLowerCase().includes(searchLower);
        const descriptionMatch = resource.description?.toLowerCase().includes(searchLower);
        const contentMatch = resource.content?.toLowerCase().includes(searchLower);
        if (!titleMatch && !descriptionMatch && !contentMatch) return false;
      }

      return true;
    });
  }
}

// Export singleton instance
export const supabaseStorageAdapter = new SupabaseStorageAdapter(); 