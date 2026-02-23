/**
 * API Route: Send Booking Confirmation Emails
 * 
 * Uses Brevo transactional email API (via ~/lib/email).
 * Called from ManualCal.tsx for free session booking confirmations.
 * Also creates a Google Calendar event with a Meet link for free sessions.
 * Paid session emails are sent from the Stripe webhook after calendar creation.
 * 
 * POST /api/send-booking-email
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { sendEmail } from '~/lib/email';
import {
  tutorBookingConfirmationEmail,
  studentBookingConfirmationEmail,
  type BookingConfirmationParams,
} from '~/lib/email/templates';
import {
  createMeetEvent,
  formatBookingForCalendar,
  parseBookingDateTime,
  type CalendarEventDetails,
} from '~/lib/googleCalendar';
import { isValidUrl } from '~/lib/validateUrl';
import { db } from '~/server/db';

interface SendBookingEmailRequest {
  type: 'tutor' | 'student' | 'both';
  bookingId?: string;
  tutorTimezone?: string;
  params: {
    tutorName: string;
    studentName: string;
    date: string;
    startTime: string;
    endTime: string;
    timeZone: string;
    studentEmail: string;
    tutorEmail: string;
    meetingLink: string;
    calendarLink?: string;
  };
}

interface SendBookingEmailResponse {
  success: boolean;
  tutorEmail?: { success: boolean; error?: string };
  studentEmail?: { success: boolean; error?: string };
  meetLink?: string;
  error?: string;
}

export const config = {
  maxDuration: 30,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SendBookingEmailResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { type, params, bookingId, tutorTimezone } = req.body as SendBookingEmailRequest;

    if (!type || !params) {
      return res.status(400).json({ success: false, error: 'Missing type or params' });
    }

    const requiredFields = [
      'tutorName',
      'studentName',
      'date',
      'startTime',
      'endTime',
      'timeZone',
      'studentEmail',
      'tutorEmail',
    ];

    for (const field of requiredFields) {
      if (!params[field as keyof typeof params]) {
        return res.status(400).json({ success: false, error: `Missing required field: ${field}` });
      }
    }

    const meetingLink = params.meetingLink;
    const calendarLink = params.calendarLink;
    const needsGoogleMeet = !isValidUrl(meetingLink);

    // --- STEP 1: Send Brevo confirmation emails FIRST ---
    // Emails are the highest priority and must go out before any slow API calls.
    // If a Google Meet link is needed, attendees will receive it separately
    // via the Google Calendar invitation email that Google sends automatically.
    const emailMeetingLink = needsGoogleMeet
      ? 'A Google Calendar invite with the Meet link will be sent shortly.'
      : meetingLink;

    const emailParams: BookingConfirmationParams = {
      tutorName: params.tutorName,
      studentName: params.studentName,
      date: params.date,
      startTime: params.startTime,
      endTime: params.endTime,
      timeZone: params.timeZone,
      studentEmail: params.studentEmail,
      tutorEmail: params.tutorEmail,
      meetingLink: emailMeetingLink,
      calendarLink,
    };

    const results: SendBookingEmailResponse = { success: true };

    const emailPromises: Promise<void>[] = [];

    if (type === 'tutor' || type === 'both') {
      emailPromises.push(
        (async () => {
          const tutorTemplate = tutorBookingConfirmationEmail(emailParams);
          const tutorResult = await sendEmail({
            to: params.tutorEmail,
            subject: tutorTemplate.subject,
            html: tutorTemplate.html,
            text: tutorTemplate.text,
          });
          results.tutorEmail = tutorResult;
          console.log(`Tutor email to ${params.tutorEmail}: ${tutorResult.success ? 'sent' : 'failed'}`);
        })()
      );
    }

    if (type === 'student' || type === 'both') {
      emailPromises.push(
        (async () => {
          const studentTemplate = studentBookingConfirmationEmail(emailParams);
          const studentResult = await sendEmail({
            to: params.studentEmail,
            subject: studentTemplate.subject,
            html: studentTemplate.html,
            text: studentTemplate.text,
          });
          results.studentEmail = studentResult;
          console.log(`Student email to ${params.studentEmail}: ${studentResult.success ? 'sent' : 'failed'}`);
        })()
      );
    }

    await Promise.all(emailPromises);

    const tutorFailed = results.tutorEmail && !results.tutorEmail.success;
    const studentFailed = results.studentEmail && !results.studentEmail.success;

    if (tutorFailed ?? studentFailed) {
      results.success = false;
    }

    // --- STEP 2: Create Google Calendar event AFTER emails are sent ---
    // This is the slow part (OAuth refresh + API call + Meet provisioning).
    // If the function times out here, emails were already sent and Google's
    // own invitation email will deliver the Meet link to attendees.
    if (needsGoogleMeet) {
      try {
        const timezone = tutorTimezone ?? 'America/Los_Angeles';
        const { startTime, endTime } = parseBookingDateTime(params.date, params.startTime, timezone);
        const { summary, description } = formatBookingForCalendar(params.tutorName, params.studentName);

        const eventDetails: CalendarEventDetails = {
          summary,
          description,
          startTime,
          endTime,
          timezone,
          tutorEmail: params.tutorEmail,
          studentEmail: params.studentEmail,
          tutorName: params.tutorName,
          studentName: params.studentName,
        };

        console.log(`Creating Google Calendar event for free session booking...`);
        const calendarResult = await createMeetEvent(eventDetails);

        results.meetLink = calendarResult.meetLink;
        console.log(`Created calendar event ${calendarResult.eventId} with Meet link: ${calendarResult.meetLink}`);

        if (bookingId) {
          db.booking.update({
            where: { id: bookingId },
            data: {
              meetLink: calendarResult.meetLink ?? null,
              calendarEventId: calendarResult.eventId ?? null,
              calendarHtmlLink: calendarResult.htmlLink ?? null,
              tutorEmail: params.tutorEmail,
            },
          }).catch((dbError: any) => {
            console.error(`Failed to update booking ${bookingId}:`, dbError.message);
          });
        }
      } catch (calError: any) {
        console.error('Failed to create Google Calendar event:', calError.message);
      }
    } else if (meetingLink) {
      results.meetLink = meetingLink;
    }

    return res.status(200).json(results);
  } catch (error: any) {
    console.error('Error in send-booking-email API:', error);
    return res.status(500).json({
      success: false,
      error: error.message ?? 'Internal server error',
    });
  }
}
