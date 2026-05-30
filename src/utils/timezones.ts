export const US_TIMEZONES = [
  { value: 'PST', label: 'Pacific Standard Time (PST)' },
  { value: 'PDT', label: 'Pacific Daylight Time (PDT)' },
  { value: 'MST', label: 'Mountain Standard Time (MST)' },
  { value: 'MDT', label: 'Mountain Daylight Time (MDT)' },
  { value: 'CST', label: 'Central Standard Time (CST)' },
  { value: 'CDT', label: 'Central Daylight Time (CDT)' },
  { value: 'EST', label: 'Eastern Standard Time (EST)' },
  { value: 'EDT', label: 'Eastern Daylight Time (EDT)' },
  { value: 'AKST', label: 'Alaska Standard Time (AKST)' },
  { value: 'AKDT', label: 'Alaska Daylight Time (AKDT)' },
  { value: 'HST', label: 'Hawaii Standard Time (HST)' },
  { value: 'HDT', label: 'Hawaii Daylight Time (HDT)' },
];

export const TIMEZONE_OFFSETS: Record<string, number> = {
  'PST': -8,
  'PDT': -7,
  'MST': -7,
  'MDT': -6,
  'CST': -6,
  'CDT': -5,
  'EST': -5,
  'EDT': -4,
  'AKST': -9,
  'AKDT': -8,
  'HST': -10,
  'HDT': -9,
};

const TIMEZONE_TO_IANA: Record<string, string> = {
  PST: 'America/Los_Angeles',
  PDT: 'America/Los_Angeles',
  MST: 'America/Denver',
  MDT: 'America/Denver',
  CST: 'America/Chicago',
  CDT: 'America/Chicago',
  EST: 'America/New_York',
  EDT: 'America/New_York',
  AKST: 'America/Anchorage',
  AKDT: 'America/Anchorage',
  HST: 'Pacific/Honolulu',
  HDT: 'Pacific/Honolulu',
};

function toIanaTimezone(timezone: string): string {
  return TIMEZONE_TO_IANA[timezone] ?? timezone;
}

function parseShortOffsetToHours(shortOffset: string): number | null {
  const match = shortOffset.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/i);
  if (!match) return null;
  const sign = (match[1] ?? '+') === '-' ? -1 : 1;
  const hours = parseInt(match[2] ?? '0', 10);
  const minutes = parseInt(match[3] ?? '0', 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return sign * (hours + (minutes / 60));
}

function getTimezoneOffsetHours(timezone: string): number {
  if (timezone in TIMEZONE_OFFSETS) {
    return TIMEZONE_OFFSETS[timezone] ?? 0;
  }

  // IANA timezone support with DST-aware offset (e.g. America/Chicago -> GMT-5 in summer)
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: toIanaTimezone(timezone),
      timeZoneName: 'shortOffset',
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(new Date());
    const offsetPart = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
    const parsed = parseShortOffsetToHours(offsetPart);
    if (parsed !== null) return parsed;
  } catch (error) {
    console.warn(`Failed to resolve timezone offset for ${timezone}:`, error);
  }

  return 0;
}

function parse12HourTime(timeStr: string): { hours: number; minutes: number } | null {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hours = parseInt(match[1] ?? '0', 10);
  const minutes = parseInt(match[2] ?? '0', 10);
  const period = (match[3] ?? 'AM').toUpperCase();
  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
    return null;
  }
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return { hours, minutes };
}

function formatAs12Hour(hours24: number, minutes: number): string {
  const normalizedHours = ((hours24 % 24) + 24) % 24;
  const period = normalizedHours >= 12 ? 'PM' : 'AM';
  let hours12 = normalizedHours % 12;
  if (hours12 === 0) hours12 = 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function getOffsetMinutesForDate(date: Date, timezone: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: toIanaTimezone(timezone),
      timeZoneName: 'shortOffset',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const offsetPart = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
    const parsedHours = parseShortOffsetToHours(offsetPart);
    if (parsedHours !== null) return Math.round(parsedHours * 60);
  } catch (error) {
    console.warn(`Failed to resolve dated timezone offset for ${timezone}:`, error);
  }

  return Math.round(getTimezoneOffsetHours(timezone) * 60);
}

function zonedDateTimeToUtc(date: string, time: string, timezone: string): Date {
  const parsedTime = parse12HourTime(time);
  if (!parsedTime) {
    throw new Error(`Invalid time format: ${time}`);
  }
  const dateParts = date.split('-').map((part) => parseInt(part, 10));
  const [year, month, day] = dateParts;
  if (!year || !month || !day) {
    throw new Error(`Invalid date format: ${date}`);
  }

  // Start with naive UTC assumption then adjust by timezone offset for that instant.
  const utcGuess = new Date(Date.UTC(year, month - 1, day, parsedTime.hours, parsedTime.minutes, 0, 0));
  const offsetMins = getOffsetMinutesForDate(utcGuess, timezone);
  return new Date(utcGuess.getTime() - (offsetMins * 60 * 1000));
}

export function convertAppointmentBetweenTimezones(
  date: string,
  time: string,
  fromTimezone: string,
  toTimezone: string
): { date: string; time: string } {
  const utcDate = zonedDateTimeToUtc(date, time, fromTimezone);
  const targetTz = toIanaTimezone(toTimezone);

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: targetTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(utcDate);

  const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour24 = parseInt(getPart('hour'), 10);
  const minute = parseInt(getPart('minute'), 10);

  if (!year || !month || !day || Number.isNaN(hour24) || Number.isNaN(minute)) {
    throw new Error(`Failed timezone conversion for ${date} ${time} from ${fromTimezone} to ${toTimezone}`);
  }

  return {
    date: `${year}-${month}-${day}`,
    time: formatAs12Hour(hour24, minute),
  };
}

