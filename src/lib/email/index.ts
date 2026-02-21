/**
 * Email Module Index
 * 
 * Main export file for the email sending system.
 * Uses Brevo for transactional emails.
 */

export { sendEmail, sendEmails, type SendEmailParams, type SendEmailResult } from './sendEmail';
export * from './templates';
