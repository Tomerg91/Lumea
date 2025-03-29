import { 
  users, 
  userLinks, 
  sessions, 
  reflections, 
  payments, 
  resources, 
  resourceAccess,
  type User, 
  type InsertUser, 
  type UserLink, 
  type InsertUserLink, 
  type Session, 
  type InsertSession,
  type Reflection, 
  type InsertReflection, 
  type Payment, 
  type InsertPayment,
  type Resource, 
  type InsertResource,
  type ResourceAccess,
  type InsertResourceAccess
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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
  createReflection(reflection: InsertReflection): Promise<Reflection>;
  getReflectionById(id: number): Promise<Reflection | undefined>;
  getReflectionsByClientId(clientId: number): Promise<Reflection[]>;
  getReflectionsBySessionId(sessionId: number): Promise<Reflection[]>;
  getSharedReflectionsForCoach(coachId: number): Promise<Reflection[]>;
  
  // Payment methods
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentById(id: number): Promise<Payment | undefined>;
  getPaymentsByCoachId(coachId: number): Promise<Payment[]>;
  getPaymentsByClientId(clientId: number): Promise<Payment[]>;
  updatePayment(id: number, payment: Partial<Payment>): Promise<Payment | undefined>;
  
  // Resource methods
  createResource(resource: InsertResource): Promise<Resource>;
  getResourceById(id: number): Promise<Resource | undefined>;
  getResourcesByCoachId(coachId: number): Promise<Resource[]>;
  getResourcesByCoachIdAndFilters(coachId: number, filters: ResourceFilters): Promise<Resource[]>;
  getVisibleResourcesForClient(clientId: number): Promise<Resource[]>;
  getVisibleResourcesForClientByFilters(clientId: number, filters: ResourceFilters): Promise<Resource[]>;
  updateResource(id: number, resource: Partial<Resource>): Promise<Resource | undefined>;
  getFeaturedResources(limit?: number): Promise<Resource[]>;
  getResourcesByTag(tag: string): Promise<Resource[]>;
  getResourcesByCategory(category: string): Promise<Resource[]>;
  getResourcesByDifficulty(difficulty: string): Promise<Resource[]>;
  
  // ResourceAccess methods
  createResourceAccess(resourceAccess: InsertResourceAccess): Promise<ResourceAccess>;
  getResourceAccessByResourceId(resourceId: number): Promise<ResourceAccess[]>;
  
  // Session store for authentication
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private usersData: Map<number, User>;
  private userLinksData: Map<number, UserLink>;
  private sessionsData: Map<number, Session>;
  private reflectionsData: Map<number, Reflection>;
  private paymentsData: Map<number, Payment>;
  private resourcesData: Map<number, Resource>;
  private resourceAccessData: Map<number, ResourceAccess>;
  
  // Password reset tokens: token -> {userId, expiry}
  private passwordResetTokens: Map<string, { userId: number, expiry: Date }>;
  
  private currentUserId: number = 1;
  private currentUserLinkId: number = 1;
  private currentSessionId: number = 1;
  private currentReflectionId: number = 1;
  private currentPaymentId: number = 1;
  private currentResourceId: number = 1;
  private currentResourceAccessId: number = 1;
  
  sessionStore: session.SessionStore;

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
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }
  
  // Password reset methods
  async createPasswordResetToken(email: string): Promise<string | null> {
    const user = await this.getUserByEmail(email);
    if (!user) {
      return null;
    }
    
    // Generate a unique token
    const token = require('crypto').randomBytes(32).toString('hex');
    
    // Store token with expiration (24 hours from now)
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 24);
    
    this.passwordResetTokens.set(token, {
      userId: user.id,
      expiry
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
    const salt = require('crypto').randomBytes(16).toString('hex');
    const buf = await require('util').promisify(require('crypto').scrypt)(newPassword, salt, 64);
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
    return Array.from(this.usersData.values()).find(
      (user) => user.email === email
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const newUser: User = { 
      ...user, 
      id, 
      createdAt: new Date() 
    };
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
    const newUserLink: UserLink = { 
      ...userLink, 
      id, 
      createdAt: new Date() 
    };
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
    const newSession: Session = { 
      ...sessionData, 
      id, 
      createdAt: new Date() 
    };
    this.sessionsData.set(id, newSession);
    return newSession;
  }

  async getSessionById(id: number): Promise<Session | undefined> {
    return this.sessionsData.get(id);
  }

  async getSessionsByCoachId(coachId: number): Promise<Session[]> {
    return Array.from(this.sessionsData.values()).filter(
      (session) => session.coachId === coachId
    );
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
    const updatedSession = { ...existingSession, ...sessionData };
    this.sessionsData.set(id, updatedSession);
    return updatedSession;
  }

  // Reflection methods
  async createReflection(reflection: InsertReflection): Promise<Reflection> {
    const id = this.currentReflectionId++;
    const newReflection: Reflection = { 
      ...reflection, 
      id, 
      createdAt: new Date() 
    };
    this.reflectionsData.set(id, newReflection);
    return newReflection;
  }

  async getReflectionById(id: number): Promise<Reflection | undefined> {
    return this.reflectionsData.get(id);
  }

  async getReflectionsByClientId(clientId: number): Promise<Reflection[]> {
    return Array.from(this.reflectionsData.values()).filter(
      (reflection) => reflection.clientId === clientId
    );
  }

  async getReflectionsBySessionId(sessionId: number): Promise<Reflection[]> {
    return Array.from(this.reflectionsData.values()).filter(
      (reflection) => reflection.sessionId === sessionId
    );
  }

  async updateReflection(id: number, reflectionData: Partial<Reflection>): Promise<Reflection | undefined> {
    const existingReflection = this.reflectionsData.get(id);
    if (!existingReflection) {
      return undefined;
    }
    const updatedReflection = { ...existingReflection, ...reflectionData };
    this.reflectionsData.set(id, updatedReflection);
    return updatedReflection;
  }

  async getSharedReflectionsForCoach(coachId: number): Promise<Reflection[]> {
    // Get all clients of the coach
    const userLinks = await this.getUserLinksByCoachId(coachId);
    const clientIds = userLinks.map(link => link.clientId);
    
    // Get all reflections that are shared and belong to coach's clients
    return Array.from(this.reflectionsData.values()).filter(
      (reflection) => 
        reflection.sharedWithCoach && 
        clientIds.includes(reflection.clientId)
    );
  }

  // Payment methods
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const id = this.currentPaymentId++;
    const newPayment: Payment = { 
      ...payment, 
      id, 
      createdAt: new Date() 
    };
    this.paymentsData.set(id, newPayment);
    return newPayment;
  }

  async getPaymentById(id: number): Promise<Payment | undefined> {
    return this.paymentsData.get(id);
  }

  async getPaymentsByCoachId(coachId: number): Promise<Payment[]> {
    return Array.from(this.paymentsData.values()).filter(
      (payment) => payment.coachId === coachId
    );
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
  async createResource(resource: InsertResource): Promise<Resource> {
    const id = this.currentResourceId++;
    const newResource: Resource = { 
      ...resource, 
      id, 
      createdAt: new Date() 
    };
    this.resourcesData.set(id, newResource);
    return newResource;
  }

  async getResourceById(id: number): Promise<Resource | undefined> {
    return this.resourcesData.get(id);
  }

  async getResourcesByCoachId(coachId: number): Promise<Resource[]> {
    return Array.from(this.resourcesData.values()).filter(
      (resource) => resource.coachId === coachId
    );
  }

  async getVisibleResourcesForClient(clientId: number): Promise<Resource[]> {
    // Get all coaches linked to this client
    const userLinks = await this.getUserLinksByClientId(clientId);
    const coachIds = userLinks.map(link => link.coachId);
    
    // Get resources that are visible to clients and belong to the client's coaches
    const visibleResources = Array.from(this.resourcesData.values()).filter(
      (resource) => 
        resource.visibleToClients && 
        coachIds.includes(resource.coachId)
    );
    
    // Get resources that are specifically assigned to this client
    const resourceAccessEntries = Array.from(this.resourceAccessData.values()).filter(
      (access) => access.clientId === clientId
    );
    const specificResourceIds = resourceAccessEntries.map(access => access.resourceId);
    
    // Get all resources that are specifically assigned to this client
    const specificResources = Array.from(this.resourcesData.values()).filter(
      (resource) => specificResourceIds.includes(resource.id)
    );
    
    // Combine both sets of resources, removing duplicates
    const allResources = [...visibleResources];
    for (const resource of specificResources) {
      if (!allResources.some(r => r.id === resource.id)) {
        allResources.push(resource);
      }
    }
    
    return allResources;
  }

  async updateResource(id: number, resourceData: Partial<Resource>): Promise<Resource | undefined> {
    const existingResource = this.resourcesData.get(id);
    if (!existingResource) {
      return undefined;
    }
    const updatedResource = { ...existingResource, ...resourceData };
    this.resourcesData.set(id, updatedResource);
    return updatedResource;
  }

  // Implement the new resource filtering methods
  async getResourcesByCoachIdAndFilters(coachId: number, filters: ResourceFilters): Promise<Resource[]> {
    let resources = await this.getResourcesByCoachId(coachId);
    
    // Apply filters
    return this.applyResourceFilters(resources, filters);
  }
  
  async getVisibleResourcesForClientByFilters(clientId: number, filters: ResourceFilters): Promise<Resource[]> {
    let resources = await this.getVisibleResourcesForClient(clientId);
    
    // Apply filters
    return this.applyResourceFilters(resources, filters);
  }
  
  async getFeaturedResources(limit?: number): Promise<Resource[]> {
    const featuredResources = Array.from(this.resourcesData.values())
      .filter(resource => resource.featured)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
    return limit ? featuredResources.slice(0, limit) : featuredResources;
  }
  
  async getResourcesByTag(tag: string): Promise<Resource[]> {
    return Array.from(this.resourcesData.values())
      .filter(resource => resource.tags && resource.tags.includes(tag));
  }
  
  async getResourcesByCategory(category: string): Promise<Resource[]> {
    return Array.from(this.resourcesData.values())
      .filter(resource => resource.category === category);
  }
  
  async getResourcesByDifficulty(difficulty: string): Promise<Resource[]> {
    return Array.from(this.resourcesData.values())
      .filter(resource => resource.difficulty === difficulty);
  }
  
  // Helper method to apply filters to a resource array
  private applyResourceFilters(resources: Resource[], filters: ResourceFilters): Resource[] {
    if (!filters) return resources;
    
    let filteredResources = [...resources];
    
    // Filter by type
    if (filters.type) {
      const types = Array.isArray(filters.type) ? filters.type : [filters.type];
      filteredResources = filteredResources.filter(r => types.includes(r.type));
    }
    
    // Filter by category
    if (filters.category) {
      const categories = Array.isArray(filters.category) ? filters.category : [filters.category];
      filteredResources = filteredResources.filter(r => categories.includes(r.category));
    }
    
    // Filter by tags (match any)
    if (filters.tags && filters.tags.length > 0) {
      filteredResources = filteredResources.filter(r => 
        r.tags && filters.tags.some(tag => r.tags.includes(tag))
      );
    }
    
    // Filter by difficulty
    if (filters.difficulty) {
      filteredResources = filteredResources.filter(r => r.difficulty === filters.difficulty);
    }
    
    // Filter by language
    if (filters.languageCode) {
      filteredResources = filteredResources.filter(r => r.languageCode === filters.languageCode);
    }
    
    // Filter by featured
    if (filters.featured !== undefined) {
      filteredResources = filteredResources.filter(r => r.featured === filters.featured);
    }
    
    // Filter by duration
    if (filters.minDuration !== undefined) {
      filteredResources = filteredResources.filter(r => 
        r.durationMinutes !== undefined && r.durationMinutes >= filters.minDuration!
      );
    }
    
    if (filters.maxDuration !== undefined) {
      filteredResources = filteredResources.filter(r => 
        r.durationMinutes !== undefined && r.durationMinutes <= filters.maxDuration!
      );
    }
    
    // Search by title and description
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredResources = filteredResources.filter(r => 
        (r.title && r.title.toLowerCase().includes(searchLower)) || 
        (r.description && r.description.toLowerCase().includes(searchLower))
      );
    }
    
    return filteredResources;
  }

  // ResourceAccess methods
  async createResourceAccess(resourceAccessData: InsertResourceAccess): Promise<ResourceAccess> {
    const id = this.currentResourceAccessId++;
    const newResourceAccess: ResourceAccess = { 
      ...resourceAccessData, 
      id, 
      createdAt: new Date() 
    };
    this.resourceAccessData.set(id, newResourceAccess);
    return newResourceAccess;
  }

  async getResourceAccessByResourceId(resourceId: number): Promise<ResourceAccess[]> {
    return Array.from(this.resourceAccessData.values()).filter(
      (resourceAccess) => resourceAccess.resourceId === resourceId
    );
  }
}

