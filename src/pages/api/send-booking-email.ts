/**
 * API Route: Send Booking Confirmation Emails
 * 
 * Uses Brevo transactional email API (via ~/lib/email).
 * Called from ManualCal.tsx for free session booking confirmations.
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

interface SendBookingEmailRequest {
  type: 'tutor' | 'student' | 'both';
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
    const { type, params } = req.body as SendBookingEmailRequest;

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
      'meetingLink',
    ];

    for (const field of requiredFields) {
      if (!params[field as keyof typeof params]) {
        return res.status(400).json({ success: false, error: `Missing required field: ${field}` });
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
      meetingLink: params.meetingLink,
      calendarLink: params.calendarLink,
    };

    const results: SendBookingEmailResponse = { success: true };

    if (type === 'tutor' || type === 'both') {
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

    if (tutorFailed ?? studentFailed) {
      results.success = false;
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
