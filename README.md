# Create T3 App

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`.

## What's next? How do I make an app with this?

We try to keep this project as simple as possible, so you can start with just the scaffolding we set up for you, and add additional things later when they become necessary.

If you are not familiar with the different technologies used in this project, please refer to the respective docs. If you still are in the wind, please join our [Discord](https://t3.gg/discord) and ask for help.

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

You can check out the [create-t3-app GitHub repository](https://github.com/t3-oss/create-t3-app) — your feedback and contributions are welcome!

## How do I deploy this?

Follow our deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) for more information.
# pathway

## Stripe Integration

This project includes Stripe payment integration for booking tutoring sessions. To set up Stripe:

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from the Stripe Dashboard
3. Create a `.env` file in the root directory with the following variables:

```env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

4. Replace the placeholder values with your actual Stripe API keys
5. For production, use the live keys instead of test keys

### Payment Flow

1. User selects a date and time for tutoring
2. Clicks "Book Now" to proceed to payment
3. Enters payment information using Stripe Elements
4. Payment is processed through Stripe
5. On successful payment, the booking is created in the database
6. User receives confirmation and the booked time is marked as unavailable

## Google Calendar/Meet Integration

This project automatically creates Google Calendar events with Google Meet links when a booking is confirmed after Stripe payment.

### How It Works

1. After successful Stripe payment, the webhook handler creates a Google Calendar event
2. A Google Meet link is automatically generated and added to the event
3. Both tutor and student are added as attendees and receive calendar invites
4. If the tutor has provided their own meeting link (Zoom, etc.), that link is used instead of Google Meet
5. Confirmation emails are sent with the meeting link

### Prerequisites

- A Google Workspace account (e.g., noreply@pathwaytutors.com) to act as the calendar organizer
- Google Cloud project with Calendar API enabled

### Setup Instructions

#### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Calendar API**:
   - Go to APIs & Services > Library
   - Search for "Google Calendar API"
   - Click Enable

#### 2. Create OAuth 2.0 Credentials

1. Go to APIs & Services > Credentials
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application" as the application type
4. Add **ALL** of these authorized redirect URIs:
   - `https://developers.google.com/oauthplayground` ← **REQUIRED for getting refresh token**
   - `https://pathwaytutors.com/api/auth/google/callback` (production)
   - `http://localhost:3000/api/auth/google/callback` (development)
5. Save the Client ID and Client Secret

> **Important:** The OAuth Playground URI must be added BEFORE you try to authorize!

#### 3. Generate a Refresh Token

You need a refresh token for the Workspace organizer account (noreply@pathwaytutors.com). This is a one-time process:

**Using OAuth 2.0 Playground (Recommended):**

