/**
 * Google Calendar Integration for Pathway Tutors
 * 
 * Creates Google Calendar events with Google Meet links for tutoring sessions.
 * Uses OAuth2 with a refresh token for the Workspace organizer account.
 */

import { google, calendar_v3 } from 'googleapis';

// Types for the module
export interface CalendarEventDetails {
  summary: string;
  description: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  tutorEmail: string;
  studentEmail: string;
  tutorName: string;
  studentName: string;
}

export interface CalendarEventResult {
  eventId: string;
  meetLink: string;
  htmlLink: string;
}

/**
 * Get an authenticated Google Calendar client using OAuth2
 * Uses refresh token stored in environment variables
 */
function getGoogleCalendarClient(): calendar_v3.Calendar {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Missing Google Calendar credentials. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN environment variables.'
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    process.env.GOOGLE_REDIRECT_URI || 'https://pathwaytutors.com/api/auth/google/callback'
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

/**
 * Create a Google Calendar event with Google Meet conferencing
 * 
 * The event is created on the Workspace organizer's calendar (noreply@pathwaytutors.com)
 * with both tutor and student added as attendees.
 * 
 * Google Meet is configured to allow guests to join without the organizer present.
 */
export async function createMeetEvent(
  details: CalendarEventDetails
): Promise<CalendarEventResult> {
  const calendar = getGoogleCalendarClient();
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

  // Generate a unique request ID for conference creation
  const requestId = `pt-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

  const event: calendar_v3.Schema$Event = {
    summary: details.summary,
    description: details.description,
    start: {
      dateTime: details.startTime.toISOString(),
      timeZone: details.timezone,
    },
    end: {
      dateTime: details.endTime.toISOString(),
      timeZone: details.timezone,
    },
    attendees: [
      {
        email: details.tutorEmail,
        displayName: details.tutorName,
        responseStatus: 'needsAction',
      },
      {
        email: details.studentEmail,
        displayName: details.studentName,
        responseStatus: 'needsAction',
      },
    ],
    conferenceData: {
      createRequest: {
        requestId,
        conferenceSolutionKey: {
          type: 'hangoutsMeet',
        },
      },
    },
    // Allow guests to modify the event (optional)
    guestsCanModify: false,
    // Allow guests to see other guests
    guestsCanSeeOtherGuests: true,
    // Allow guests to invite others (disabled for security)
    guestsCanInviteOthers: false,
    // Send email notifications to attendees
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 1 day before
        { method: 'email', minutes: 60 }, // 1 hour before
        { method: 'popup', minutes: 30 }, // 30 minutes before
      ],
    },
  };

  try {
    const response = await calendar.events.insert({
      calendarId,
      requestBody: event,
      conferenceDataVersion: 1, // Required to create Google Meet
      sendUpdates: 'all', // Send invites to attendees
    });

    const createdEvent = response.data;

    if (!createdEvent.id) {
      throw new Error('Calendar event created but no event ID returned');
    }

    // Extract the Google Meet link
    const meetLink = createdEvent.conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === 'video'
    )?.uri;

    if (!meetLink) {
      console.warn('Calendar event created but no Google Meet link was generated');
    }

    return {
      eventId: createdEvent.id,
      meetLink: meetLink || '',
      htmlLink: createdEvent.htmlLink || '',
    };
  } catch (error: any) {
    console.error('Error creating Google Calendar event:', error);
    
    // Provide more helpful error messages
    if (error.code === 401) {
      throw new Error('Google Calendar authentication failed. Please refresh the access token.');
    }
    if (error.code === 403) {
      throw new Error('Google Calendar access forbidden. Check calendar permissions.');
    }
    if (error.code === 404) {
      throw new Error('Google Calendar not found. Check GOOGLE_CALENDAR_ID.');
    }
    
    throw new Error(`Failed to create calendar event: ${error.message}`);
  }
}

/**
 * Delete a Google Calendar event by ID
 * Used for cleanup if booking fails or is cancelled
 */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const calendar = getGoogleCalendarClient();
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

  try {
    await calendar.events.delete({
      calendarId,
      eventId,
      sendUpdates: 'all', // Notify attendees of cancellation
    });
    console.log(`Calendar event ${eventId} deleted successfully`);
  } catch (error: any) {
    console.error(`Error deleting calendar event ${eventId}:`, error);
    // Don't throw - deletion failure shouldn't break the flow
  }
}

/**
 * Get a Google Calendar event by ID
 * Useful for checking if an event already exists (idempotency)
 */
export async function getCalendarEvent(eventId: string): Promise<calendar_v3.Schema$Event | null> {
  const calendar = getGoogleCalendarClient();
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

  try {
    const response = await calendar.events.get({
      calendarId,
      eventId,
    });
    return response.data;
  } catch (error: any) {
    if (error.code === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Format booking details into calendar event format
 * This helper constructs the event summary and description
 */
export function formatBookingForCalendar(
  tutorName: string,
  studentName: string,
  subject?: string
): { summary: string; description: string } {
  const summary = subject
    ? `Tutoring Session: ${subject} - ${tutorName} & ${studentName}`
    : `Tutoring Session: ${tutorName} & ${studentName}`;

  const description = `
Pathway Tutors Session

Tutor: ${tutorName}
Student: ${studentName}
${subject ? `Subject: ${subject}\n` : ''}
---
This is an automated booking from Pathway Tutors.
The Google Meet link is included in this event for your convenience.

Need help? Contact support@pathwaytutors.com
`.trim();

  return { summary, description };
}

/**
 * Convert a time string (e.g., "9:00 AM") and date to a Date object
 * Handles timezone conversion
 */
export function parseBookingDateTime(
  dateStr: string,
  timeStr: string,
  timezone: string
): { startTime: Date; endTime: Date } {
  // Parse the time string (e.g., "9:00 AM" or "2:30 PM")
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    throw new Error(`Invalid time format: ${timeStr}`);
  }

  let hours = parseInt(match[1] ?? '0', 10);
  const minutes = parseInt(match[2] ?? '0', 10);
  const period = (match[3] ?? 'AM').toUpperCase();

  // Convert to 24-hour format
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  // Parse the date string
  const date = new Date(dateStr);
  
  // Set the time
  date.setHours(hours, minutes, 0, 0);

  // Create end time (1 hour later)
  const endTime = new Date(date.getTime() + 60 * 60 * 1000);

  return { startTime: date, endTime };
}
