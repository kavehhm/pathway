/**
 * EDU Email Verification Template
 * 
 * NOTE: This template is currently NOT IMPLEMENTED.
 * The .edu verification email functionality will be added in a future update.
 * 
 * This replaces EmailJS template: template_edu_verify
 */

/*
export interface EduVerificationParams {
  verificationCode: string;
  recipientEmail: string;
}

export function eduVerificationEmail(params: EduVerificationParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = 'Pathway Tutors - Verify Your .edu Email';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
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
    .content {
      background: #ffffff;
      padding: 30px;
      border: 1px solid #e5e7eb;
      border-top: none;
      border-radius: 0 0 12px 12px;
    }
    .code-box {
      background: #f3f4f6;
      border: 2px dashed #6366f1;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      margin: 24px 0;
    }
    .code {
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 8px;
      color: #6366f1;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #9ca3af;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎓 Verify Your Email</h1>
  </div>
  <div class="content">
    <p>You're verifying your .edu email address for Pathway Tutors.</p>
    <p>Enter this verification code to complete your verification:</p>
    
    <div class="code-box">
      <div class="code">${params.verificationCode}</div>
    </div>

    <p>This code will expire in 15 minutes.</p>
    <p>If you didn't request this verification, you can safely ignore this email.</p>
  </div>
  <div class="footer">
    <p>Pathway Tutors</p>
  </div>
</body>
</html>
`;

  const text = `
Verify Your .edu Email - Pathway Tutors

You're verifying your .edu email address for Pathway Tutors.

Your verification code is: ${params.verificationCode}

This code will expire in 15 minutes.

If you didn't request this verification, you can safely ignore this email.

---
Pathway Tutors
`;

  return { subject, html, text };
}
*/

// Placeholder export to prevent import errors
export const EDU_VERIFICATION_NOT_IMPLEMENTED = true;
