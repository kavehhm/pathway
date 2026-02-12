/**
 * TEST ENDPOINT: Create a Google Calendar event with Google Meet
 * 
 * This endpoint is for testing the Google Calendar integration.
 * DO NOT use in production - disable or remove before deploying.
 * 
 * Usage:
 * POST /api/test-calendar
 * {
 *   "tutorEmail": "tutor@example.com",
 *   "tutorName": "John Tutor",
 *   "studentEmail": "student@example.com",
 *   "studentName": "Jane Student",
 *   "date": "2026-02-10",
 *   "time": "2:00 PM",
 *   "timezone": "America/Los_Angeles"
 * }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  createMeetEvent,
  formatBookingForCalendar,
  parseBookingDateTime,
  deleteCalendarEvent,
  type CalendarEventDetails,
} from '~/lib/googleCalendar';

// Only allow in development/test mode
const isTestEnabled = process.env.NODE_ENV === 'development' || process.env.ENABLE_TEST_ENDPOINTS === 'true';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Safety check - only allow in development
  if (!isTestEnabled) {
    return res.status(403).json({ 
      error: 'Test endpoint disabled in production',
      hint: 'Set ENABLE_TEST_ENDPOINTS=true to enable (not recommended for production)'
    });
  }

  if (req.method === 'POST') {
    return handleCreateEvent(req, res);
  }
  
  if (req.method === 'DELETE') {
    return handleDeleteEvent(req, res);
  }

  res.setHeader('Allow', 'POST, DELETE');
  return res.status(405).end('Method Not Allowed');
}

async function handleCreateEvent(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      tutorEmail,
      tutorName,
      studentEmail,
      studentName,
      date,
      time,
      timezone = 'America/Los_Angeles',
    } = req.body;

    // Validate required fields
    if (!tutorEmail || !tutorName || !studentEmail || !studentName || !date || !time) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['tutorEmail', 'tutorName', 'studentEmail', 'studentName', 'date', 'time'],
      });
    }

    console.log('Creating test calendar event...');
    console.log('Tutor:', tutorName, tutorEmail);
    console.log('Student:', studentName, studentEmail);
    console.log('Date/Time:', date, time, timezone);

    // Parse the date and time
    const { startTime, endTime } = parseBookingDateTime(date, time, timezone);

    // Format the event
    const { summary, description } = formatBookingForCalendar(tutorName, studentName);

    const eventDetails: CalendarEventDetails = {
      summary,
      description,
      startTime,
      endTime,
      timezone,
      tutorEmail,
      studentEmail,
      tutorName,
      studentName,
    };

    // Create the event
    const result = await createMeetEvent(eventDetails);

    console.log('Calendar event created successfully!');
    console.log('Event ID:', result.eventId);
    console.log('Meet Link:', result.meetLink);
    console.log('Calendar Link:', result.htmlLink);

    return res.status(200).json({
      success: true,
      event: {
        eventId: result.eventId,
        meetLink: result.meetLink,
        htmlLink: result.htmlLink,
      },
      message: 'Calendar event created successfully. Check the calendar for the event.',
    });
  } catch (error: any) {
    console.error('Error creating test calendar event:', error);
    return res.status(500).json({
      error: 'Failed to create calendar event',
      message: error.message,
      hint: 'Make sure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN are set correctly',
    });
  }
}

async function handleDeleteEvent(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { eventId } = req.body;

    if (!eventId) {
      return res.status(400).json({ error: 'Missing eventId' });
    }

    await deleteCalendarEvent(eventId);

    return res.status(200).json({
      success: true,
      message: `Event ${eventId} deleted successfully`,
    });
  } catch (error: any) {
    console.error('Error deleting calendar event:', error);
    return res.status(500).json({
      error: 'Failed to delete calendar event',
      message: error.message,
    });
  }
}
