/**
 * URL Validation utilities for meeting links
 */

/**
 * Check if a string is a valid URL
 * Returns true only for properly formatted http/https URLs
 */
export function isValidUrl(str: string | null | undefined): boolean {
  if (!str || typeof str !== 'string') {
    return false;
  }

  const trimmed = str.trim();
  if (!trimmed) {
    return false;
  }

  try {
    const url = new URL(trimmed);
    // Only allow http and https protocols
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Check if a string is a valid meeting link
 * Validates that it's a URL and optionally checks for known meeting platforms
 */
export function isValidMeetingLink(str: string | null | undefined): boolean {
  if (!isValidUrl(str)) {
    return false;
  }

  // Additional validation could be added here to check for known meeting platforms
  // For now, any valid https URL is accepted as a meeting link
  return true;
}

/**
 * List of known meeting platform domains for optional stricter validation
 */
export const KNOWN_MEETING_DOMAINS = [
  'meet.google.com',
  'zoom.us',
  'teams.microsoft.com',
  'whereby.com',
  'discord.gg',
  'discord.com',
  'webex.com',
  'gotomeeting.com',
  'calendly.com',
  'cal.com',
];

/**
 * Check if the meeting link is from a known meeting platform
 * This is more strict validation that can be used optionally
 */
export function isKnownMeetingPlatform(str: string | null | undefined): boolean {
  if (!isValidUrl(str)) {
    return false;
  }

  try {
    const url = new URL(str!.trim());
    const hostname = url.hostname.toLowerCase();
    
    return KNOWN_MEETING_DOMAINS.some(
      domain => hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}
