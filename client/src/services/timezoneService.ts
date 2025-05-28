import { format, parseISO } from 'date-fns';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';

export interface TimezoneInfo {
  value: string; // IANA timezone identifier
  label: string; // Human-readable label
  offset: string; // Current offset (e.g., "+02:00")
  region: string; // Geographic region
  country: string; // Country name
  city: string; // Primary city
}

export interface TimezoneGroup {
  region: string;
  timezones: TimezoneInfo[];
}

export class TimezoneService {
  private static instance: TimezoneService;
  private timezoneCache: Map<string, TimezoneInfo> = new Map();

  private constructor() {
    this.initializeTimezones();
  }

  public static getInstance(): TimezoneService {
    if (!TimezoneService.instance) {
      TimezoneService.instance = new TimezoneService();
    }
    return TimezoneService.instance;
  }

  /**
   * Get the user's current timezone
   */
  public getCurrentTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  /**
   * Detect timezone automatically with fallback
   */
  public detectTimezone(): TimezoneInfo {
    try {
      const detectedTz = this.getCurrentTimezone();
      const timezoneInfo = this.getTimezoneInfo(detectedTz);
      if (timezoneInfo) {
        return timezoneInfo;
      }
    } catch (error) {
      console.warn('Failed to detect timezone:', error);
    }

    // Fallback to UTC
    return this.getTimezoneInfo('UTC')!;
  }

  /**
   * Get comprehensive list of all supported timezones
   */
  public getAllTimezones(): TimezoneInfo[] {
    return Array.from(this.timezoneCache.values()).sort((a, b) => {
      // Sort by region first, then by city
      if (a.region !== b.region) {
        return a.region.localeCompare(b.region);
      }
      return a.city.localeCompare(b.city);
    });
  }

  /**
   * Get timezones grouped by region
   */
  public getTimezonesByRegion(): TimezoneGroup[] {
    const timezones = this.getAllTimezones();
    const grouped = new Map<string, TimezoneInfo[]>();

    timezones.forEach(tz => {
      if (!grouped.has(tz.region)) {
        grouped.set(tz.region, []);
      }
      grouped.get(tz.region)!.push(tz);
    });

    return Array.from(grouped.entries()).map(([region, timezones]) => ({
      region,
      timezones: timezones.sort((a, b) => a.city.localeCompare(b.city))
    })).sort((a, b) => a.region.localeCompare(b.region));
  }

  /**
   * Get timezone information by IANA identifier
   */
  public getTimezoneInfo(timezone: string): TimezoneInfo | null {
    return this.timezoneCache.get(timezone) || null;
  }

