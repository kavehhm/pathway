/**
 * Email Module Index
 * 
 * Main export file for the email sending system.
 * Uses Amazon SES for transactional emails.
 */

export { sendEmail, sendEmails, type SendEmailParams, type SendEmailResult } from './sendEmail';
export { getSESClient, emailConfig } from './sesClient';
export * from './templates';
