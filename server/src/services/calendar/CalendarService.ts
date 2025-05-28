import { CalendarIntegration, CalendarEvent } from '@prisma/client';

// Calendar provider types
export type CalendarProvider = 'google' | 'microsoft' | 'apple';

// OAuth token interface
export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
}

// Calendar event interface for external APIs
export interface ExternalCalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  isAllDay: boolean;
  location?: string;
  attendees?: Array<{
    email: string;
    name?: string;
    status?: 'accepted' | 'declined' | 'tentative' | 'needsAction';
  }>;
  recurrenceRule?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  visibility?: 'default' | 'public' | 'private';
  created?: Date;
  updated?: Date;
}

// Calendar metadata interface
export interface CalendarMetadata {
  id: string;
  name: string;
  description?: string;
  timezone: string;
  isPrimary?: boolean;
  accessRole?: 'owner' | 'reader' | 'writer';
}

// Sync result interface
export interface SyncResult {
  success: boolean;
  eventsProcessed: number;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDeleted: number;
  errors: Array<{
    eventId?: string;
    message: string;
    code?: string;
  }>;
}

// Base calendar service interface
export interface ICalendarService {
  provider: CalendarProvider;
  
  // OAuth methods
  getAuthUrl(userId: string, redirectUri: string): string;
  exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens>;
  refreshTokens(refreshToken: string): Promise<OAuthTokens>;
  
  // Calendar methods
  getCalendars(tokens: OAuthTokens): Promise<CalendarMetadata[]>;
  getEvents(tokens: OAuthTokens, calendarId: string, startDate: Date, endDate: Date): Promise<ExternalCalendarEvent[]>;
  createEvent(tokens: OAuthTokens, calendarId: string, event: Partial<ExternalCalendarEvent>): Promise<ExternalCalendarEvent>;
  updateEvent(tokens: OAuthTokens, calendarId: string, eventId: string, event: Partial<ExternalCalendarEvent>): Promise<ExternalCalendarEvent>;
  deleteEvent(tokens: OAuthTokens, calendarId: string, eventId: string): Promise<void>;
  
  // Sync methods
  syncEvents(integration: CalendarIntegration, startDate: Date, endDate: Date): Promise<SyncResult>;
  
  // Utility methods
  validateTokens(tokens: OAuthTokens): Promise<boolean>;
  revokeTokens(tokens: OAuthTokens): Promise<void>;
}

// Abstract base class for calendar services
export abstract class BaseCalendarService implements ICalendarService {
  abstract provider: CalendarProvider;
  
  abstract getAuthUrl(userId: string, redirectUri: string): string;
  abstract exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens>;
  abstract refreshTokens(refreshToken: string): Promise<OAuthTokens>;
  abstract getCalendars(tokens: OAuthTokens): Promise<CalendarMetadata[]>;
  abstract getEvents(tokens: OAuthTokens, calendarId: string, startDate: Date, endDate: Date): Promise<ExternalCalendarEvent[]>;
  abstract createEvent(tokens: OAuthTokens, calendarId: string, event: Partial<ExternalCalendarEvent>): Promise<ExternalCalendarEvent>;
  abstract updateEvent(tokens: OAuthTokens, calendarId: string, eventId: string, event: Partial<ExternalCalendarEvent>): Promise<ExternalCalendarEvent>;
  abstract deleteEvent(tokens: OAuthTokens, calendarId: string, eventId: string): Promise<void>;
  abstract validateTokens(tokens: OAuthTokens): Promise<boolean>;
  abstract revokeTokens(tokens: OAuthTokens): Promise<void>;
  
  // Default sync implementation
  async syncEvents(integration: CalendarIntegration, startDate: Date, endDate: Date): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      eventsProcessed: 0,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      errors: []
    };
    
    try {
      const tokens: OAuthTokens = {
        accessToken: integration.accessToken,
        refreshToken: integration.refreshToken || undefined,
        expiresAt: integration.tokenExpiry || undefined
      };
      
      // Validate tokens first
      const isValid = await this.validateTokens(tokens);
      if (!isValid) {
        result.errors.push({ message: 'Invalid or expired tokens' });
        return result;
      }
      
      // Get events from external calendar
      const externalEvents = await this.getEvents(
        tokens,
        integration.calendarId!,
        startDate,
        endDate
      );
      
      result.eventsProcessed = externalEvents.length;
      result.success = true;
      
      // TODO: Implement actual sync logic with database
      // This will be implemented in the concrete service classes
      
    } catch (error) {
      result.errors.push({
        message: error instanceof Error ? error.message : 'Unknown sync error'
      });
    }
    
    return result;
  }
  
  // Helper method to handle token refresh
  protected async ensureValidTokens(integration: CalendarIntegration): Promise<OAuthTokens> {
    const tokens: OAuthTokens = {
      accessToken: integration.accessToken,
      refreshToken: integration.refreshToken || undefined,
      expiresAt: integration.tokenExpiry || undefined
    };
    
    // Check if token is expired or will expire soon (within 5 minutes)
    const now = new Date();
    const expiryBuffer = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    if (tokens.expiresAt && tokens.expiresAt.getTime() - now.getTime() < expiryBuffer) {
      if (tokens.refreshToken) {
        const refreshedTokens = await this.refreshTokens(tokens.refreshToken);
        
        // TODO: Update the integration in the database with new tokens
        // This will be handled by the service layer
        
        return refreshedTokens;
      } else {
        throw new Error('Token expired and no refresh token available');
      }
    }
    
    return tokens;
  }
}

// Calendar service factory
export class CalendarServiceFactory {
  private static services: Map<CalendarProvider, ICalendarService> = new Map();
  
  static registerService(provider: CalendarProvider, service: ICalendarService): void {
    this.services.set(provider, service);
  }
  
  static getService(provider: CalendarProvider): ICalendarService {
    const service = this.services.get(provider);
    if (!service) {
      throw new Error(`Calendar service not found for provider: ${provider}`);
    }
    return service;
  }
  
  static getSupportedProviders(): CalendarProvider[] {
    return Array.from(this.services.keys());
  }
} 