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
    const fromOffset = TIMEZONE_OFFSETS[fromTimezone] ?? 0;
    const toOffset = TIMEZONE_OFFSETS[toTimezone] ?? 0;
    
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
  const fromOffset = TIMEZONE_OFFSETS[fromTimezone] ?? 0;
  const toOffset = TIMEZONE_OFFSETS[toTimezone] ?? 0;
  
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
          const timezoneMap: Record<string, string> = {
            'America/Los_Angeles': 'PST',
            'America/Denver': 'MST', 
            'America/Chicago': 'CST',
            'America/New_York': 'EST',
            'America/Anchorage': 'AKST',
            'Pacific/Honolulu': 'HST'
          };
          
          // Check if we have a direct mapping
          const mappedTimezone = timezoneMap[timeZone];
          if (mappedTimezone) {
            return mappedTimezone;
          }
          
          // Try to extract from timezone string
          if (timeZone.includes('Los_Angeles') || timeZone.includes('Vancouver')) return 'PST';
          if (timeZone.includes('Denver') || timeZone.includes('Phoenix')) return 'MST';
          if (timeZone.includes('Chicago') || timeZone.includes('Houston')) return 'CST';
          if (timeZone.includes('New_York') || timeZone.includes('Miami')) return 'EST';
          if (timeZone.includes('Anchorage')) return 'AKST';
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
      case -6: return 'MDT';
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