  /**
   * Search timezones by query (city, country, or timezone name)
   */
  public searchTimezones(query: string): TimezoneInfo[] {
    const searchTerm = query.toLowerCase().trim();
    if (!searchTerm) return this.getAllTimezones();

    return this.getAllTimezones().filter(tz => 
      tz.city.toLowerCase().includes(searchTerm) ||
      tz.country.toLowerCase().includes(searchTerm) ||
      tz.label.toLowerCase().includes(searchTerm) ||
      tz.value.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Convert a date from one timezone to another
   */
  public convertTimezone(date: Date | string, fromTimezone: string, toTimezone: string): Date {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    // Convert from source timezone to UTC, then to target timezone
    const utcDate = fromZonedTime(dateObj, fromTimezone);
    return toZonedTime(utcDate, toTimezone);
  }

  /**
   * Format a date in a specific timezone
   */
  public formatInTimezone(
    date: Date | string, 
    timezone: string, 
    formatString: string = 'yyyy-MM-dd HH:mm:ss'
  ): string {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return formatInTimeZone(dateObj, timezone, formatString);
  }

  /**
   * Get current time in a specific timezone
   */
  public getCurrentTimeInTimezone(timezone: string): Date {
    return toZonedTime(new Date(), timezone);
  }

  /**
   * Get timezone offset in minutes
   */
  public getTimezoneOffset(timezone: string, date: Date = new Date()): number {
    const utcDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    const zonedDate = toZonedTime(utcDate, timezone);
    return (zonedDate.getTime() - utcDate.getTime()) / (1000 * 60);
  }

  /**
   * Get timezone offset string (e.g., "+02:00", "-05:00")
   */
  public getTimezoneOffsetString(timezone: string, date: Date = new Date()): string {
    const offsetMinutes = this.getTimezoneOffset(timezone, date);
    const hours = Math.floor(Math.abs(offsetMinutes) / 60);
    const minutes = Math.abs(offsetMinutes) % 60;
    const sign = offsetMinutes >= 0 ? '+' : '-';
    
    return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * Check if a timezone observes daylight saving time
   */
  public observesDST(timezone: string): boolean {
    const jan = new Date(2024, 0, 1); // January 1st
    const jul = new Date(2024, 6, 1); // July 1st
    
    const janOffset = this.getTimezoneOffset(timezone, jan);
    const julOffset = this.getTimezoneOffset(timezone, jul);
    
    return janOffset !== julOffset;
  }

  /**
   * Get next DST transition date for a timezone
   */
  public getNextDSTTransition(timezone: string): Date | null {
    if (!this.observesDST(timezone)) return null;

    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Check common DST transition dates
    const possibleDates = [
      new Date(currentYear, 2, 31), // Last Sunday in March
      new Date(currentYear, 9, 31), // Last Sunday in October
      new Date(currentYear, 2, 14), // Second Sunday in March (US)
      new Date(currentYear, 10, 7),  // First Sunday in November (US)
    ];

    for (const date of possibleDates) {
      if (date > now) {
        const beforeOffset = this.getTimezoneOffset(timezone, new Date(date.getTime() - 86400000));
        const afterOffset = this.getTimezoneOffset(timezone, new Date(date.getTime() + 86400000));
        
        if (beforeOffset !== afterOffset) {
          return date;
        }
      }
    }

    return null;
  }

  /**
   * Validate if a timezone identifier is valid
   */
  public isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get business hours in a specific timezone
   */
  public getBusinessHours(timezone: string, startHour: number = 9, endHour: number = 17): {
    start: string;
    end: string;
    current: string;
  } {
    const now = this.getCurrentTimeInTimezone(timezone);
    
    return {
      start: `${startHour.toString().padStart(2, '0')}:00`,
      end: `${endHour.toString().padStart(2, '0')}:00`,
      current: format(now, 'HH:mm')
    };
  }

  /**
   * Initialize the timezone cache with comprehensive timezone data
   */
  private initializeTimezones(): void {
    const timezones: Omit<TimezoneInfo, 'offset'>[] = [
      // North America
      { value: 'America/New_York', label: 'Eastern Time', region: 'North America', country: 'United States', city: 'New York' },
      { value: 'America/Chicago', label: 'Central Time', region: 'North America', country: 'United States', city: 'Chicago' },
      { value: 'America/Denver', label: 'Mountain Time', region: 'North America', country: 'United States', city: 'Denver' },
      { value: 'America/Los_Angeles', label: 'Pacific Time', region: 'North America', country: 'United States', city: 'Los Angeles' },
      { value: 'America/Anchorage', label: 'Alaska Time', region: 'North America', country: 'United States', city: 'Anchorage' },
      { value: 'Pacific/Honolulu', label: 'Hawaii Time', region: 'North America', country: 'United States', city: 'Honolulu' },
      { value: 'America/Toronto', label: 'Eastern Time', region: 'North America', country: 'Canada', city: 'Toronto' },
      { value: 'America/Vancouver', label: 'Pacific Time', region: 'North America', country: 'Canada', city: 'Vancouver' },
      { value: 'America/Mexico_City', label: 'Central Time', region: 'North America', country: 'Mexico', city: 'Mexico City' },

      // Europe
      { value: 'Europe/London', label: 'Greenwich Mean Time', region: 'Europe', country: 'United Kingdom', city: 'London' },
      { value: 'Europe/Paris', label: 'Central European Time', region: 'Europe', country: 'France', city: 'Paris' },
      { value: 'Europe/Berlin', label: 'Central European Time', region: 'Europe', country: 'Germany', city: 'Berlin' },
      { value: 'Europe/Rome', label: 'Central European Time', region: 'Europe', country: 'Italy', city: 'Rome' },
      { value: 'Europe/Madrid', label: 'Central European Time', region: 'Europe', country: 'Spain', city: 'Madrid' },
      { value: 'Europe/Amsterdam', label: 'Central European Time', region: 'Europe', country: 'Netherlands', city: 'Amsterdam' },
      { value: 'Europe/Zurich', label: 'Central European Time', region: 'Europe', country: 'Switzerland', city: 'Zurich' },
      { value: 'Europe/Vienna', label: 'Central European Time', region: 'Europe', country: 'Austria', city: 'Vienna' },
      { value: 'Europe/Stockholm', label: 'Central European Time', region: 'Europe', country: 'Sweden', city: 'Stockholm' },
      { value: 'Europe/Helsinki', label: 'Eastern European Time', region: 'Europe', country: 'Finland', city: 'Helsinki' },
      { value: 'Europe/Warsaw', label: 'Central European Time', region: 'Europe', country: 'Poland', city: 'Warsaw' },
      { value: 'Europe/Prague', label: 'Central European Time', region: 'Europe', country: 'Czech Republic', city: 'Prague' },
      { value: 'Europe/Budapest', label: 'Central European Time', region: 'Europe', country: 'Hungary', city: 'Budapest' },
      { value: 'Europe/Bucharest', label: 'Eastern European Time', region: 'Europe', country: 'Romania', city: 'Bucharest' },
      { value: 'Europe/Athens', label: 'Eastern European Time', region: 'Europe', country: 'Greece', city: 'Athens' },
      { value: 'Europe/Istanbul', label: 'Turkey Time', region: 'Europe', country: 'Turkey', city: 'Istanbul' },
      { value: 'Europe/Moscow', label: 'Moscow Time', region: 'Europe', country: 'Russia', city: 'Moscow' },

      // Asia
      { value: 'Asia/Jerusalem', label: 'Israel Standard Time', region: 'Asia', country: 'Israel', city: 'Jerusalem' },
      { value: 'Asia/Dubai', label: 'Gulf Standard Time', region: 'Asia', country: 'UAE', city: 'Dubai' },
      { value: 'Asia/Riyadh', label: 'Arabia Standard Time', region: 'Asia', country: 'Saudi Arabia', city: 'Riyadh' },
      { value: 'Asia/Tehran', label: 'Iran Standard Time', region: 'Asia', country: 'Iran', city: 'Tehran' },
      { value: 'Asia/Karachi', label: 'Pakistan Standard Time', region: 'Asia', country: 'Pakistan', city: 'Karachi' },
      { value: 'Asia/Kolkata', label: 'India Standard Time', region: 'Asia', country: 'India', city: 'Mumbai' },
      { value: 'Asia/Dhaka', label: 'Bangladesh Standard Time', region: 'Asia', country: 'Bangladesh', city: 'Dhaka' },
      { value: 'Asia/Bangkok', label: 'Indochina Time', region: 'Asia', country: 'Thailand', city: 'Bangkok' },
      { value: 'Asia/Singapore', label: 'Singapore Standard Time', region: 'Asia', country: 'Singapore', city: 'Singapore' },
      { value: 'Asia/Hong_Kong', label: 'Hong Kong Time', region: 'Asia', country: 'Hong Kong', city: 'Hong Kong' },
      { value: 'Asia/Shanghai', label: 'China Standard Time', region: 'Asia', country: 'China', city: 'Shanghai' },
      { value: 'Asia/Tokyo', label: 'Japan Standard Time', region: 'Asia', country: 'Japan', city: 'Tokyo' },
      { value: 'Asia/Seoul', label: 'Korea Standard Time', region: 'Asia', country: 'South Korea', city: 'Seoul' },

      // Australia & Oceania
      { value: 'Australia/Sydney', label: 'Australian Eastern Time', region: 'Australia & Oceania', country: 'Australia', city: 'Sydney' },
      { value: 'Australia/Melbourne', label: 'Australian Eastern Time', region: 'Australia & Oceania', country: 'Australia', city: 'Melbourne' },
      { value: 'Australia/Brisbane', label: 'Australian Eastern Time', region: 'Australia & Oceania', country: 'Australia', city: 'Brisbane' },
      { value: 'Australia/Perth', label: 'Australian Western Time', region: 'Australia & Oceania', country: 'Australia', city: 'Perth' },
      { value: 'Australia/Adelaide', label: 'Australian Central Time', region: 'Australia & Oceania', country: 'Australia', city: 'Adelaide' },
      { value: 'Pacific/Auckland', label: 'New Zealand Time', region: 'Australia & Oceania', country: 'New Zealand', city: 'Auckland' },

      // Africa
      { value: 'Africa/Cairo', label: 'Eastern European Time', region: 'Africa', country: 'Egypt', city: 'Cairo' },
      { value: 'Africa/Johannesburg', label: 'South Africa Standard Time', region: 'Africa', country: 'South Africa', city: 'Johannesburg' },
      { value: 'Africa/Lagos', label: 'West Africa Time', region: 'Africa', country: 'Nigeria', city: 'Lagos' },
      { value: 'Africa/Nairobi', label: 'East Africa Time', region: 'Africa', country: 'Kenya', city: 'Nairobi' },
      { value: 'Africa/Casablanca', label: 'Western European Time', region: 'Africa', country: 'Morocco', city: 'Casablanca' },

      // South America
      { value: 'America/Sao_Paulo', label: 'Brasília Time', region: 'South America', country: 'Brazil', city: 'São Paulo' },
      { value: 'America/Argentina/Buenos_Aires', label: 'Argentina Time', region: 'South America', country: 'Argentina', city: 'Buenos Aires' },
      { value: 'America/Santiago', label: 'Chile Time', region: 'South America', country: 'Chile', city: 'Santiago' },
      { value: 'America/Lima', label: 'Peru Time', region: 'South America', country: 'Peru', city: 'Lima' },
      { value: 'America/Bogota', label: 'Colombia Time', region: 'South America', country: 'Colombia', city: 'Bogotá' },

      // UTC
      { value: 'UTC', label: 'Coordinated Universal Time', region: 'UTC', country: 'UTC', city: 'UTC' },
    ];

    // Add current offset to each timezone
    timezones.forEach(tz => {
      const offset = this.getTimezoneOffsetString(tz.value);
      this.timezoneCache.set(tz.value, { ...tz, offset });
    });
  }
}

// Export singleton instance
export const timezoneService = TimezoneService.getInstance(); 