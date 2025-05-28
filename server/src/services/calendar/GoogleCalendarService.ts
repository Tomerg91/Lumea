import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { 
  BaseCalendarService, 
  CalendarProvider, 
  OAuthTokens, 
  ExternalCalendarEvent, 
  CalendarMetadata 
} from './CalendarService.js';

export class GoogleCalendarService extends BaseCalendarService {
  provider: CalendarProvider = 'google';
  private oauth2Client: OAuth2Client;
  private calendar: calendar_v3.Calendar;

  constructor() {
    super();
    
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('Google Calendar credentials not configured');
    }

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret
    );
    
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  getAuthUrl(userId: string, redirectUri: string): string {
    this.oauth2Client.setCredentials({});
    
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: userId, // Pass userId in state for callback handling
      redirect_uri: redirectUri
    });
  }

  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens> {
    try {
      this.oauth2Client.setCredentials({});
      
      const { tokens } = await this.oauth2Client.getToken({
        code,
        redirect_uri: redirectUri
      });

      if (!tokens.access_token) {
        throw new Error('No access token received from Google');
      }

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        scope: tokens.scope
      };
    } catch (error) {
      throw new Error(`Failed to exchange code for tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();

      if (!credentials.access_token) {
        throw new Error('No access token received from refresh');
      }

      return {
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token || refreshToken, // Keep original if new one not provided
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
        scope: credentials.scope
      };
    } catch (error) {
      throw new Error(`Failed to refresh tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCalendars(tokens: OAuthTokens): Promise<CalendarMetadata[]> {
    try {
      this.oauth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken
      });

      const response = await this.calendar.calendarList.list();
      const calendars = response.data.items || [];

      return calendars.map(cal => ({
        id: cal.id!,
        name: cal.summary || 'Unnamed Calendar',
        description: cal.description,
        timezone: cal.timeZone || 'UTC',
        isPrimary: cal.primary || false,
        accessRole: cal.accessRole as 'owner' | 'reader' | 'writer' | undefined
      }));
    } catch (error) {
      throw new Error(`Failed to get calendars: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getEvents(
    tokens: OAuthTokens, 
    calendarId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<ExternalCalendarEvent[]> {
    try {
      this.oauth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken
      });

      const response = await this.calendar.events.list({
        calendarId,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 2500 // Google's max
      });

      const events = response.data.items || [];

      return events.map(event => this.mapGoogleEventToExternal(event));
    } catch (error) {
      throw new Error(`Failed to get events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createEvent(
    tokens: OAuthTokens, 
    calendarId: string, 
    event: Partial<ExternalCalendarEvent>
  ): Promise<ExternalCalendarEvent> {
    try {
      this.oauth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken
      });

      const googleEvent = this.mapExternalEventToGoogle(event);
      
      const response = await this.calendar.events.insert({
        calendarId,
        requestBody: googleEvent
      });

      if (!response.data) {
        throw new Error('No event data returned from Google');
      }

      return this.mapGoogleEventToExternal(response.data);
    } catch (error) {
      throw new Error(`Failed to create event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateEvent(
    tokens: OAuthTokens, 
    calendarId: string, 
    eventId: string, 
    event: Partial<ExternalCalendarEvent>
  ): Promise<ExternalCalendarEvent> {
    try {
      this.oauth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken
      });

      const googleEvent = this.mapExternalEventToGoogle(event);
      
      const response = await this.calendar.events.update({
        calendarId,
        eventId,
        requestBody: googleEvent
      });

      if (!response.data) {
        throw new Error('No event data returned from Google');
      }

      return this.mapGoogleEventToExternal(response.data);
    } catch (error) {
      throw new Error(`Failed to update event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteEvent(tokens: OAuthTokens, calendarId: string, eventId: string): Promise<void> {
    try {
      this.oauth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken
      });

      await this.calendar.events.delete({
        calendarId,
        eventId
      });
    } catch (error) {
      throw new Error(`Failed to delete event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async validateTokens(tokens: OAuthTokens): Promise<boolean> {
    try {
      this.oauth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken
      });

      // Try to make a simple API call to validate the token
      await this.calendar.calendarList.list({ maxResults: 1 });
      return true;
    } catch (error) {
      return false;
    }
  }

  async revokeTokens(tokens: OAuthTokens): Promise<void> {
    try {
      this.oauth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken
      });

      await this.oauth2Client.revokeCredentials();
    } catch (error) {
      throw new Error(`Failed to revoke tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper methods for mapping between Google Calendar and our format
  private mapGoogleEventToExternal(googleEvent: calendar_v3.Schema$Event): ExternalCalendarEvent {
    const start = googleEvent.start?.dateTime || googleEvent.start?.date;
    const end = googleEvent.end?.dateTime || googleEvent.end?.date;
    
    if (!start || !end || !googleEvent.id) {
      throw new Error('Invalid Google Calendar event data');
    }

    return {
      id: googleEvent.id,
      title: googleEvent.summary || 'Untitled Event',
      description: googleEvent.description,
      startTime: new Date(start),
      endTime: new Date(end),
      timezone: googleEvent.start?.timeZone || 'UTC',
      isAllDay: !!googleEvent.start?.date, // All-day events use 'date' instead of 'dateTime'
      location: googleEvent.location,
      attendees: googleEvent.attendees?.map(attendee => ({
        email: attendee.email!,
        name: attendee.displayName,
        status: attendee.responseStatus as 'accepted' | 'declined' | 'tentative' | 'needsAction'
      })),
      recurrenceRule: googleEvent.recurrence?.[0], // Google uses RRULE format
      status: (googleEvent.status as 'confirmed' | 'tentative' | 'cancelled') || 'confirmed',
      visibility: (googleEvent.visibility as 'default' | 'public' | 'private') || 'default',
      created: googleEvent.created ? new Date(googleEvent.created) : undefined,
      updated: googleEvent.updated ? new Date(googleEvent.updated) : undefined
    };
  }

  private mapExternalEventToGoogle(event: Partial<ExternalCalendarEvent>): calendar_v3.Schema$Event {
    const googleEvent: calendar_v3.Schema$Event = {
      summary: event.title,
      description: event.description,
      location: event.location,
      status: event.status,
      visibility: event.visibility
    };

    // Handle start and end times
    if (event.startTime && event.endTime) {
      if (event.isAllDay) {
        // All-day events use date format (YYYY-MM-DD)
        googleEvent.start = {
          date: event.startTime.toISOString().split('T')[0],
          timeZone: event.timezone
        };
        googleEvent.end = {
          date: event.endTime.toISOString().split('T')[0],
          timeZone: event.timezone
        };
      } else {
        // Regular events use dateTime format
        googleEvent.start = {
          dateTime: event.startTime.toISOString(),
          timeZone: event.timezone
        };
        googleEvent.end = {
          dateTime: event.endTime.toISOString(),
          timeZone: event.timezone
        };
      }
    }

    // Handle attendees
    if (event.attendees && event.attendees.length > 0) {
      googleEvent.attendees = event.attendees.map(attendee => ({
        email: attendee.email,
        displayName: attendee.name,
        responseStatus: attendee.status
      }));
    }

    // Handle recurrence
    if (event.recurrenceRule) {
      googleEvent.recurrence = [event.recurrenceRule];
    }

    return googleEvent;
  }
} 