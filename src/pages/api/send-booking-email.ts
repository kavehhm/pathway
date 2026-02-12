/**
 * API Route: Send Booking Confirmation Emails
 * 
 * TEMPORARILY DISABLED - Amazon SES is in sandbox mode.
 * Using EmailJS on the client side until SES production access is granted.
 * 
 * To re-enable: uncomment the SES implementation below and remove the stub response.
 * 
 * POST /api/send-booking-email
 */

import type { NextApiRequest, NextApiResponse } from 'next';

// Amazon SES imports commented out until production access is granted
// import { sendEmail } from '~/lib/email';
// import {
//   tutorBookingConfirmationEmail,
//   studentBookingConfirmationEmail,
//   type BookingConfirmationParams,
// } from '~/lib/email/templates';

// interface SendBookingEmailRequest {
//   type: 'tutor' | 'student' | 'both';
//   params: {
//     tutorName: string;
//     studentName: string;
//     date: string;
//     startTime: string;
//     endTime: string;
//     timeZone: string;
//     studentEmail: string;
//     tutorEmail: string;
//     meetingLink: string;
//     calendarLink?: string;
//   };
// }

interface SendBookingEmailResponse {
  success: boolean;
  tutorEmail?: { success: boolean; error?: string };
  studentEmail?: { success: boolean; error?: string };
  error?: string;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<SendBookingEmailResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  // SES is currently in sandbox mode - emails are sent via EmailJS on the client side
  // Return a message indicating this endpoint is temporarily disabled
  return res.status(200).json({
    success: true,
    error: 'SES endpoint temporarily disabled - using EmailJS on client side',
  });

  // ---- Original SES implementation (uncomment when SES production access is granted) ----
  // try {
  //   const { type, params } = req.body as SendBookingEmailRequest;
  //
  //   // Validate required fields
  //   if (!type || !params) {
  //     return res.status(400).json({ success: false, error: 'Missing type or params' });
  //   }
  //
  //   const requiredFields = [
  //     'tutorName',
  //     'studentName',
  //     'date',
  //     'startTime',
  //     'endTime',
  //     'timeZone',
  //     'studentEmail',
  //     'tutorEmail',
  //     'meetingLink',
  //   ];
  //
  //   for (const field of requiredFields) {
  //     if (!params[field as keyof typeof params]) {
  //       return res.status(400).json({ success: false, error: `Missing required field: ${field}` });
  //     }
  //   }
  //
  //   const emailParams: BookingConfirmationParams = {
  //     tutorName: params.tutorName,
  //     studentName: params.studentName,
  //     date: params.date,
  //     startTime: params.startTime,
  //     endTime: params.endTime,
  //     timeZone: params.timeZone,
  //     studentEmail: params.studentEmail,
  //     tutorEmail: params.tutorEmail,
  //     meetingLink: params.meetingLink,
  //     calendarLink: params.calendarLink,
  //   };
  //
  //   const results: SendBookingEmailResponse = { success: true };
  //
  //   // Send tutor email
  //   if (type === 'tutor' || type === 'both') {
  //     const tutorTemplate = tutorBookingConfirmationEmail(emailParams);
  //     const tutorResult = await sendEmail({
  //       to: params.tutorEmail,
  //       subject: tutorTemplate.subject,
  //       html: tutorTemplate.html,
  //       text: tutorTemplate.text,
  //     });
  //     results.tutorEmail = tutorResult;
  //     console.log(`Tutor email to ${params.tutorEmail}: ${tutorResult.success ? 'sent' : 'failed'}`);
  //   }
  //
  //   // Send student email
  //   if (type === 'student' || type === 'both') {
  //     const studentTemplate = studentBookingConfirmationEmail(emailParams);
  //     const studentResult = await sendEmail({
  //       to: params.studentEmail,
  //       subject: studentTemplate.subject,
  //       html: studentTemplate.html,
  //       text: studentTemplate.text,
  //     });
  //     results.studentEmail = studentResult;
  //     console.log(`Student email to ${params.studentEmail}: ${studentResult.success ? 'sent' : 'failed'}`);
  //   }
  //
  //   // Check if any emails failed
  //   const tutorFailed = results.tutorEmail && !results.tutorEmail.success;
  //   const studentFailed = results.studentEmail && !results.studentEmail.success;
  //   
  //   if (tutorFailed || studentFailed) {
  //     results.success = false;
  //   }
  //
  //   return res.status(200).json(results);
  // } catch (error: any) {
  //   console.error('Error in send-booking-email API:', error);
  //   return res.status(500).json({
  //     success: false,
  //     error: error.message || 'Internal server error',
  //   });
  // }
}
