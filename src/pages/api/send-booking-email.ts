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
import { getAuth } from '@clerk/nextjs/server';
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
import { calculateEndTime } from '~/lib/sendBookingEmails';

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
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { type, params, bookingId, tutorTimezone } = req.body as SendBookingEmailRequest;

    if (!bookingId) {
      return res.status(400).json({ success: false, error: 'bookingId is required' });
    }

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        tutor: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            timezone: true,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const canAccess = booking.tutorId === userId || booking.studentClerkId === userId;
    if (!canAccess) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

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

    // Canonical booking schedule comes from DB to prevent client-side timezone/date drift.
    const canonicalDateIso = booking.date.toISOString().split('T')[0] ?? params.date;
    const canonicalDateDisplay = booking.date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
    const canonicalStartTime = booking.time;
    const canonicalEndTime = calculateEndTime(canonicalStartTime);
    const canonicalTutorTimezone = booking.tutor.timezone ?? tutorTimezone ?? params.timeZone ?? 'America/Los_Angeles';
    const canonicalTutorName = `${booking.tutor.firstName} ${booking.tutor.lastName}`.trim() || params.tutorName;
    const canonicalTutorEmail = booking.tutor.email || params.tutorEmail;

    if (
      params.date !== canonicalDateIso ||
      params.startTime !== canonicalStartTime ||
      params.tutorEmail !== canonicalTutorEmail
    ) {
      console.warn(
        `Booking ${bookingId}: client payload differed from canonical booking schedule. ` +
        `Incoming date/time/email=${params.date} ${params.startTime} ${params.tutorEmail}; ` +
        `Canonical=${canonicalDateIso} ${canonicalStartTime} ${canonicalTutorEmail}`
      );
    }

    // If there's no valid meeting link, create a Google Calendar event with Meet
    if (!isValidUrl(meetingLink)) {
      try {
        const timezone = canonicalTutorTimezone;
        const { startTime, endTime } = parseBookingDateTime(canonicalDateIso, canonicalStartTime, timezone);
        const { summary, description } = formatBookingForCalendar(canonicalTutorName, params.studentName);

        const eventDetails: CalendarEventDetails = {
          summary,
          description,
          startTime,
          endTime,
          timezone,
          tutorEmail: canonicalTutorEmail,
          studentEmail: params.studentEmail,
          tutorName: canonicalTutorName,
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
                tutorEmail: canonicalTutorEmail,
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
      tutorName: canonicalTutorName,
      studentName: params.studentName,
      date: canonicalDateDisplay,
      startTime: canonicalStartTime,
      endTime: canonicalEndTime,
      timeZone: canonicalTutorTimezone,
      studentEmail: params.studentEmail,
      tutorEmail: canonicalTutorEmail,
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
        to: canonicalTutorEmail,
        subject: tutorTemplate.subject,
        html: tutorTemplate.html,
        text: tutorTemplate.text,
      });
      results.tutorEmail = tutorResult;
      console.log(`Tutor email to ${canonicalTutorEmail}: ${tutorResult.success ? 'sent' : 'failed'}`);
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
