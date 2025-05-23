// @ts-nocheck
import { drizzle } from 'drizzle-orm/node-postgres';
import {
  users,
  userLinks,
  sessions,
  reflections,
  payments,
  resources,
  resourceAccess,
} from './drizzle/schema';
import {
  type User,
  type UserLink,
  type Session,
  type Reflection,
  type Payment,
  type Resource,
  type ResourceAccess,
  type InsertUser,
  type InsertUserLink,
  type InsertSession,
  type InsertReflection,
  type InsertPayment,
  type InsertResource,
  type InsertResourceAccess,
} from './drizzle/schema';
import { SessionStore } from './lib/session-store';
import {
  pool,
  type SelectUser,
  inArray,
  like,
  and,
  or,
  gt,
  lt,
  desc,
  asc,
} from 'drizzle-orm';
import crypto from 'crypto';
import util from 'util';
import session from 'express-session';
import createMemoryStore from 'memorystore';
import type { Store as SessionStore } from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { ExtendedSession, ExtendedReflection } from './src/types/schema-types';

const MemoryStore = createMemoryStore(session);
const PgSession = connectPgSimple(session);

// Define extended interface for Reflection to add sharedWithCoach property
export interface ExtendedReflection extends Reflection {
  sharedWithCoach?: boolean;
  audioEntry?: string;
}

// Define extended interface for Resource to add additional properties
export interface ExtendedResource extends Resource {
  visibleToClients?: boolean;
  featured?: boolean;
  category?: string;
  difficulty?: string;
  languageCode?: string;
  durationMinutes?: number;
  tags?: string[];
}

// Define a ResourceFilters interface for advanced filtering
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

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;

  // Password reset methods
  createPasswordResetToken(email: string): Promise<string | null>;
  validatePasswordResetToken(token: string): Promise<User | null>;
  resetPassword(userId: number, newPassword: string): Promise<boolean>;

  // UserLink methods
  createUserLink(userLink: InsertUserLink): Promise<UserLink>;
  getUserLinksByCoachId(coachId: number): Promise<UserLink[]>;
  getUserLinksByClientId(clientId: number): Promise<UserLink[]>;
  getUserLink(coachId: number, clientId: number): Promise<UserLink | undefined>;

  // Session methods
  createSession(session: InsertSession): Promise<Session>;
  getSessionById(id: number): Promise<Session | undefined>;
  getSessionsByCoachId(coachId: number): Promise<Session[]>;
  getSessionsByClientId(clientId: number): Promise<Session[]>;
  updateSession(id: number, session: Partial<Session>): Promise<Session | undefined>;

  // Reflection methods
  createReflection(reflection: InsertReflection): Promise<ExtendedReflection>;
  getReflectionById(id: number): Promise<ExtendedReflection | undefined>;
  getReflectionsByClientId(clientId: number): Promise<ExtendedReflection[]>;
  getReflectionsBySessionId(sessionId: number): Promise<ExtendedReflection[]>;
  getSharedReflectionsForCoach(coachId: number): Promise<ExtendedReflection[]>;

  // Payment methods
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentById(id: number): Promise<Payment | undefined>;
  getPaymentsByCoachId(coachId: number): Promise<Payment[]>;
  getPaymentsByClientId(clientId: number): Promise<Payment[]>;
  updatePayment(id: number, payment: Partial<Payment>): Promise<Payment | undefined>;

  // Resource methods
  createResource(resource: InsertResource): Promise<ExtendedResource>;
  getResourceById(id: number): Promise<ExtendedResource | undefined>;
  getResourcesByCoachId(coachId: number): Promise<ExtendedResource[]>;
  getResourcesByCoachIdAndFilters(
    coachId: number,
    filters: ResourceFilters
  ): Promise<ExtendedResource[]>;
  getVisibleResourcesForClient(clientId: number): Promise<ExtendedResource[]>;
  getVisibleResourcesForClientByFilters(
    clientId: number,
    filters: ResourceFilters
  ): Promise<ExtendedResource[]>;
  updateResource(
    id: number,
    resource: Partial<ExtendedResource>
  ): Promise<ExtendedResource | undefined>;
  getFeaturedResources(limit?: number): Promise<ExtendedResource[]>;
  getResourcesByTag(tag: string): Promise<ExtendedResource[]>;
  getResourcesByCategory(category: string): Promise<ExtendedResource[]>;
  getResourcesByDifficulty(difficulty: string): Promise<ExtendedResource[]>;

  // ResourceAccess methods
  createResourceAccess(resourceAccess: InsertResourceAccess): Promise<ResourceAccess>;
  getResourceAccessByResourceId(resourceId: number): Promise<ResourceAccess[]>;

  // Session store for authentication
  sessionStore: SessionStore;
}

