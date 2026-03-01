/**
 * Server-side Email Sending for Booking Confirmations
 * 
 * Uses Brevo transactional API to send emails from the server.
 * This allows sending confirmation emails from webhooks (after calendar creation).
 */

import { sendEmail } from './email';
import {
  tutorBookingConfirmationEmail,
  studentBookingConfirmationEmail,
} from './email/templates';

export interface BookingEmailParams {
  tutorName: string;
  studentName: string;
  tutorEmail: string;
  studentEmail: string;
  date: string;
  startTime: string;
  endTime: string;
  tutorTimezone: string;
  studentTimezone: string;
  meetingLink: string | null;
  calendarLink?: string | null;
  tutorCancelUrl?: string | null;
}

/**
 * Parse a 12-hour time string to minutes since midnight
 */
function parse12HourTimeToMinutes(timeStr: string): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  const hours = parseInt(match[1] ?? '0', 10);
  const minutes = parseInt(match[2] ?? '0', 10);
  const period = (match[3] ?? 'AM').toUpperCase();
  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
    return null;
  }
  let hour24 = hours % 12;
  if (period === 'PM') hour24 += 12;
  return hour24 * 60 + minutes;
}

/**
 * Format minutes since midnight to 12-hour time string
 */
function formatMinutesTo12Hour(totalMinutes: number): string {
  const minutesNormalized = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  let hours24 = Math.floor(minutesNormalized / 60);
  const minutes = minutesNormalized % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  if (hours24 === 0) hours24 = 12;
  if (hours24 > 12) hours24 -= 12;
  const minutesStr = minutes.toString().padStart(2, '0');
  return `${hours24}:${minutesStr} ${period}`;
}

/**
 * Calculate end time (1 hour after start time)
 */
export function calculateEndTime(startTime: string): string {
  const startMinutes = parse12HourTimeToMinutes(startTime);
  if (startMinutes === null) {
    console.error('Failed to parse start time:', startTime);
    return startTime; // Fallback
  }
  const endMinutes = startMinutes + 60; // Add 1 hour
  return formatMinutesTo12Hour(endMinutes);
}

/**
 * Send booking confirmation emails to both tutor and student
 * 
 * @param params Booking details for the email
 * @returns Object with success status for each email
 */
export async function sendBookingConfirmationEmails(
  params: BookingEmailParams
): Promise<{ tutorEmail: { success: boolean; error?: string }; studentEmail: { success: boolean; error?: string } }> {
  const meetingLinkDisplay = params.meetingLink ?? 'N/A';

  // Prepare tutor email (in tutor's timezone)
  const tutorTemplate = tutorBookingConfirmationEmail({
    tutorName: params.tutorName,
    studentName: params.studentName,
    date: params.date,
    startTime: params.startTime,
    endTime: params.endTime,
    timeZone: params.tutorTimezone,
    studentEmail: params.studentEmail,
    tutorEmail: params.tutorEmail,
    meetingLink: meetingLinkDisplay,
    calendarLink: params.calendarLink ?? undefined,
    tutorCancelUrl: params.tutorCancelUrl ?? undefined,
  });

  // Prepare student email (in student's timezone)
  const studentTemplate = studentBookingConfirmationEmail({
    tutorName: params.tutorName,
    studentName: params.studentName,
    date: params.date,
    startTime: params.startTime,
    endTime: params.endTime,
    timeZone: params.studentTimezone,
    studentEmail: params.studentEmail,
    tutorEmail: params.tutorEmail,
    meetingLink: meetingLinkDisplay,
    calendarLink: params.calendarLink ?? undefined,
  });

  console.log('Sending booking confirmation emails via Brevo...');
  console.log('Tutor:', params.tutorEmail);
  console.log('Student:', params.studentEmail);

  // Send both emails in parallel
  const [tutorResult, studentResult] = await Promise.all([
    sendEmail({
      to: params.tutorEmail,
      subject: tutorTemplate.subject,
      html: tutorTemplate.html,
      text: tutorTemplate.text,
    }),
    sendEmail({
      to: params.studentEmail,
      subject: studentTemplate.subject,
      html: studentTemplate.html,
      text: studentTemplate.text,
    }),
  ]);

  return {
    tutorEmail: tutorResult,
    studentEmail: studentResult,
  };
}

/**
 * Send a scheduling failure notification to admin
 */
export async function sendSchedulingFailureNotification(
  bookingId: string,
  tutorName: string,
  studentName: string,
  error: string
): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'support@pathwaytutors.com';

  console.error(`Scheduling failed for booking ${bookingId}:`, error);
  console.error(`Tutor: ${tutorName}, Student: ${studentName}`);

  try {
    await sendEmail({
      to: adminEmail,
      subject: `[Alert] Scheduling Failed for Booking ${bookingId}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; padding: 20px;">
  <h2 style="color: #dc2626;">⚠️ Scheduling Failed</h2>
  <p><strong>Booking ID:</strong> ${bookingId}</p>
  <p><strong>Tutor:</strong> ${tutorName}</p>
  <p><strong>Student:</strong> ${studentName}</p>
  <p><strong>Error:</strong></p>
  <pre style="background: #f3f4f6; padding: 12px; border-radius: 6px; overflow-x: auto;">${error}</pre>
  <p>Please investigate and manually create the calendar event if needed.</p>
</body>
</html>
`,
      text: `Scheduling Failed\n\nBooking ID: ${bookingId}\nTutor: ${tutorName}\nStudent: ${studentName}\nError: ${error}`,
    });
    console.log(`Admin notification sent to ${adminEmail}`);
  } catch (emailError: any) {
    console.error(`Failed to send admin notification:`, emailError);
  }
}
