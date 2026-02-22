/**
 * Booking Confirmation Email Templates
 * 
 * HTML email templates for tutor and student booking confirmations.
 * These replace the EmailJS templates: template_z7etjno and template_gvkyabt
 */

export interface BookingConfirmationParams {
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
}

/**
 * Common email styles
 */
const emailStyles = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
  }
  .header {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    padding: 30px;
    border-radius: 12px 12px 0 0;
    text-align: center;
  }
  .header h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
  }
  .content {
    background: #ffffff;
    padding: 30px;
    border: 1px solid #e5e7eb;
    border-top: none;
    border-radius: 0 0 12px 12px;
  }
  .detail-row {
    display: flex;
    padding: 12px 0;
    border-bottom: 1px solid #f3f4f6;
  }
  .detail-label {
    font-weight: 600;
    color: #6b7280;
    width: 120px;
    flex-shrink: 0;
  }
  .detail-value {
    color: #111827;
  }
  .meeting-link {
    display: inline-block;
    background: #6366f1;
    color: white !important;
    padding: 12px 24px;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    margin: 20px 0;
  }
  .footer {
    text-align: center;
    padding: 20px;
    color: #9ca3af;
    font-size: 14px;
  }
  .footer a {
    color: #6366f1;
    text-decoration: none;
  }
`;

/**
 * Generate the tutor booking confirmation email
 */
export function tutorBookingConfirmationEmail(params: BookingConfirmationParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `New Tutoring Session Booked with ${params.studentName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>${emailStyles}</style>
</head>
<body>
  <div class="header">
    <h1>📚 New Session Booked!</h1>
  </div>
  <div class="content">
    <p>Hi ${params.tutorName},</p>
    <p>Great news! A student has booked a tutoring session with you.</p>
    
    <h3 style="margin-top: 24px; color: #374151;">Session Details</h3>
    
    <table style="width: 100%; border-collapse: collapse;">
      <tr class="detail-row">
        <td class="detail-label">Student</td>
        <td class="detail-value">${params.studentName}</td>
      </tr>
      <tr class="detail-row">
        <td class="detail-label">Date</td>
        <td class="detail-value">${params.date}</td>
      </tr>
      <tr class="detail-row">
        <td class="detail-label">Time</td>
        <td class="detail-value">${params.startTime} - ${params.endTime} (${params.timeZone})</td>
      </tr>
      <tr class="detail-row">
        <td class="detail-label">Student Email</td>
        <td class="detail-value"><a href="mailto:${params.studentEmail}">${params.studentEmail}</a></td>
      </tr>
      <tr class="detail-row">
        <td class="detail-label">Meeting Link</td>
        <td class="detail-value">${params.meetingLink !== 'N/A' ? `<a href="${params.meetingLink}">${params.meetingLink}</a>` : 'N/A'}</td>
      </tr>
    </table>

    ${params.meetingLink && params.meetingLink !== 'N/A' ? `
    <div style="text-align: center; margin-top: 24px;">
      <a href="${params.meetingLink}" class="meeting-link">Join Meeting</a>
    </div>
    ` : ''}

    ${params.calendarLink ? `
    <div style="text-align: center; margin-top: 12px;">
      <p style="color: #6b7280; font-size: 14px;">📅 A Google Calendar invitation has been sent to your email.</p>
    </div>
    ` : ''}

    <p style="margin-top: 24px;">Please be ready a few minutes before the scheduled time. If you need to reschedule or cancel, please contact the student directly.</p>
  </div>
  <div class="footer">
    <p>Pathway Tutors</p>
    <p><a href="https://pathwaytutors.com">pathwaytutors.com</a></p>
  </div>
</body>
</html>
`;

  const text = `
New Tutoring Session Booked!

Hi ${params.tutorName},

Great news! A student has booked a tutoring session with you.

SESSION DETAILS
---------------
Student: ${params.studentName}
Date: ${params.date}
Time: ${params.startTime} - ${params.endTime} (${params.timeZone})
Student Email: ${params.studentEmail}
Meeting Link: ${params.meetingLink}
${params.calendarLink ? `A Google Calendar invitation has been sent to your email.` : ''}

Please be ready a few minutes before the scheduled time. If you need to reschedule or cancel, please contact the student directly.

---
Pathway Tutors
https://pathwaytutors.com
`;

  return { subject, html, text };
}

/**
 * Generate the student booking confirmation email
 */
export function studentBookingConfirmationEmail(params: BookingConfirmationParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Your Tutoring Session with ${params.tutorName} is Confirmed!`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>${emailStyles}</style>
</head>
<body>
  <div class="header">
    <h1>🎉 Session Confirmed!</h1>
  </div>
  <div class="content">
    <p>Hi ${params.studentName},</p>
    <p>Your tutoring session has been confirmed! Here are the details:</p>
    
    <h3 style="margin-top: 24px; color: #374151;">Session Details</h3>
    
    <table style="width: 100%; border-collapse: collapse;">
      <tr class="detail-row">
        <td class="detail-label">Tutor</td>
        <td class="detail-value">${params.tutorName}</td>
      </tr>
      <tr class="detail-row">
        <td class="detail-label">Date</td>
        <td class="detail-value">${params.date}</td>
      </tr>
      <tr class="detail-row">
        <td class="detail-label">Time</td>
        <td class="detail-value">${params.startTime} - ${params.endTime} (${params.timeZone})</td>
      </tr>
      <tr class="detail-row">
        <td class="detail-label">Tutor Email</td>
        <td class="detail-value"><a href="mailto:${params.tutorEmail}">${params.tutorEmail}</a></td>
      </tr>
      <tr class="detail-row">
        <td class="detail-label">Meeting Link</td>
        <td class="detail-value">${params.meetingLink !== 'N/A' ? `<a href="${params.meetingLink}">${params.meetingLink}</a>` : 'N/A'}</td>
      </tr>
    </table>

    ${params.meetingLink && params.meetingLink !== 'N/A' ? `
    <div style="text-align: center; margin-top: 24px;">
      <a href="${params.meetingLink}" class="meeting-link">Join Meeting</a>
    </div>
    ` : ''}

    ${params.calendarLink ? `
    <div style="text-align: center; margin-top: 12px;">
      <p style="color: #6b7280; font-size: 14px;">📅 A Google Calendar invitation has been sent to your email.</p>
    </div>
    ` : ''}

    <p style="margin-top: 24px;">Please join the meeting a few minutes early. If you have any questions before the session, feel free to email your tutor.</p>
    
    <p>We hope you have a great learning session!</p>
  </div>
  <div class="footer">
    <p>Pathway Tutors</p>
    <p><a href="https://pathwaytutors.com">pathwaytutors.com</a></p>
  </div>
</body>
</html>
`;

  const text = `
Your Tutoring Session is Confirmed!

Hi ${params.studentName},

Your tutoring session has been confirmed! Here are the details:

SESSION DETAILS
---------------
Tutor: ${params.tutorName}
Date: ${params.date}
Time: ${params.startTime} - ${params.endTime} (${params.timeZone})
Tutor Email: ${params.tutorEmail}
Meeting Link: ${params.meetingLink}
${params.calendarLink ? `A Google Calendar invitation has been sent to your email.` : ''}

Please join the meeting a few minutes early. If you have any questions before the session, feel free to email your tutor.

We hope you have a great learning session!

---
Pathway Tutors
https://pathwaytutors.com
`;

  return { subject, html, text };
}