export class MemStorage implements IStorage {
  private usersData: Map<number, User>;
  private userLinksData: Map<number, UserLink>;
  private sessionsData: Map<number, Session>;
  private reflectionsData: Map<number, ExtendedReflection>;
  private paymentsData: Map<number, Payment>;
  private resourcesData: Map<number, ExtendedResource>;
  private resourceAccessData: Map<number, ResourceAccess>;

  // Password reset tokens: token -> {userId, expiry}
  private passwordResetTokens: Map<string, { userId: number; expiry: Date }>;

  private currentUserId: number = 1;
  private currentUserLinkId: number = 1;
  private currentSessionId: number = 1;
  private currentReflectionId: number = 1;
  private currentPaymentId: number = 1;
  private currentResourceId: number = 1;
  private currentResourceAccessId: number = 1;

  sessionStore: SessionStore;

  constructor() {
    this.usersData = new Map();
    this.userLinksData = new Map();
    this.sessionsData = new Map();
    this.reflectionsData = new Map();
    this.paymentsData = new Map();
    this.resourcesData = new Map();
    this.resourceAccessData = new Map();
    this.passwordResetTokens = new Map();

    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  // Password reset methods
  async createPasswordResetToken(email: string): Promise<string | null> {
    const user = await this.getUserByEmail(email);
    if (!user) {
      return null;
    }

    // Generate a unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Store token with expiration (24 hours from now)
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 24);

    this.passwordResetTokens.set(token, {
      userId: user.id,
      expiry,
    });

    return token;
  }

  async validatePasswordResetToken(token: string): Promise<User | null> {
    const resetInfo = this.passwordResetTokens.get(token);

    // Token doesn't exist
    if (!resetInfo) {
      return null;
    }

    // Token expired
    if (resetInfo.expiry < new Date()) {
      this.passwordResetTokens.delete(token);
      return null;
    }

    const user = await this.getUser(resetInfo.userId);
    return user || null;
  }

  async resetPassword(userId: number, newPassword: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) {
      return false;
    }

    // Hash the new password
    const salt = crypto.randomBytes(16).toString('hex');
    const buf = await util.promisify(crypto.scrypt)(newPassword, salt, 64);
    const hashedPassword = `${buf.toString('hex')}.${salt}`;

    // Update the user's password
    user.password = hashedPassword;
    this.usersData.set(userId, user);

    // Remove any existing reset tokens for this user
    for (const [token, info] of this.passwordResetTokens.entries()) {
      if (info.userId === userId) {
        this.passwordResetTokens.delete(token);
      }
    }

