/**
 * Email Sending Utility using Amazon SES
 * 
 * Provides a simple interface for sending transactional emails.
 * Handles both HTML and plain text content.
 */

import { SendEmailCommand, type SendEmailCommandInput } from '@aws-sdk/client-ses';
import { getSESClient, emailConfig } from './sesClient';

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

/**
 * Strip HTML tags to create a plain text version
 */
function htmlToPlainText(html: string): string {
  return html
    // Replace <br> and </p> with newlines
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    // Remove all other HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Trim extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Send an email using Amazon SES
 * 
 * @param params Email parameters (to, subject, html, text?, replyTo?)
 * @returns Result object with success status and optional error
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { to, subject, html, text, replyTo, from } = params;

  // Convert single recipient to array
  const toAddresses = Array.isArray(to) ? to : [to];

  // Generate plain text from HTML if not provided
  const plainText = text ?? htmlToPlainText(html);

  const emailParams: SendEmailCommandInput = {
    Source: from ?? emailConfig.fromAddress,
    Destination: {
      ToAddresses: toAddresses,
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: html,
          Charset: 'UTF-8',
        },
        Text: {
          Data: plainText,
          Charset: 'UTF-8',
        },
      },
    },
    ReplyToAddresses: [replyTo ?? emailConfig.replyToAddress],
  };

  try {
    const client = getSESClient();
    const command = new SendEmailCommand(emailParams);
    const response = await client.send(command);

    console.log(`Email sent successfully to ${toAddresses.join(', ')}. MessageId: ${response.MessageId}`);

    return {
      success: true,
      messageId: response.MessageId,
    };
  } catch (error: any) {
    console.error(`Failed to send email to ${toAddresses.join(', ')}:`, error);

    return {
      success: false,
      error: error.message || 'Unknown error occurred',
    };
  }
}

/**
 * Send multiple emails in parallel
 * 
 * @param emails Array of email parameters
 * @returns Array of results for each email
 */
export async function sendEmails(emails: SendEmailParams[]): Promise<SendEmailResult[]> {
  return Promise.all(emails.map(sendEmail));
}
