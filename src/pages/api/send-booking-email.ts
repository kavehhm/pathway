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
import { issueTutorCancelToken } from '~/lib/bookingActions';

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

    let meetingLink = params.meetingLink;
    let calendarLink = params.calendarLink;
    let tutorCancelUrl: string | undefined;

    // If there's no valid meeting link, create a Google Calendar event with Meet
    if (!isValidUrl(meetingLink)) {
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

        meetingLink = calendarResult.meetLink;
        calendarLink = calendarResult.htmlLink;
        console.log(`Created calendar event ${calendarResult.eventId} with Meet link: ${meetingLink}`);

        // Update the booking record with calendar info
        if (bookingId) {
          try {
            await db.booking.update({
              where: { id: bookingId },
              data: {
                meetLink: meetingLink || null,
                calendarEventId: calendarResult.eventId || null,
                calendarHtmlLink: calendarLink || null,
                tutorEmail: params.tutorEmail,
              },
            });
            console.log(`Updated booking ${bookingId} with calendar info`);
          } catch (dbError: any) {
            console.error(`Failed to update booking ${bookingId}:`, dbError.message);
          }
        }
      } catch (calError: any) {
        console.error('Failed to create Google Calendar event:', calError.message);
        meetingLink = 'Unable to generate - please contact your tutor';
      }
    }

    const emailParams: BookingConfirmationParams = {
      tutorName: params.tutorName,
      studentName: params.studentName,
      date: params.date,
      startTime: params.startTime,
      endTime: params.endTime,
      timeZone: params.timeZone,
      studentEmail: params.studentEmail,
      tutorEmail: params.tutorEmail,
      meetingLink,
      calendarLink,
      tutorCancelUrl,
    };

    const results: SendBookingEmailResponse = { success: true };

    if (type === 'tutor' || type === 'both') {
      if (bookingId) {
        try {
          const tokenResult = await issueTutorCancelToken(bookingId);
          tutorCancelUrl = tokenResult.cancelUrl;
          emailParams.tutorCancelUrl = tutorCancelUrl;
        } catch (tokenError) {
          console.error(`Failed to create tutor cancel token for booking ${bookingId}:`, tokenError);
        }
      }

      const tutorTemplate = tutorBookingConfirmationEmail(emailParams);
      const tutorResult = await sendEmail({
        to: params.tutorEmail,
        subject: tutorTemplate.subject,
        html: tutorTemplate.html,
        text: tutorTemplate.text,
      });
      results.tutorEmail = tutorResult;
      console.log(`Tutor email to ${params.tutorEmail}: ${tutorResult.success ? 'sent' : 'failed'}`);
    }

    if (type === 'student' || type === 'both') {
      const studentTemplate = studentBookingConfirmationEmail(emailParams);
      const studentResult = await sendEmail({
        to: params.studentEmail,
        subject: studentTemplate.subject,
        html: studentTemplate.html,
        text: studentTemplate.text,
      });
      results.studentEmail = studentResult;
      console.log(`Student email to ${params.studentEmail}: ${studentResult.success ? 'sent' : 'failed'}`);
    }

    const tutorFailed = results.tutorEmail && !results.tutorEmail.success;
    const studentFailed = results.studentEmail && !results.studentEmail.success;

    if (Boolean(tutorFailed) || Boolean(studentFailed)) {
      results.success = false;
    }

    if (meetingLink) {
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