export function convertTimeBetweenTimezones(
  time: string,
  fromTimezone: string,
  toTimezone: string
): string {
  // Parse the time string (e.g., "2:00 PM")
  const parts = time.split(' ');
  if (parts.length < 2) {
    // If no period (AM/PM) is found, assume it's already in 24-hour format
    const timeParts = time.split(':');
    const hours = parseInt(timeParts[0] ?? '0', 10);
    const minutes = parseInt(timeParts[1] ?? '0', 10);
    
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    
    // Get timezone offsets
    const fromOffset = getTimezoneOffsetHours(fromTimezone);
    const toOffset = getTimezoneOffsetHours(toTimezone);
    
    // Calculate the difference in hours
    const hourDifference = toOffset - fromOffset;
    
    // Add the difference
    date.setHours(date.getHours() + hourDifference);
    
    // Convert to 12-hour format
    let convertedHours = date.getHours();
    const convertedMinutes = date.getMinutes();
    const convertedPeriod = convertedHours >= 12 ? 'PM' : 'AM';
    
    if (convertedHours === 0) convertedHours = 12;
    if (convertedHours > 12) convertedHours -= 12;
    
    return `${convertedHours}:${convertedMinutes.toString().padStart(2, '0')} ${convertedPeriod}`;
  }
  
  const timeStr = parts[0];
  const period = parts[1];
  
  if (!timeStr) {
    return time; // Return original time if parsing fails
  }
  
  const timeParts = timeStr.split(':');
  const hours = parseInt(timeParts[0] ?? '0', 10);
  const minutes = parseInt(timeParts[1] ?? '0', 10);
  
  // Convert to 24-hour format
  let hour24 = hours;
  if (period === 'PM' && hours !== 12) hour24 += 12;
  if (period === 'AM' && hours === 12) hour24 = 0;
  
  // Create a date object with the time
  const date = new Date();
  date.setHours(hour24, minutes, 0, 0);
  
  // Get timezone offsets
  const fromOffset = getTimezoneOffsetHours(fromTimezone);
  const toOffset = getTimezoneOffsetHours(toTimezone);
  
  // Calculate the difference in hours
  const hourDifference = toOffset - fromOffset;
  
  // Add the difference
  date.setHours(date.getHours() + hourDifference);
  
  // Convert back to 12-hour format
  let convertedHours = date.getHours();
  const convertedMinutes = date.getMinutes();
  const convertedPeriod = convertedHours >= 12 ? 'PM' : 'AM';
  
  if (convertedHours === 0) convertedHours = 12;
  if (convertedHours > 12) convertedHours -= 12;
  
  return `${convertedHours}:${convertedMinutes.toString().padStart(2, '0')} ${convertedPeriod}`;
}

export function getCurrentTimezone(): string {
  try {
    // Try multiple methods to detect timezone
    const now = new Date();
    
    // Method 1: Use Intl.DateTimeFormat if available (most reliable)
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      try {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (timeZone) {
          // Map common timezone names to our format
          const timezoneMap: Record<string, [string, string]> = {
            'America/Los_Angeles': ['PST', 'PDT'],
            'America/Denver': ['MST', 'MDT'],
            'America/Chicago': ['CST', 'CDT'],
            'America/New_York': ['EST', 'EDT'],
            'America/Anchorage': ['AKST', 'AKDT'],
            'Pacific/Honolulu': ['HST', 'HST'],
          };
          
          // Check if we have a direct mapping
          const mappedTimezone = timezoneMap[timeZone];
          if (mappedTimezone) {
            const localOffset = -now.getTimezoneOffset() / 60;
            const [standardTz, daylightTz] = mappedTimezone;

            // US DST ranges: standard offset is usually one hour "more negative".
            // Example: CST (-6) vs CDT (-5).
            if ((TIMEZONE_OFFSETS[daylightTz] ?? localOffset) === localOffset) {
              return daylightTz;
            }
            return standardTz;
          }
          
          // Try to extract from timezone string
          if (timeZone.includes('Los_Angeles') || timeZone.includes('Vancouver')) return 'PDT';
          if (timeZone.includes('Denver') || timeZone.includes('Phoenix')) return 'MDT';
          if (timeZone.includes('Chicago') || timeZone.includes('Houston')) return 'CDT';
          if (timeZone.includes('New_York') || timeZone.includes('Miami')) return 'EDT';
          if (timeZone.includes('Anchorage')) return 'AKDT';
          if (timeZone.includes('Honolulu')) return 'HST';
        }
      } catch (e) {
        console.warn('Intl.DateTimeFormat failed, falling back to offset method:', e);
      }
    }
    
    // Method 2: Use timezone offset (fallback)
    const timezoneOffset = -now.getTimezoneOffset() / 60;
    
    // Map offset to timezone with better handling for edge cases
    switch (Math.round(timezoneOffset)) {
      case -8: return 'PST';
      case -7: return 'PDT';
      case -6: return 'CST';
      case -5: return 'CDT';
      case -4: return 'EDT';
      case -9: return 'AKST';
      case -10: return 'HST';
      default: {
        // If we can't determine, try to guess based on common patterns
        console.warn(`Unknown timezone offset: ${timezoneOffset}, defaulting to PST`);
        return 'PST';
      }
    }
  } catch (error) {
    console.error('Error detecting timezone:', error);
    // Ultimate fallback
    return 'PST';
  }
} 