1. Go to [https://developers.google.com/oauthplayground](https://developers.google.com/oauthplayground)
2. Click the **gear icon** (⚙️) in the top-right corner
3. Check **"Use your own OAuth credentials"**
4. Enter your **Client ID** and **Client Secret** from step 2
5. Close the settings panel
6. In **Step 1** (Select & authorize APIs), find and select:
   - `Google Calendar API v3` → `https://www.googleapis.com/auth/calendar`
   - `Google Calendar API v3` → `https://www.googleapis.com/auth/calendar.events`
7. Click **"Authorize APIs"**
8. Sign in with **noreply@pathwaytutors.com** (the Workspace organizer account)
9. Grant the requested permissions
10. In **Step 2**, click **"Exchange authorization code for tokens"**
11. Copy the **refresh_token** from the response (it's a long string starting with `1//`)

> **Troubleshooting `redirect_uri_mismatch`:** Make sure you added `https://developers.google.com/oauthplayground` to your OAuth credentials' Authorized Redirect URIs in Google Cloud Console. Changes may take a few minutes to propagate.

#### 4. Configure Environment Variables

Add these to your `.env` file:

```env
# Google Calendar API (for automatic Meet link generation)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REFRESH_TOKEN=your_refresh_token_here
GOOGLE_REDIRECT_URI=https://pathwaytutors.com/api/auth/google/callback
GOOGLE_CALENDAR_ID=primary  # or the specific calendar ID
```

#### 5. Configure Google Workspace Settings

To allow attendees to join Google Meet without the organizer:

1. Go to [Google Admin Console](https://admin.google.com/) (requires Workspace admin access)
2. Navigate to Apps > Google Workspace > Google Meet
3. Under "Video calls", find "Host management"
4. Disable "Only organizers can start the meeting" or enable "Allow participants to join before host"

Alternatively, in the individual Google Calendar account settings:
1. Open Google Calendar (as the organizer account)
2. Go to Settings > Event settings
3. Look for default guest permissions

### Tutor Meeting Links

- Tutors can optionally provide their own meeting link (Zoom, Google Meet, etc.) in their profile
- If no valid meeting link is provided, a Google Meet link is automatically generated
- A valid meeting link must be a proper URL (e.g., `https://zoom.us/j/123456789`)
- Text like "Google meets" without a URL is not valid and will trigger auto-generation

### Database Migration

Run the migration to add calendar fields to the Booking table:

```bash
npx prisma migrate deploy
# or
npx prisma db push
```

### Testing

In development, you can test the calendar integration:

```bash
# POST to the test endpoint
curl -X POST http://localhost:3000/api/test-calendar \
  -H "Content-Type: application/json" \
  -d '{
    "tutorEmail": "tutor@example.com",
    "tutorName": "John Tutor",
    "studentEmail": "student@example.com",
    "studentName": "Jane Student",
    "date": "2026-02-10",
    "time": "2:00 PM",
    "timezone": "America/Los_Angeles"
  }'
```

### Troubleshooting

- **401 Authentication Error**: Refresh token may be expired. Generate a new one.
- **403 Forbidden**: Check that Calendar API is enabled and account has permission.
- **No Meet link generated**: Ensure `conferenceDataVersion: 1` is set in the API call.
- **Webhook failures**: Check Vercel function logs for detailed error messages.

## Amazon SES Email Integration

All transactional emails (booking confirmations, notifications) are sent via Amazon SES.

### Setup Amazon SES

#### 1. Create an AWS Account

If you don't have one, create an account at [aws.amazon.com](https://aws.amazon.com/).

#### 2. Verify Your Domain/Email in SES

1. Go to the [Amazon SES Console](https://console.aws.amazon.com/ses/)
2. Select a region (e.g., `us-east-1`)
3. Go to **Verified identities** → **Create identity**
4. Choose **Domain** and enter `pathwaytutors.com`
5. Follow the instructions to add DNS records (DKIM, SPF)
   - **DKIM**: Add the CNAME records provided by SES
   - **SPF**: Add a TXT record: `v=spf1 include:amazonses.com ~all`
   - **DMARC** (recommended): Add a TXT record: `_dmarc.pathwaytutors.com` → `v=DMARC1; p=quarantine; rua=mailto:dmarc@pathwaytutors.com`
6. Wait for verification (usually a few minutes to hours)

#### 3. Move Out of Sandbox (Production)

By default, SES is in sandbox mode and can only send to verified emails.

1. Go to **Account dashboard** in SES Console
2. Click **Request production access**
3. Fill out the form explaining your use case (transactional booking confirmations)
4. Wait for approval (usually 24-48 hours)

#### 4. Create IAM Credentials

1. Go to [IAM Console](https://console.aws.amazon.com/iam/)
2. Create a new user or use an existing one
3. Attach the policy `AmazonSESFullAccess` (or create a custom policy with `ses:SendEmail`)
4. Generate access keys

#### 5. Configure Environment Variables

Add these to your `.env` file:

```env
# Amazon SES Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
SES_FROM_ADDRESS=noreply@pathwaytutors.com
SES_REPLY_TO_ADDRESS=support@pathwaytutors.com
```

### Testing SES

In development, you can test email sending:

```bash
# GET request to test endpoint
curl "http://localhost:3000/api/test-email?to=your@email.com"

# In production (requires ADMIN_TEST_TOKEN)
curl "https://pathwaytutors.com/api/test-email?to=your@email.com&token=your_admin_token"
```

### Email Templates

Email templates are defined in `src/lib/email/templates/`:

- `bookingConfirmation.ts` - Tutor and student booking confirmation emails

### Troubleshooting SES

- **"Email address is not verified"**: You're in sandbox mode. Either verify the recipient email or request production access.
- **"Access Denied"**: Check IAM permissions for the AWS credentials.
- **"MessageRejected"**: Check that the FROM address domain is verified.
- **Emails going to spam**: Ensure DKIM, SPF, and DMARC are properly configured.
