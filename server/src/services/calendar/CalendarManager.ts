import { PrismaClient, CalendarIntegration, CalendarEvent, User } from '@prisma/client';
import { 
  CalendarServiceFactory, 
  CalendarProvider, 
  OAuthTokens, 
  ExternalCalendarEvent,
  CalendarMetadata,
  SyncResult
} from './CalendarService.js';
import { GoogleCalendarService } from './GoogleCalendarService.js';
import { MicrosoftCalendarService } from './MicrosoftCalendarService.js';
import { AppleCalendarService } from './AppleCalendarService.js';
import crypto from 'crypto';

// Initialize calendar services
CalendarServiceFactory.registerService('google', new GoogleCalendarService());
CalendarServiceFactory.registerService('microsoft', new MicrosoftCalendarService());
CalendarServiceFactory.registerService('apple', new AppleCalendarService());

export interface CalendarConnectionRequest {
  userId: string;
  provider: CalendarProvider;
  code: string;
  redirectUri: string;
  calendarId?: string;
  calendarName?: string;
}

export interface CalendarSyncOptions {
  integrationId?: string;
  userId?: string;
  provider?: CalendarProvider;
  startDate?: Date;
  endDate?: Date;
  direction?: 'import' | 'export' | 'bidirectional';
}

export class CalendarManager {
  private prisma: PrismaClient;
  private encryptionKey: string;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
  }

  // OAuth and Connection Management
  async getAuthUrl(userId: string, provider: CalendarProvider, redirectUri: string): Promise<string> {
    const service = CalendarServiceFactory.getService(provider);
    return service.getAuthUrl(userId, redirectUri);
  }

  async connectCalendar(request: CalendarConnectionRequest): Promise<CalendarIntegration> {
    const service = CalendarServiceFactory.getService(request.provider);
    
    try {
      // Exchange code for tokens
      const tokens = await service.exchangeCodeForTokens(request.code, request.redirectUri);
      
      // Get user's calendars to find the primary one if not specified
      let calendarId = request.calendarId;
      let calendarName = request.calendarName;
      
      if (!calendarId) {
        const calendars = await service.getCalendars(tokens);
        const primaryCalendar = calendars.find(cal => cal.isPrimary) || calendars[0];
        
        if (!primaryCalendar) {
          throw new Error('No calendars found for this account');
        }
        
        calendarId = primaryCalendar.id;
        calendarName = primaryCalendar.name;
      }

      // Encrypt tokens before storing
      const encryptedAccessToken = this.encrypt(tokens.accessToken);
      const encryptedRefreshToken = tokens.refreshToken ? this.encrypt(tokens.refreshToken) : null;

      // Check if integration already exists
      const existingIntegration = await this.prisma.calendarIntegration.findUnique({
        where: {
          userId_provider: {
            userId: request.userId,
            provider: request.provider
          }
        }
      });

      if (existingIntegration) {
        // Update existing integration
        return await this.prisma.calendarIntegration.update({
          where: { id: existingIntegration.id },
          data: {
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            tokenExpiry: tokens.expiresAt,
            calendarId,
            calendarName,
            isActive: true,
            syncEnabled: true,
            lastSyncAt: null,
            syncErrors: null,
            updatedAt: new Date()
          }
        });
      } else {
        // Create new integration
        return await this.prisma.calendarIntegration.create({
          data: {
            userId: request.userId,
            provider: request.provider,
            providerAccountId: `${request.provider}-${request.userId}`, // Simplified
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            tokenExpiry: tokens.expiresAt,
            calendarId,
            calendarName,
            isActive: true,
            syncEnabled: true
          }
        });
      }
    } catch (error) {
      throw new Error(`Failed to connect ${request.provider} calendar: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async disconnectCalendar(userId: string, provider: CalendarProvider): Promise<void> {
    const integration = await this.prisma.calendarIntegration.findUnique({
      where: {
        userId_provider: { userId, provider }
      }
    });

    if (!integration) {
      throw new Error('Calendar integration not found');
    }

    try {
      // Revoke tokens if possible
      const service = CalendarServiceFactory.getService(provider);
      const tokens = this.decryptTokens(integration);
      await service.revokeTokens(tokens);
    } catch (error) {
      // Continue even if revocation fails
      console.warn(`Failed to revoke tokens for ${provider}:`, error);
    }

    // Delete the integration and all associated events
    await this.prisma.calendarIntegration.delete({
      where: { id: integration.id }
    });
  }

  // Calendar and Event Management
  async getUserCalendars(userId: string, provider?: CalendarProvider): Promise<CalendarMetadata[]> {
    const integrations = await this.prisma.calendarIntegration.findMany({
      where: {
        userId,
        provider: provider || undefined,
        isActive: true
      }
    });

    const allCalendars: CalendarMetadata[] = [];

    for (const integration of integrations) {
      try {
        const service = CalendarServiceFactory.getService(integration.provider as CalendarProvider);
        const tokens = await this.ensureValidTokens(integration);
        const calendars = await service.getCalendars(tokens);
        
        // Add provider info to each calendar
        const calendarsWithProvider = calendars.map(cal => ({
          ...cal,
          provider: integration.provider
        }));
        
        allCalendars.push(...calendarsWithProvider);
      } catch (error) {
        console.error(`Failed to get calendars for ${integration.provider}:`, error);
      }
    }

    return allCalendars;
  }

  async syncCalendars(options: CalendarSyncOptions = {}): Promise<SyncResult[]> {
    const results: SyncResult[] = [];
    
    // Get integrations to sync
    const integrations = await this.getIntegrationsToSync(options);
    
    for (const integration of integrations) {
      try {
        const result = await this.syncIntegration(integration, options);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          eventsProcessed: 0,
          eventsCreated: 0,
          eventsUpdated: 0,
          eventsDeleted: 0,
          errors: [{
            message: `Failed to sync ${integration.provider}: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        });
      }
    }

    return results;
  }

  async createCoachingSessionEvent(
    sessionId: string,
    integrationId: string,
    eventData: Partial<ExternalCalendarEvent>
  ): Promise<CalendarEvent> {
    const integration = await this.prisma.calendarIntegration.findUnique({
      where: { id: integrationId }
    });

    if (!integration) {
      throw new Error('Calendar integration not found');
    }

    const service = CalendarServiceFactory.getService(integration.provider as CalendarProvider);
    const tokens = await this.ensureValidTokens(integration);

    // Create event in external calendar
    const externalEvent = await service.createEvent(
      tokens,
      integration.calendarId!,
      eventData
    );

    // Store event in our database
    return await this.prisma.calendarEvent.create({
      data: {
        calendarIntegrationId: integration.id,
        providerEventId: externalEvent.id,
        title: externalEvent.title,
        description: externalEvent.description,
        startTime: externalEvent.startTime,
        endTime: externalEvent.endTime,
        timezone: externalEvent.timezone,
        isAllDay: externalEvent.isAllDay,
        location: externalEvent.location,
        attendees: externalEvent.attendees as any,
        recurrenceRule: externalEvent.recurrenceRule,
        status: externalEvent.status,
        visibility: externalEvent.visibility,
        sessionId,
        isCoachingSession: true,
        lastSyncAt: new Date(),
        syncStatus: 'synced'
      }
    });
  }

  // Private helper methods
  private async getIntegrationsToSync(options: CalendarSyncOptions): Promise<CalendarIntegration[]> {
    const where: any = {
      isActive: true,
      syncEnabled: true
    };

    if (options.integrationId) {
      where.id = options.integrationId;
    }
    if (options.userId) {
      where.userId = options.userId;
    }
    if (options.provider) {
      where.provider = options.provider;
    }

    return await this.prisma.calendarIntegration.findMany({ where });
  }

  private async syncIntegration(
    integration: CalendarIntegration,
    options: CalendarSyncOptions
  ): Promise<SyncResult> {
    const service = CalendarServiceFactory.getService(integration.provider as CalendarProvider);
    
    // Default sync range: 30 days back, 90 days forward
    const startDate = options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = options.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    // Log sync start
    const syncLog = await this.prisma.calendarSyncLog.create({
      data: {
        calendarIntegrationId: integration.id,
        syncType: 'incremental',
        direction: options.direction || 'bidirectional',
        status: 'started',
        startedAt: new Date()
      }
    });

    try {
      const tokens = await this.ensureValidTokens(integration);
      
      // Get events from external calendar
      const externalEvents = await service.getEvents(
        tokens,
        integration.calendarId!,
        startDate,
        endDate
      );

      // Sync events with our database
      const result = await this.syncEvents(integration, externalEvents);

      // Update sync log
      await this.prisma.calendarSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'completed',
          eventsProcessed: result.eventsProcessed,
          eventsCreated: result.eventsCreated,
          eventsUpdated: result.eventsUpdated,
          eventsDeleted: result.eventsDeleted,
          errors: result.errors as any,
          completedAt: new Date(),
          duration: Date.now() - syncLog.startedAt.getTime()
        }
      });

      // Update integration last sync time
      await this.prisma.calendarIntegration.update({
        where: { id: integration.id },
        data: { lastSyncAt: new Date() }
      });

      return result;
    } catch (error) {
      // Update sync log with error
      await this.prisma.calendarSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'failed',
          errors: [{
            message: error instanceof Error ? error.message : 'Unknown sync error'
          }] as any,
          completedAt: new Date(),
          duration: Date.now() - syncLog.startedAt.getTime()
        }
      });

      throw error;
    }
  }

  private async syncEvents(
    integration: CalendarIntegration,
    externalEvents: ExternalCalendarEvent[]
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      eventsProcessed: externalEvents.length,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      errors: []
    };

    for (const externalEvent of externalEvents) {
      try {
        const existingEvent = await this.prisma.calendarEvent.findUnique({
          where: {
            calendarIntegrationId_providerEventId: {
              calendarIntegrationId: integration.id,
              providerEventId: externalEvent.id
            }
          }
        });

        if (existingEvent) {
          // Update existing event
          await this.prisma.calendarEvent.update({
            where: { id: existingEvent.id },
            data: {
              title: externalEvent.title,
              description: externalEvent.description,
              startTime: externalEvent.startTime,
              endTime: externalEvent.endTime,
              timezone: externalEvent.timezone,
              isAllDay: externalEvent.isAllDay,
              location: externalEvent.location,
              attendees: externalEvent.attendees as any,
              recurrenceRule: externalEvent.recurrenceRule,
              status: externalEvent.status,
              visibility: externalEvent.visibility,
              lastSyncAt: new Date(),
              syncStatus: 'synced'
            }
          });
          result.eventsUpdated++;
        } else {
          // Create new event
          await this.prisma.calendarEvent.create({
            data: {
              calendarIntegrationId: integration.id,
              providerEventId: externalEvent.id,
              title: externalEvent.title,
              description: externalEvent.description,
              startTime: externalEvent.startTime,
              endTime: externalEvent.endTime,
              timezone: externalEvent.timezone,
              isAllDay: externalEvent.isAllDay,
              location: externalEvent.location,
              attendees: externalEvent.attendees as any,
              recurrenceRule: externalEvent.recurrenceRule,
              status: externalEvent.status,
              visibility: externalEvent.visibility,
              isCoachingSession: false,
              isBlocked: true, // External events block availability by default
              lastSyncAt: new Date(),
              syncStatus: 'synced'
            }
          });
          result.eventsCreated++;
        }
      } catch (error) {
        result.errors.push({
          eventId: externalEvent.id,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  private async ensureValidTokens(integration: CalendarIntegration): Promise<OAuthTokens> {
    const service = CalendarServiceFactory.getService(integration.provider as CalendarProvider);
    const tokens = this.decryptTokens(integration);

    // Check if tokens need refresh
    const now = new Date();
    const expiryBuffer = 5 * 60 * 1000; // 5 minutes

    if (tokens.expiresAt && tokens.expiresAt.getTime() - now.getTime() < expiryBuffer) {
      if (tokens.refreshToken) {
        try {
          const refreshedTokens = await service.refreshTokens(tokens.refreshToken);
          
          // Update integration with new tokens
          await this.prisma.calendarIntegration.update({
            where: { id: integration.id },
            data: {
              accessToken: this.encrypt(refreshedTokens.accessToken),
              refreshToken: refreshedTokens.refreshToken ? this.encrypt(refreshedTokens.refreshToken) : integration.refreshToken,
              tokenExpiry: refreshedTokens.expiresAt,
              updatedAt: new Date()
            }
          });

          return refreshedTokens;
        } catch (error) {
          throw new Error(`Failed to refresh tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        throw new Error('Token expired and no refresh token available');
      }
    }

    return tokens;
  }

  private decryptTokens(integration: CalendarIntegration): OAuthTokens {
    return {
      accessToken: this.decrypt(integration.accessToken),
      refreshToken: integration.refreshToken ? this.decrypt(integration.refreshToken) : undefined,
      expiresAt: integration.tokenExpiry || undefined
    };
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey.slice(0, 32)), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    const [ivHex, encryptedHex] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey.slice(0, 32)), iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
} 