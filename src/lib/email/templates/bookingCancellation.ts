export interface StudentBookingCancelledByTutorParams {
  studentName: string;
  tutorName: string;
  date: string;
  startTime: string;
  endTime: string;
  timeZone: string;
  rescheduleUrl: string;
  refundUrl: string;
  refundAvailable: boolean;
}

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
    background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
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
    padding: 10px 0;
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
  .actions {
    margin-top: 24px;
    text-align: center;
  }
  .button {
    display: inline-block;
    padding: 12px 18px;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    margin: 8px;
  }
  .button-primary {
    background: #2563eb;
    color: #fff !important;
  }
  .button-danger {
    background: #dc2626;
    color: #fff !important;
  }
  .footer {
    text-align: center;
    padding: 20px;
    color: #9ca3af;
    font-size: 14px;
  }
`;

export function studentBookingCancelledByTutorEmail(params: StudentBookingCancelledByTutorParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Session update: ${params.tutorName} had to cancel`;

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
    <h1>Session Cancelled</h1>
  </div>

  <div class="content">
    <p>Hi ${params.studentName},</p>
    <p>Your tutor ${params.tutorName} let us know they can no longer make your scheduled session.</p>

    <h3 style="margin-top: 24px; color: #374151;">Original Session Details</h3>
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
    </table>

    <p style="margin-top: 20px;">Choose what you want to do next:</p>

    <div class="actions">
      <a href="${params.rescheduleUrl}" class="button button-primary">Reschedule Session</a>
      ${params.refundAvailable ? `<a href="${params.refundUrl}" class="button button-danger">Request Refund</a>` : ''}
    </div>

    <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
      Rescheduling keeps your existing booking details and payment on file. You only need to pick a new date and time.
    </p>
  </div>

  <div class="footer">
    <p>Pathway Tutors</p>
    <p><a href="https://pathwaytutors.com">pathwaytutors.com</a></p>
  </div>
</body>
</html>
`;

  const text = `
Session Cancelled

Hi ${params.studentName},

Your tutor ${params.tutorName} can no longer make your scheduled session.

Original Session Details
-----------------------
Tutor: ${params.tutorName}
Date: ${params.date}
Time: ${params.startTime} - ${params.endTime} (${params.timeZone})

Reschedule your session:
${params.rescheduleUrl}

${params.refundAvailable ? `Request a refund:\n${params.refundUrl}\n` : ''}
Rescheduling keeps your existing booking details and payment on file. You only need to choose a new date/time.

---
Pathway Tutors
https://pathwaytutors.com
`;

  return { subject, html, text };
}
