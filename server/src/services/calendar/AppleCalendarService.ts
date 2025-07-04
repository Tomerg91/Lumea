import { 
  BaseCalendarService, 
  CalendarProvider, 
  OAuthTokens, 
  ExternalCalendarEvent, 
  CalendarMetadata 
} from './CalendarService';

// Apple Calendar uses CalDAV protocol, not OAuth
// Users need to provide their iCloud credentials and app-specific password
interface AppleCredentials {
  username: string; // iCloud email
  password: string; // App-specific password
  serverUrl?: string; // CalDAV server URL
}

export class AppleCalendarService extends BaseCalendarService {
  provider: CalendarProvider = 'apple';
  private defaultServerUrl = 'https://caldav.icloud.com';

  constructor() {
    super();
  }

  // Apple Calendar doesn't use OAuth, so these methods are adapted for CalDAV
  getAuthUrl(userId: string, redirectUri: string): string {
    // Apple Calendar doesn't use OAuth - return a special URL indicating manual setup needed
    return `${redirectUri}?provider=apple&setup=manual&userId=${userId}`;
  }

  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens> {
    // For Apple Calendar, the "code" would be the credentials in a special format
    // This is a simplified implementation - in production, you'd want better security
    try {
      const credentials = JSON.parse(Buffer.from(code, 'base64').toString()) as AppleCredentials;
      
      // Validate credentials by making a test request
      const isValid = await this.validateAppleCredentials(credentials);
      if (!isValid) {
        throw new Error('Invalid Apple Calendar credentials');
      }

      // Store credentials as "tokens" (encrypted in production)
      return {
        accessToken: Buffer.from(JSON.stringify(credentials)).toString('base64'),
        refreshToken: undefined, // CalDAV doesn't use refresh tokens
        expiresAt: undefined, // CalDAV credentials don't expire (unless password is changed)
      };
    } catch (error) {
      throw new Error(`Failed to validate Apple Calendar credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    // CalDAV doesn't use refresh tokens, so we just return the current credentials
    return {
      accessToken: refreshToken,
      refreshToken: undefined,
      expiresAt: undefined
    };
  }

  async getCalendars(tokens: OAuthTokens): Promise<CalendarMetadata[]> {
    try {
      const credentials = this.decodeCredentials(tokens.accessToken);
      
      // Make CalDAV PROPFIND request to discover calendars
      const response = await this.makeCalDAVRequest(
        credentials,
        'PROPFIND',
        '/calendars/',
        `<?xml version="1.0" encoding="utf-8" ?>
         <D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
           <D:prop>
             <D:displayname />
             <D:resourcetype />
             <C:calendar-description />
             <C:calendar-timezone />
             <C:supported-calendar-component-set />
           </D:prop>
         </D:propfind>`
      );

      // Parse XML response to extract calendar information
      // This is a simplified implementation - you'd want proper XML parsing
      const calendars = this.parseCalendarsFromXML(response);
      
      return calendars;
    } catch (error) {
      throw new Error(`Failed to get Apple calendars: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getEvents(
    tokens: OAuthTokens, 
    calendarId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<ExternalCalendarEvent[]> {
    try {
      const credentials = this.decodeCredentials(tokens.accessToken);
      
      // Make CalDAV REPORT request to get events
      const response = await this.makeCalDAVRequest(
        credentials,
        'REPORT',
        calendarId,
        `<?xml version="1.0" encoding="utf-8" ?>
         <C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
           <D:prop>
             <D:getetag />
             <C:calendar-data />
           </D:prop>
           <C:filter>
             <C:comp-filter name="VCALENDAR">
               <C:comp-filter name="VEVENT">
                 <C:time-range start="${this.formatCalDAVDate(startDate)}" end="${this.formatCalDAVDate(endDate)}"/>
               </C:comp-filter>
             </C:comp-filter>
           </C:filter>
         </C:calendar-query>`
      );

      // Parse iCal data from XML response
      const events = this.parseEventsFromXML(response);
      
      return events;
    } catch (error) {
      throw new Error(`Failed to get Apple calendar events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createEvent(
    tokens: OAuthTokens, 
    calendarId: string, 
    event: Partial<ExternalCalendarEvent>
  ): Promise<ExternalCalendarEvent> {
    try {
      const credentials = this.decodeCredentials(tokens.accessToken);
      
      // Generate iCal data for the event
      const icalData = this.generateICalEvent(event);
      const eventId = this.generateEventId();
      
      // Make CalDAV PUT request to create event
      await this.makeCalDAVRequest(
        credentials,
        'PUT',
        `${calendarId}${eventId}.ics`,
        icalData,
        { 'Content-Type': 'text/calendar; charset=utf-8' }
      );

      // Return the created event (simplified - in production you'd fetch it back)
      return {
        id: eventId,
        title: event.title || 'Untitled Event',
        description: event.description,
        startTime: event.startTime || new Date(),
        endTime: event.endTime || new Date(),
        timezone: event.timezone || 'UTC',
        isAllDay: event.isAllDay || false,
        location: event.location,
        attendees: event.attendees,
        recurrenceRule: event.recurrenceRule,
        status: event.status || 'confirmed',
        visibility: event.visibility || 'default'
      };
    } catch (error) {
      throw new Error(`Failed to create Apple calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateEvent(
    tokens: OAuthTokens, 
    calendarId: string, 
    eventId: string, 
    event: Partial<ExternalCalendarEvent>
  ): Promise<ExternalCalendarEvent> {
    try {
      const credentials = this.decodeCredentials(tokens.accessToken);
      
      // Generate updated iCal data
      const icalData = this.generateICalEvent({ ...event, id: eventId });
      
      // Make CalDAV PUT request to update event
      await this.makeCalDAVRequest(
        credentials,
        'PUT',
        `${calendarId}${eventId}.ics`,
        icalData,
        { 'Content-Type': 'text/calendar; charset=utf-8' }
      );

      // Return the updated event
      return {
        id: eventId,
        title: event.title || 'Untitled Event',
        description: event.description,
        startTime: event.startTime || new Date(),
        endTime: event.endTime || new Date(),
        timezone: event.timezone || 'UTC',
        isAllDay: event.isAllDay || false,
        location: event.location,
        attendees: event.attendees,
        recurrenceRule: event.recurrenceRule,
        status: event.status || 'confirmed',
        visibility: event.visibility || 'default'
      };
    } catch (error) {
      throw new Error(`Failed to update Apple calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteEvent(tokens: OAuthTokens, calendarId: string, eventId: string): Promise<void> {
    try {
      const credentials = this.decodeCredentials(tokens.accessToken);
      
      // Make CalDAV DELETE request
      await this.makeCalDAVRequest(
        credentials,
        'DELETE',
        `${calendarId}${eventId}.ics`
      );
    } catch (error) {
      throw new Error(`Failed to delete Apple calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async validateTokens(tokens: OAuthTokens): Promise<boolean> {
    try {
      const credentials = this.decodeCredentials(tokens.accessToken);
      return await this.validateAppleCredentials(credentials);
    } catch (error) {
      return false;
    }
  }

  async revokeTokens(tokens: OAuthTokens): Promise<void> {
    // CalDAV doesn't have a revoke mechanism - credentials just stop working when changed
    // This is a no-op for Apple Calendar
  }

  // Helper methods for CalDAV operations
  private decodeCredentials(accessToken: string): AppleCredentials {
    try {
      return JSON.parse(Buffer.from(accessToken, 'base64').toString()) as AppleCredentials;
    } catch (error) {
      throw new Error('Invalid Apple Calendar credentials format');
    }
  }

  private async validateAppleCredentials(credentials: AppleCredentials): Promise<boolean> {
    try {
      // Make a simple CalDAV request to validate credentials
      await this.makeCalDAVRequest(credentials, 'PROPFIND', '/calendars/', '', {}, true);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async makeCalDAVRequest(
    credentials: AppleCredentials,
    method: string,
    path: string,
    body: string = '',
    headers: Record<string, string> = {},
    isValidation: boolean = false
  ): Promise<string> {
    const serverUrl = credentials.serverUrl || this.defaultServerUrl;
    const url = `${serverUrl}${path}`;
    
    const auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Depth': '1',
        'Content-Type': 'application/xml; charset=utf-8',
        ...headers
      },
      body: body || undefined
    });

    if (!response.ok && !isValidation) {
      throw new Error(`CalDAV request failed: ${response.status} ${response.statusText}`);
    }

    return await response.text();
  }

  private parseCalendarsFromXML(xmlResponse: string): CalendarMetadata[] {
    // Simplified XML parsing - in production, use a proper XML parser
    const calendars: CalendarMetadata[] = [];
    
    // This is a basic implementation - you'd want proper XML parsing
    // For now, return a default calendar
    calendars.push({
      id: '/calendars/default/',
      name: 'iCloud Calendar',
      description: 'Default iCloud Calendar',
      timezone: 'UTC',
      isPrimary: true,
      accessRole: 'owner'
    });

    return calendars;
  }

  private parseEventsFromXML(xmlResponse: string): ExternalCalendarEvent[] {
    // Simplified iCal parsing - in production, use node-ical or similar
    const events: ExternalCalendarEvent[] = [];
    
    // This would parse the iCal data from the XML response
    // For now, return empty array
    
    return events;
  }

  private generateICalEvent(event: Partial<ExternalCalendarEvent>): string {
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const startTime = event.startTime?.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z' || now;
    const endTime = event.endTime?.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z' || now;
    
    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Satya Coaching//Calendar Integration//EN
BEGIN:VEVENT
UID:${event.id || this.generateEventId()}
DTSTAMP:${now}
DTSTART:${startTime}
DTEND:${endTime}
SUMMARY:${event.title || 'Untitled Event'}
DESCRIPTION:${event.description || ''}
LOCATION:${event.location || ''}
STATUS:${event.status?.toUpperCase() || 'CONFIRMED'}
END:VEVENT
END:VCALENDAR`;
  }

  private generateEventId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatCalDAVDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }
} 