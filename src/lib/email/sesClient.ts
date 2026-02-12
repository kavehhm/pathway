/**
 * Amazon SES Client Configuration
 * 
 * Creates and exports a configured SES client for sending transactional emails.
 * This module should only be imported on the server side.
 */

import { SESClient } from '@aws-sdk/client-ses';

// Validate required environment variables
function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Lazy initialization to avoid errors during build time
let sesClientInstance: SESClient | null = null;

/**
 * Get the SES client instance (singleton pattern)
 * Lazily initialized to avoid build-time errors when env vars aren't set
 */
export function getSESClient(): SESClient {
  if (!sesClientInstance) {
    const region = getRequiredEnvVar('AWS_REGION');
    const accessKeyId = getRequiredEnvVar('AWS_ACCESS_KEY_ID');
    const secretAccessKey = getRequiredEnvVar('AWS_SECRET_ACCESS_KEY');

    sesClientInstance = new SESClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return sesClientInstance;
}

/**
 * Email configuration from environment variables
 */
export const emailConfig = {
  get fromAddress(): string {
    return process.env.SES_FROM_ADDRESS || 'noreply@pathwaytutors.com';
  },
  get replyToAddress(): string {
    return process.env.SES_REPLY_TO_ADDRESS || 'support@pathwaytutors.com';
  },
};
