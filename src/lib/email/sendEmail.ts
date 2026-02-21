/**
 * Email Sending Utility using Brevo (formerly Sendinblue)
 * 
 * Uses Brevo's transactional email API (not marketing campaigns).
 * No extra npm package required -- uses the REST API directly via fetch.
 */

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  from?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { to, subject, html, text, replyTo, from } = params;

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('Missing BREVO_API_KEY environment variable');
    return { success: false, error: 'Missing BREVO_API_KEY' };
  }

  const toAddresses = Array.isArray(to) ? to : [to];
  const plainText = text ?? htmlToPlainText(html);

  const senderEmail = from ?? process.env.BREVO_SENDER_EMAIL ?? 'noreply@pathwaytutors.com';
  const senderName = process.env.BREVO_SENDER_NAME ?? 'Pathway Tutors';

  const body: Record<string, unknown> = {
    sender: { name: senderName, email: senderEmail },
    to: toAddresses.map((email) => ({ email })),
    subject,
    htmlContent: html,
    textContent: plainText,
  };

  if (replyTo) {
    body.replyTo = { email: replyTo };
  }

  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = (errorData as Record<string, unknown>)?.message as string | undefined ?? `HTTP ${response.status}`;
      console.error(`Brevo API error for ${toAddresses.join(', ')}:`, errorMsg);
      return { success: false, error: errorMsg };
    }

    const data = (await response.json()) as { messageId?: string };
    console.log(`Email sent via Brevo to ${toAddresses.join(', ')}. MessageId: ${data.messageId}`);

    return { success: true, messageId: data.messageId };
  } catch (error: any) {
    console.error(`Failed to send email to ${toAddresses.join(', ')}:`, error);
    return { success: false, error: error.message ?? 'Unknown error occurred' };
  }
}

export async function sendEmails(emails: SendEmailParams[]): Promise<SendEmailResult[]> {
  return Promise.all(emails.map(sendEmail));
}
