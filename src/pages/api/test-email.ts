/**
 * Test Email Endpoint
 * 
 * A safe endpoint to test SES email sending.
 * Only enabled in development OR when ADMIN_TEST_TOKEN is provided.
 * 
 * GET /api/test-email?to=test@example.com&token=your-admin-token
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { sendEmail } from '~/lib/email';

const isTestEnabled = 
  process.env.NODE_ENV === 'development' || 
  !!process.env.ADMIN_TEST_TOKEN;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET for simplicity
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Check if testing is enabled
  if (!isTestEnabled) {
    return res.status(403).json({
      error: 'Test endpoint disabled in production',
      hint: 'Set ADMIN_TEST_TOKEN environment variable to enable',
    });
  }

  // In production, require the admin token
  if (process.env.NODE_ENV === 'production') {
    const providedToken = req.query.token as string;
    const expectedToken = process.env.ADMIN_TEST_TOKEN;

    if (!providedToken || providedToken !== expectedToken) {
      return res.status(401).json({ error: 'Invalid or missing token' });
    }
  }

  // Get recipient email from query
  const to = req.query.to as string;
  if (!to) {
    return res.status(400).json({
      error: 'Missing "to" query parameter',
      usage: '/api/test-email?to=your@email.com',
    });
  }

  // Validate email format (basic check)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    const result = await sendEmail({
      to,
      subject: 'Pathway Tutors - SES Test Email',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Test Email</title>
</head>
<body style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 12px; text-align: center;">
    <h1 style="margin: 0;">✅ SES Test Successful!</h1>
  </div>
  <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p>This is a test email from Pathway Tutors.</p>
    <p>If you received this, Amazon SES is configured correctly!</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
    <p style="color: #6b7280; font-size: 14px;">
      Sent at: ${new Date().toISOString()}<br>
      To: ${to}
    </p>
  </div>
</body>
</html>
`,
      text: `SES Test Successful!\n\nThis is a test email from Pathway Tutors.\nIf you received this, Amazon SES is configured correctly!\n\nSent at: ${new Date().toISOString()}\nTo: ${to}`,
    });

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: `Test email sent to ${to}`,
        messageId: result.messageId,
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error,
        hint: 'Check AWS credentials and SES configuration',
      });
    }
  } catch (error: any) {
    console.error('Test email error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Check AWS credentials and SES configuration',
    });
  }
}
