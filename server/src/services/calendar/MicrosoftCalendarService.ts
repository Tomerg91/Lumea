import { Client } from '@microsoft/microsoft-graph-client';
import { 
  BaseCalendarService, 
  CalendarProvider, 
  OAuthTokens, 
  ExternalCalendarEvent, 
  CalendarMetadata 
} from './CalendarService';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
}

export class MicrosoftCalendarService extends BaseCalendarService {
  provider: CalendarProvider = 'microsoft';
  private clientId: string;
  private clientSecret: string;
  private tenantId: string;

  constructor() {
    super();
    
    this.clientId = process.env.MICROSOFT_CLIENT_ID || '';
    this.clientSecret = process.env.MICROSOFT_CLIENT_SECRET || '';
    this.tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
    
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Microsoft Calendar credentials not configured');
    }
  }

  getAuthUrl(userId: string, redirectUri: string): string {
    const scopes = [
      'https://graph.microsoft.com/Calendars.ReadWrite',
      'https://graph.microsoft.com/User.Read'
    ];

    const authUrl = new URL(`https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize`);
    authUrl.searchParams.set('client_id', this.clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('response_mode', 'query');
    authUrl.searchParams.set('state', userId);
    authUrl.searchParams.set('prompt', 'consent');

    return authUrl.toString();
  }

  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens> {
    try {
      const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
      
      const body = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Token exchange failed: ${errorData}`);
      }

      const tokenData = await response.json() as TokenResponse;

      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(Date.now() + (tokenData.expires_in * 1000)),
        scope: tokenData.scope
      };
    } catch (error) {
      throw new Error(`Failed to exchange code for tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    try {
      const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
      
      const body = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Token refresh failed: ${errorData}`);
      }

      const tokenData = await response.json() as TokenResponse;

      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || refreshToken,
        expiresAt: new Date(Date.now() + (tokenData.expires_in * 1000)),
        scope: tokenData.scope
      };
    } catch (error) {
      throw new Error(`Failed to refresh tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCalendars(tokens: OAuthTokens): Promise<CalendarMetadata[]> {
    try {
      const client = this.createGraphClient(tokens);
      
      const calendars = await client.api('/me/calendars').get();

      return calendars.value.map((cal: any) => ({
        id: cal.id,
        name: cal.name,
        description: cal.description,
        timezone: cal.timeZone || 'UTC',
        isPrimary: cal.isDefaultCalendar || false,
        accessRole: cal.canEdit ? 'owner' : 'reader'
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
      const client = this.createGraphClient(tokens);
      
      const events = await client
        .api(`/me/calendars/${calendarId}/events`)
        .filter(`start/dateTime ge '${startDate.toISOString()}' and end/dateTime le '${endDate.toISOString()}'`)
        .select('id,subject,body,start,end,location,attendees,recurrence,showAs,sensitivity,createdDateTime,lastModifiedDateTime')
        .top(1000)
        .get();

      return events.value.map((event: any) => this.mapMicrosoftEventToExternal(event));
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
      const client = this.createGraphClient(tokens);
      
      const microsoftEvent = this.mapExternalEventToMicrosoft(event);
      
      const createdEvent = await client
        .api(`/me/calendars/${calendarId}/events`)
        .post(microsoftEvent);

      return this.mapMicrosoftEventToExternal(createdEvent);
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
      const client = this.createGraphClient(tokens);
      
      const microsoftEvent = this.mapExternalEventToMicrosoft(event);
      
      const updatedEvent = await client
        .api(`/me/calendars/${calendarId}/events/${eventId}`)
        .patch(microsoftEvent);

      return this.mapMicrosoftEventToExternal(updatedEvent);
    } catch (error) {
      throw new Error(`Failed to update event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteEvent(tokens: OAuthTokens, calendarId: string, eventId: string): Promise<void> {
    try {
      const client = this.createGraphClient(tokens);
      
      await client.api(`/me/calendars/${calendarId}/events/${eventId}`).delete();
    } catch (error) {
      throw new Error(`Failed to delete event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async validateTokens(tokens: OAuthTokens): Promise<boolean> {
    try {
      const client = this.createGraphClient(tokens);
      
      // Try to make a simple API call to validate the token
      await client.api('/me').select('id').get();
      return true;
    } catch (error) {
      return false;
    }
  }

  async revokeTokens(tokens: OAuthTokens): Promise<void> {
    try {
      // Microsoft Graph doesn't have a direct revoke endpoint
      // The token will expire naturally or can be revoked through Azure portal
      // For now, we'll just mark this as successful
    } catch (error) {
      throw new Error(`Failed to revoke tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private createGraphClient(tokens: OAuthTokens): Client {
    return Client.init({
      authProvider: (done: any) => {
        done(null, tokens.accessToken);
      }
    });
  }

  private mapMicrosoftEventToExternal(microsoftEvent: any): ExternalCalendarEvent {
    return {
      id: microsoftEvent.id,
      title: microsoftEvent.subject || 'Untitled Event',
      description: microsoftEvent.body?.content,
      startTime: new Date(microsoftEvent.start.dateTime),
      endTime: new Date(microsoftEvent.end.dateTime),
      timezone: microsoftEvent.start.timeZone || 'UTC',
      isAllDay: microsoftEvent.isAllDay || false,
      location: microsoftEvent.location?.displayName,
      attendees: microsoftEvent.attendees?.map((attendee: any) => ({
        email: attendee.emailAddress.address,
        name: attendee.emailAddress.name,
        status: this.mapMicrosoftResponseStatus(attendee.status?.response)
      })),
      recurrenceRule: microsoftEvent.recurrence ? this.mapMicrosoftRecurrence(microsoftEvent.recurrence) : undefined,
      status: this.mapMicrosoftShowAs(microsoftEvent.showAs),
      visibility: this.mapMicrosoftSensitivity(microsoftEvent.sensitivity),
      created: microsoftEvent.createdDateTime ? new Date(microsoftEvent.createdDateTime) : undefined,
      updated: microsoftEvent.lastModifiedDateTime ? new Date(microsoftEvent.lastModifiedDateTime) : undefined
    };
  }

  private mapExternalEventToMicrosoft(event: Partial<ExternalCalendarEvent>): any {
    const microsoftEvent: any = {
      subject: event.title,
      body: {
        contentType: 'text',
        content: event.description || ''
      },
      isAllDay: event.isAllDay || false
    };

    if (event.startTime && event.endTime) {
      microsoftEvent.start = {
        dateTime: event.startTime.toISOString(),
        timeZone: event.timezone || 'UTC'
      };
      microsoftEvent.end = {
        dateTime: event.endTime.toISOString(),
        timeZone: event.timezone || 'UTC'
      };
    }

    if (event.location) {
      microsoftEvent.location = {
        displayName: event.location
      };
    }

    if (event.attendees && event.attendees.length > 0) {
      microsoftEvent.attendees = event.attendees.map(attendee => ({
        emailAddress: {
          address: attendee.email,
          name: attendee.name
        },
        type: 'required'
      }));
    }

    return microsoftEvent;
  }

  private mapMicrosoftResponseStatus(status: string): 'accepted' | 'declined' | 'tentative' | 'needsAction' {
    switch (status) {
      case 'accepted': return 'accepted';
      case 'declined': return 'declined';
      case 'tentativelyAccepted': return 'tentative';
      default: return 'needsAction';
    }
  }

  private mapMicrosoftShowAs(showAs: string): 'confirmed' | 'tentative' | 'cancelled' {
    switch (showAs) {
      case 'busy': return 'confirmed';
      case 'tentative': return 'tentative';
      case 'free': return 'cancelled';
      default: return 'confirmed';
    }
  }

  private mapMicrosoftSensitivity(sensitivity: string): 'default' | 'public' | 'private' {
    switch (sensitivity) {
      case 'normal': return 'default';
      case 'personal': return 'private';
      case 'private': return 'private';
      case 'confidential': return 'private';
      default: return 'default';
    }
  }

  private mapMicrosoftRecurrence(recurrence: any): string {
    // Convert Microsoft Graph recurrence to RRULE format
    // This is a simplified implementation
    const pattern = recurrence.pattern;
    let rrule = 'RRULE:';
    
    switch (pattern.type) {
      case 'daily':
        rrule += `FREQ=DAILY;INTERVAL=${pattern.interval || 1}`;
        break;
      case 'weekly':
        rrule += `FREQ=WEEKLY;INTERVAL=${pattern.interval || 1}`;
        if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
          const days = pattern.daysOfWeek.map((day: string) => day.substring(0, 2).toUpperCase()).join(',');
          rrule += `;BYDAY=${days}`;
        }
        break;
      case 'absoluteMonthly':
        rrule += `FREQ=MONTHLY;INTERVAL=${pattern.interval || 1}`;
        break;
      case 'absoluteYearly':
        rrule += `FREQ=YEARLY;INTERVAL=${pattern.interval || 1}`;
        break;
      default:
        return '';
    }

    if (recurrence.range && recurrence.range.endDate) {
      rrule += `;UNTIL=${new Date(recurrence.range.endDate).toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
    }

    return rrule;
  }
} 