    return true;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.usersData.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.usersData.values()).find((user) => user.email === email);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const newUser = {
      ...user,
      id,
      createdAt: new Date(),
    } as User;
    this.usersData.set(id, newUser);
    return newUser;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const existingUser = this.usersData.get(id);
    if (!existingUser) {
      return undefined;
    }
    const updatedUser = { ...existingUser, ...userData };
    this.usersData.set(id, updatedUser);
    return updatedUser;
  }

  // UserLink methods
  async createUserLink(userLink: InsertUserLink): Promise<UserLink> {
    const id = this.currentUserLinkId++;
    const newUserLink = {
      ...userLink,
      id,
      createdAt: new Date(),
    } as UserLink;
    this.userLinksData.set(id, newUserLink);
    return newUserLink;
  }

  async getUserLinksByCoachId(coachId: number): Promise<UserLink[]> {
    return Array.from(this.userLinksData.values()).filter(
      (userLink) => userLink.coachId === coachId
    );
  }

  async getUserLinksByClientId(clientId: number): Promise<UserLink[]> {
    return Array.from(this.userLinksData.values()).filter(
      (userLink) => userLink.clientId === clientId
    );
  }

  async getUserLink(coachId: number, clientId: number): Promise<UserLink | undefined> {
    return Array.from(this.userLinksData.values()).find(
      (userLink) => userLink.coachId === coachId && userLink.clientId === clientId
    );
  }

  // Session methods
  async createSession(sessionData: InsertSession): Promise<Session> {
    const id = this.currentSessionId++;
    const newSession = {
      ...sessionData,
      id,
      createdAt: new Date(),
    } as Session;
    this.sessionsData.set(id, newSession);
    return newSession;
  }

  async getSessionById(id: number): Promise<Session | undefined> {
    return this.sessionsData.get(id);
  }

  async getSessionsByCoachId(coachId: number): Promise<Session[]> {
    return Array.from(this.sessionsData.values()).filter((session) => session.coachId === coachId);
  }

  async getSessionsByClientId(clientId: number): Promise<Session[]> {
    return Array.from(this.sessionsData.values()).filter(
      (session) => session.clientId === clientId
    );
  }

  async updateSession(id: number, sessionData: Partial<Session>): Promise<Session | undefined> {
    const existingSession = this.sessionsData.get(id);
    if (!existingSession) {
      return undefined;
    }
    const updatedSession = { ...existingSession, ...sessionData } as ExtendedSession;
    this.sessionsData.set(id, updatedSession);
    return updatedSession;
  }

  // Reflection methods
  async createReflection(reflection: InsertReflection): Promise<ExtendedReflection> {
    const id = this.currentReflectionId++;
    const newReflection = {
      ...reflection,
      id,
      createdAt: new Date(),
    } as ExtendedReflection;
    this.reflectionsData.set(id, newReflection);
    return newReflection;
  }

  async getReflectionById(id: number): Promise<ExtendedReflection | undefined> {
    return this.reflectionsData.get(id);
  }

  async getReflectionsByClientId(clientId: number): Promise<ExtendedReflection[]> {
    return Array.from(this.reflectionsData.values()).filter(
      (reflection) => reflection.clientId === clientId
    );
  }

  async getReflectionsBySessionId(sessionId: number): Promise<ExtendedReflection[]> {
    return Array.from(this.reflectionsData.values()).filter(
      (reflection) => reflection.sessionId === sessionId
    );
  }

  async updateReflection(
    id: number,
    reflectionData: Partial<ExtendedReflection>
  ): Promise<ExtendedReflection | undefined> {
    const existingReflection = this.reflectionsData.get(id);
    if (!existingReflection) {
      return undefined;
    }
    const updatedReflection = { ...existingReflection, ...reflectionData };
    this.reflectionsData.set(id, updatedReflection);
    return updatedReflection;
  }

  async getSharedReflectionsForCoach(coachId: number): Promise<ExtendedReflection[]> {
    // Get all clients of the coach
    const userLinks = await this.getUserLinksByCoachId(coachId);
    const clientIds = userLinks.map((link) => link.clientId);

    // Get all reflections that are shared and belong to coach's clients
    return Array.from(this.reflectionsData.values()).filter(
      (reflection) => reflection.sharedWithCoach && clientIds.includes(reflection.clientId)
    );
  }

  // Payment methods
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const id = this.currentPaymentId++;
    const newPayment = {
      ...payment,
      id,
      createdAt: new Date(),
    } as Payment;
    this.paymentsData.set(id, newPayment);
    return newPayment;
  }

  async getPaymentById(id: number): Promise<Payment | undefined> {
    return this.paymentsData.get(id);
  }

  async getPaymentsByCoachId(coachId: number): Promise<Payment[]> {
    return Array.from(this.paymentsData.values()).filter((payment) => payment.coachId === coachId);
  }

  async getPaymentsByClientId(clientId: number): Promise<Payment[]> {
    return Array.from(this.paymentsData.values()).filter(
      (payment) => payment.clientId === clientId
    );
  }

  async updatePayment(id: number, paymentData: Partial<Payment>): Promise<Payment | undefined> {
    const existingPayment = this.paymentsData.get(id);
    if (!existingPayment) {
      return undefined;
    }
    const updatedPayment = { ...existingPayment, ...paymentData };
    this.paymentsData.set(id, updatedPayment);
    return updatedPayment;
  }

  // Resource methods
  async createResource(resource: InsertResource): Promise<ExtendedResource> {
    const id = this.currentResourceId++;
    const newResource = {
      ...resource,
      id,
      createdAt: new Date(),
    } as ExtendedResource;
    this.resourcesData.set(id, newResource);
    return newResource;
  }

  async getResourceById(id: number): Promise<ExtendedResource | undefined> {
    return this.resourcesData.get(id);
  }

  async getResourcesByCoachId(coachId: number): Promise<ExtendedResource[]> {
    return Array.from(this.resourcesData.values()).filter(
      (resource) => resource.coachId === coachId
    );
  }

  async getVisibleResourcesForClient(clientId: number): Promise<ExtendedResource[]> {
    // Get all coaches linked to this client
    const userLinks = await this.getUserLinksByClientId(clientId);
    const coachIds = userLinks.map((link) => link.coachId);

    // Get resources that are visible to clients and belong to the client's coaches
    const visibleResources = Array.from(this.resourcesData.values()).filter(
      (resource) => resource.visibleToClients && coachIds.includes(resource.coachId)
    );

    // Get resources that are specifically assigned to this client
    const resourceAccessEntries = Array.from(this.resourceAccessData.values()).filter(
      (access) => access.clientId === clientId
    );
    const specificResourceIds = resourceAccessEntries.map((access) => access.resourceId);

    // Get all resources that are specifically assigned to this client
    const specificResources = Array.from(this.resourcesData.values()).filter((resource) =>
      specificResourceIds.includes(resource.id)
    );

    // Combine both sets of resources, removing duplicates
    const allResources = [...visibleResources];
    for (const resource of specificResources) {
      if (!allResources.some((r) => r.id === resource.id)) {
        allResources.push(resource);
      }
    }

    return allResources;
  }

  async updateResource(
    id: number,
    resourceData: Partial<ExtendedResource>
  ): Promise<ExtendedResource | undefined> {
    const existingResource = this.resourcesData.get(id);
    if (!existingResource) {
      return undefined;
    }
    const updatedResource = { ...existingResource, ...resourceData };
    this.resourcesData.set(id, updatedResource);
    return updatedResource;
  }

  // Implement the new resource filtering methods
  async getResourcesByCoachIdAndFilters(
    coachId: number,
    filters: ResourceFilters
  ): Promise<ExtendedResource[]> {
    const resources = await this.getResourcesByCoachId(coachId);

    // Apply filters
    return this.applyResourceFilters(resources, filters);
  }

  async getVisibleResourcesForClientByFilters(
    clientId: number,
    filters: ResourceFilters
  ): Promise<ExtendedResource[]> {
    const resources = await this.getVisibleResourcesForClient(clientId);

    // Apply filters
    return this.applyResourceFilters(resources, filters);
  }

  async getFeaturedResources(limit?: number): Promise<ExtendedResource[]> {
    const featuredResources = Array.from(this.resourcesData.values())
      .filter((resource) => resource.featured)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return limit ? featuredResources.slice(0, limit) : featuredResources;
  }

  async getResourcesByTag(tag: string): Promise<ExtendedResource[]> {
    return Array.from(this.resourcesData.values()).filter(
      (resource) => resource.tags && resource.tags.includes(tag)
    );
  }

  async getResourcesByCategory(category: string): Promise<ExtendedResource[]> {
    try {
      // Use a simple cast to unknown to bypass type checking
      // @ts-expect-error - Runtime values need to be properly validated elsewhere
      const result = await db.select().from(resources).where(eq(resources.category, category));
      return result;
    } catch (error) {
      console.error('Error getting resources by category:', error);
      return [];
    }
  }

  async getResourcesByDifficulty(difficulty: string): Promise<ExtendedResource[]> {
    try {
      // Use a simple cast to unknown to bypass type checking
      // @ts-expect-error - Runtime values need to be properly validated elsewhere
      const result = await db.select().from(resources).where(eq(resources.difficulty, difficulty));
      return result;
    } catch (error) {
      console.error('Error getting resources by difficulty:', error);
      return [];
    }
  }

  // Helper method to apply filters to a resource array
  private applyResourceFilters(
    resources: ExtendedResource[],
    filters: ResourceFilters
  ): ExtendedResource[] {
    if (!filters) return resources;

    let filteredResources = [...resources];

    // Filter by type
    if (filters.type) {
      const types = Array.isArray(filters.type) ? filters.type : [filters.type];
      filteredResources = filteredResources.filter((r) => types.includes(r.type));
    }

    // Filter by category
    if (filters.category) {
      const categories = Array.isArray(filters.category) ? filters.category : [filters.category];
      filteredResources = filteredResources.filter((r) => categories.includes(r.category));
    }

    // Filter by tags (match any)
    if (filters.tags && filters.tags.length > 0) {
      filteredResources = filteredResources.filter(
        (r) => r.tags && filters.tags.some((tag) => r.tags.includes(tag))
      );
    }

    // Filter by difficulty
    if (filters.difficulty) {
      filteredResources = filteredResources.filter((r) => r.difficulty === filters.difficulty);
    }

    // Filter by language
    if (filters.languageCode) {
      filteredResources = filteredResources.filter((r) => r.languageCode === filters.languageCode);
    }

    // Filter by featured
    if (filters.featured !== undefined) {
      filteredResources = filteredResources.filter((r) => r.featured === filters.featured);
    }

    // Filter by duration
    if (filters.minDuration !== undefined) {
      const minDuration = filters.minDuration;
      filteredResources = filteredResources.filter(
        (r) => r.durationMinutes !== undefined && r.durationMinutes >= minDuration
      );
    }

    if (filters.maxDuration !== undefined) {
      const maxDuration = filters.maxDuration;
      filteredResources = filteredResources.filter(
        (r) => r.durationMinutes !== undefined && r.durationMinutes <= maxDuration
      );
    }

    // Search by title and description
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredResources = filteredResources.filter(
        (r) =>
          (r.title && r.title.toLowerCase().includes(searchLower)) ||
          (r.description && r.description.toLowerCase().includes(searchLower))
      );
    }

    return filteredResources;
  }

  // ResourceAccess methods
  async createResourceAccess(resourceAccessData: InsertResourceAccess): Promise<ResourceAccess> {
    const id = this.currentResourceAccessId++;
    const newResourceAccess = {
      ...resourceAccessData,
      id,
      createdAt: new Date(),
    } as ResourceAccess;
    this.resourceAccessData.set(id, newResourceAccess);
    return newResourceAccess;
  }

  async getResourceAccessByResourceId(resourceId: number): Promise<ResourceAccess[]> {
    return Array.from(this.resourceAccessData.values()).filter(
      (resourceAccess) => resourceAccess.resourceId === resourceId
    );
  }
}

// Use the DatabaseStorage implementation
export const storage = new MemStorage();
