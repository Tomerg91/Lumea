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

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  
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
  getVisibleResourcesForClient(clientId: number): Promise<Resource[]>;
  updateResource(id: number, resource: Partial<Resource>): Promise<Resource | undefined>;
  
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
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
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

export const storage = new MemStorage();