import { db } from "./db";
import { eq, and, or, like, desc, sql, asc, isNull, not, inArray } from "drizzle-orm";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPgSimple(session);

// Database storage implementation
export class DatabaseStorage implements IStorage {
  sessionStore: any; // Use 'any' to avoid TypeScript issues
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }
  
  // Password reset methods
  async createPasswordResetToken(email: string): Promise<string | null> {
    const user = await this.getUserByEmail(email);
    if (!user) {
      return null;
    }
    
    // Generate a unique token
    const token = require('crypto').randomBytes(32).toString('hex');
    
    // In a real application, we would store this in a database table
    // For now, we'll add the logic later
    // TODO: Create password_reset_tokens table
    
    return token;
  }
  
  async validatePasswordResetToken(token: string): Promise<User | null> {
    // TODO: Implement with database
    return null;
  }
  
  async resetPassword(userId: number, newPassword: string): Promise<boolean> {
    try {
      const salt = require('crypto').randomBytes(16).toString('hex');
      const buf = await require('util').promisify(require('crypto').scrypt)(newPassword, salt, 64);
      const hashedPassword = `${buf.toString('hex')}.${salt}`;
      
      await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, userId));
      
      return true;
    } catch (error) {
      console.error("Error resetting password:", error);
      return false;
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // UserLink methods
  async createUserLink(userLink: InsertUserLink): Promise<UserLink> {
    const [newUserLink] = await db.insert(userLinks).values(userLink).returning();
    return newUserLink;
  }

  async getUserLinksByCoachId(coachId: number): Promise<UserLink[]> {
    return await db.select().from(userLinks).where(eq(userLinks.coachId, coachId));
  }

  async getUserLinksByClientId(clientId: number): Promise<UserLink[]> {
    return await db.select().from(userLinks).where(eq(userLinks.clientId, clientId));
  }

  async getUserLink(coachId: number, clientId: number): Promise<UserLink | undefined> {
    const result = await db
      .select()
      .from(userLinks)
      .where(and(
        eq(userLinks.coachId, coachId),
        eq(userLinks.clientId, clientId)
      ));
    return result[0];
  }

  // Session methods
  async createSession(session: InsertSession): Promise<Session> {
    const [newSession] = await db.insert(sessions).values(session).returning();
    return newSession;
  }

  async getSessionById(id: number): Promise<Session | undefined> {
    const result = await db.select().from(sessions).where(eq(sessions.id, id));
    return result[0];
  }

  async getSessionsByCoachId(coachId: number): Promise<Session[]> {
    return await db.select().from(sessions).where(eq(sessions.coachId, coachId));
  }

  async getSessionsByClientId(clientId: number): Promise<Session[]> {
    return await db.select().from(sessions).where(eq(sessions.clientId, clientId));
  }

  async updateSession(id: number, sessionData: Partial<Session>): Promise<Session | undefined> {
    const [updatedSession] = await db
      .update(sessions)
      .set(sessionData)
      .where(eq(sessions.id, id))
      .returning();
    return updatedSession;
  }

  // Reflection methods
  async createReflection(reflection: InsertReflection): Promise<Reflection> {
    const [newReflection] = await db.insert(reflections).values(reflection).returning();
    return newReflection;
  }

  async getReflectionById(id: number): Promise<Reflection | undefined> {
    const result = await db.select().from(reflections).where(eq(reflections.id, id));
    return result[0];
  }

  async getReflectionsByClientId(clientId: number): Promise<Reflection[]> {
    return await db.select().from(reflections).where(eq(reflections.clientId, clientId));
  }

  async getReflectionsBySessionId(sessionId: number): Promise<Reflection[]> {
    return await db.select().from(reflections).where(eq(reflections.sessionId, sessionId));
  }

  async updateReflection(id: number, reflectionData: Partial<Reflection>): Promise<Reflection | undefined> {
    const [updatedReflection] = await db
      .update(reflections)
      .set(reflectionData)
      .where(eq(reflections.id, id))
      .returning();
    return updatedReflection;
  }

  async getSharedReflectionsForCoach(coachId: number): Promise<Reflection[]> {
    // Get all clients of the coach
    const links = await this.getUserLinksByCoachId(coachId);
    const clientIds = links.map(link => link.clientId);
    
    if (clientIds.length === 0) {
      return [];
    }
    
    // Get all reflections that are shared and belong to coach's clients
    return await db
      .select()
      .from(reflections)
      .where(and(
        eq(reflections.sharedWithCoach, true),
        inArray(reflections.clientId, clientIds)
      ));
  }

  // Payment methods
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }

  async getPaymentById(id: number): Promise<Payment | undefined> {
    const result = await db.select().from(payments).where(eq(payments.id, id));
    return result[0];
  }

  async getPaymentsByCoachId(coachId: number): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.coachId, coachId));
  }

  async getPaymentsByClientId(clientId: number): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.clientId, clientId));
  }

  async updatePayment(id: number, paymentData: Partial<Payment>): Promise<Payment | undefined> {
    const [updatedPayment] = await db
      .update(payments)
      .set(paymentData)
      .where(eq(payments.id, id))
      .returning();
    return updatedPayment;
  }

  // Resource methods
  async createResource(resource: InsertResource): Promise<Resource> {
    const [newResource] = await db.insert(resources).values(resource).returning();
    return newResource;
  }

  async getResourceById(id: number): Promise<Resource | undefined> {
    const result = await db.select().from(resources).where(eq(resources.id, id));
    return result[0];
  }

  async getResourcesByCoachId(coachId: number): Promise<Resource[]> {
    return await db.select().from(resources).where(eq(resources.coachId, coachId));
  }

  async getVisibleResourcesForClient(clientId: number): Promise<Resource[]> {
    // Get all coaches linked to this client
    const links = await this.getUserLinksByClientId(clientId);
    const coachIds = links.map(link => link.coachId);
    
    if (coachIds.length === 0) {
      return [];
    }
    
    // Get resources that are visible to clients and belong to the client's coaches
    const visibleResources = await db
      .select()
      .from(resources)
      .where(and(
        eq(resources.visibleToClients, true),
        inArray(resources.coachId, coachIds)
      ));
    
    // Get resources that are specifically assigned to this client
    const resourceAccessEntries = await db
      .select()
      .from(resourceAccess)
      .where(eq(resourceAccess.clientId, clientId));
    
    const specificResourceIds = resourceAccessEntries.map(access => access.resourceId);
    
    if (specificResourceIds.length === 0) {
      return visibleResources;
    }
    
    // Get all resources that are specifically assigned to this client
    const specificResources = await db
      .select()
      .from(resources)
      .where(inArray(resources.id, specificResourceIds));
    
    // Combine both sets of resources, removing duplicates
    const resourceMap = new Map<number, Resource>();
    
    for (const resource of visibleResources) {
      resourceMap.set(resource.id, resource);
    }
    
    for (const resource of specificResources) {
      if (!resourceMap.has(resource.id)) {
        resourceMap.set(resource.id, resource);
      }
    }
    
    return Array.from(resourceMap.values());
  }

  async updateResource(id: number, resourceData: Partial<Resource>): Promise<Resource | undefined> {
    const [updatedResource] = await db
      .update(resources)
      .set(resourceData)
      .where(eq(resources.id, id))
      .returning();
    return updatedResource;
  }

  // Implement the resource filtering methods
  async getResourcesByCoachIdAndFilters(coachId: number, filters: ResourceFilters): Promise<Resource[]> {
    let query = db
      .select()
      .from(resources)
      .where(eq(resources.coachId, coachId));
    
    // Apply filters
    query = this.applyFiltersToQuery(query, filters);
    
    return await query;
  }
  
  async getVisibleResourcesForClientByFilters(clientId: number, filters: ResourceFilters): Promise<Resource[]> {
    // This is more complex - we may need to do this in memory after getting the basic resources
    const resources = await this.getVisibleResourcesForClient(clientId);
    return this.applyResourceFilters(resources, filters);
  }
  
  async getFeaturedResources(limit?: number): Promise<Resource[]> {
    let query = db
      .select()
      .from(resources)
      .where(eq(resources.featured, true))
      .orderBy(desc(resources.createdAt));
      
    if (limit) {
      query = query.limit(limit);
    }
    
    return await query;
  }
  
  async getResourcesByTag(tag: string): Promise<Resource[]> {
    // Need a more complex query to search inside an array
    return await db
      .select()
      .from(resources)
      .where(sql`${resources.tags} @> ARRAY[${tag}]::text[]`);
  }
  
  async getResourcesByCategory(category: string): Promise<Resource[]> {
    return await db
      .select()
      .from(resources)
      .where(eq(resources.category, category));
  }
  
  async getResourcesByDifficulty(difficulty: string): Promise<Resource[]> {
    return await db
      .select()
      .from(resources)
      .where(eq(resources.difficulty, difficulty));
  }
  
  private applyFiltersToQuery(query: any, filters: ResourceFilters): any {
    if (filters.type) {
      if (Array.isArray(filters.type)) {
        query = query.where(inArray(resources.type, filters.type));
      } else {
        query = query.where(eq(resources.type, filters.type));
      }
    }
    
    if (filters.category) {
      if (Array.isArray(filters.category)) {
        query = query.where(inArray(resources.category, filters.category));
      } else {
        query = query.where(eq(resources.category, filters.category));
      }
    }
    
    if (filters.tags && filters.tags.length > 0) {
      query = query.where(sql`${resources.tags} && ARRAY[${filters.tags}]::text[]`);
    }
    
    if (filters.difficulty) {
      query = query.where(eq(resources.difficulty, filters.difficulty));
    }
    
    if (filters.featured !== undefined) {
      query = query.where(eq(resources.featured, filters.featured));
    }
    
    if (filters.languageCode) {
      query = query.where(eq(resources.languageCode, filters.languageCode));
    }
    
    if (filters.minDuration !== undefined) {
      query = query.where(sql`${resources.durationMinutes} >= ${filters.minDuration}`);
    }
    
    if (filters.maxDuration !== undefined) {
      query = query.where(sql`${resources.durationMinutes} <= ${filters.maxDuration}`);
    }
    
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.where(
        or(
          like(resources.title, searchTerm),
          like(resources.description, searchTerm)
        )
      );
    }
    
    return query;
  }
  
  // This method can be used in cases where we already have the resources in memory
  // and need to apply filters to them
  private applyResourceFilters(resources: Resource[], filters: ResourceFilters): Resource[] {
    let filteredResources = [...resources];
    
    // Filter by type
    if (filters.type) {
      const types = Array.isArray(filters.type) ? filters.type : [filters.type];
      filteredResources = filteredResources.filter(r => types.includes(r.type));
    }
    
    // Filter by category
    if (filters.category) {
      const categories = Array.isArray(filters.category) ? filters.category : [filters.category];
      filteredResources = filteredResources.filter(r => categories.includes(r.category));
    }
    
    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      filteredResources = filteredResources.filter(r => 
        r.tags && filters.tags.some(tag => r.tags.includes(tag))
      );
    }
    
    // Filter by difficulty
    if (filters.difficulty) {
      filteredResources = filteredResources.filter(r => r.difficulty === filters.difficulty);
    }
    
    // Filter by featured
    if (filters.featured !== undefined) {
      filteredResources = filteredResources.filter(r => r.featured === filters.featured);
    }
    
    // Filter by language code
    if (filters.languageCode) {
      filteredResources = filteredResources.filter(r => r.languageCode === filters.languageCode);
    }
    
    // Filter by duration
    if (filters.minDuration !== undefined) {
      filteredResources = filteredResources.filter(r => 
        r.durationMinutes !== undefined && r.durationMinutes >= filters.minDuration
      );
    }
    
    if (filters.maxDuration !== undefined) {
      filteredResources = filteredResources.filter(r => 
        r.durationMinutes !== undefined && r.durationMinutes <= filters.maxDuration
      );
    }
    
    // Search by title and description
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredResources = filteredResources.filter(r => 
        (r.title && r.title.toLowerCase().includes(searchLower)) || 
        (r.description && r.description.toLowerCase().includes(searchLower))
      );
    }
    
    return filteredResources;
  }

  // ResourceAccess methods
  async createResourceAccess(resourceAccessData: InsertResourceAccess): Promise<ResourceAccess> {
    const [newResourceAccess] = await db
      .insert(resourceAccess)
      .values(resourceAccessData)
      .returning();
    return newResourceAccess;
  }

  async getResourceAccessByResourceId(resourceId: number): Promise<ResourceAccess[]> {
    return await db
      .select()
      .from(resourceAccess)
      .where(eq(resourceAccess.resourceId, resourceId));
  }
}

// Use the DatabaseStorage implementation
export const storage = new DatabaseStorage();
