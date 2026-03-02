# Pathway Tutors

Pathway Tutors is a tutor marketplace built with Next.js, tRPC, Prisma, Clerk, and Stripe.

## What Is Active

- Tutor discovery and profile filtering (school, major, subjects, courses, pricing, career tags)
- Booking + payment with Stripe Payment Intents
- Stripe Connect onboarding + mentor wallet and withdraw flow
- Google Calendar event creation with Google Meet fallback when tutors do not provide their own meeting URL
- Transactional email delivery through Brevo (booking confirmations and booking action emails)
- Tokenized booking action flows:
  - Tutor cancellation link
  - Student reschedule link
  - Student refund link
- Clerk webhook user sync (`/api/webhooks`)
- Admin dashboard metrics and mentor payout visibility (`/admin`)

## Tech Stack

- Next.js 14 (Pages Router)
- TypeScript
- tRPC
- Prisma + PostgreSQL
- Clerk authentication
- Stripe + Stripe Connect
- Brevo transactional email API
- Google Calendar API (OAuth2 refresh token flow)
- Tailwind CSS

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create your local env file:

```bash
cp .env.example .env
```

3. Fill in all required environment variables (see below).

4. Apply database schema:

```bash
npx prisma migrate deploy
# or for local iteration
npx prisma db push
```

5. Run development server:

```bash
npm run dev
```

## Required Environment Variables

Set these in `.env` before running the app.

### Core

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?schema=public"
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Clerk

```env
CLERK_SECRET_KEY="sk_..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/"
WEBHOOK_SECRET="whsec_..."  # Clerk Svix webhook secret
ADMIN_CLERK_IDS="user_abc,user_def"  # Optional but required for /admin access
```

### Stripe

```env
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### Google Calendar / Meet

```env
GOOGLE_CLIENT_ID="...apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REFRESH_TOKEN="1//..."
GOOGLE_REDIRECT_URI="https://pathwaytutors.com/api/auth/google/callback"
GOOGLE_CALENDAR_ID="primary"
```

### Brevo (Transactional Email)

```env
BREVO_API_KEY="xkeysib-..."
BREVO_SENDER_EMAIL="noreply@pathwaytutors.com"
BREVO_SENDER_NAME="Pathway Tutors"
ADMIN_EMAIL="support@pathwaytutors.com"
```

### Test Endpoint Controls (Optional)

```env
ENABLE_TEST_ENDPOINTS="false"  # controls /api/test-calendar in production
ADMIN_TEST_TOKEN=""            # controls /api/test-email in production
```

## Webhooks

### Stripe Webhook

The main webhook endpoint is:

- `POST /api/stripe-webhooks`

For local development with Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe-webhooks
```

Copy the signing secret from Stripe CLI into `STRIPE_WEBHOOK_SECRET`.

### Clerk Webhook

The Clerk webhook endpoint is:

- `POST /api/webhooks`

Configure this endpoint in Clerk and set `WEBHOOK_SECRET` from Svix.

## Booking + Scheduling Flow

1. Student books a session and pays with Stripe.
2. Booking is persisted with payment metadata.
3. If tutor has a valid personal meeting URL, it is used.
4. Otherwise, the app creates a Google Calendar event + Google Meet link.
5. Confirmation emails are sent via Brevo to tutor and student.
6. Tutor earnings are tracked in mentor wallet tables.
7. Tokenized links support tutor cancel and student reschedule/refund actions.

## Test Endpoints

### Test Calendar

- `POST /api/test-calendar`
- `DELETE /api/test-calendar`
- Enabled in dev, or in production only when `ENABLE_TEST_ENDPOINTS="true"`

Example:

```bash
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

### Test Email

- `GET /api/test-email?to=you@example.com`
- In production, `token=<ADMIN_TEST_TOKEN>` is required

Example:

```bash
curl "http://localhost:3000/api/test-email?to=you@example.com"
```

## Useful Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run db:push
npm run db:seed
npm run db:studio
```

One-off maintenance script:

```bash
npx tsx scripts/sync-stripe-status.ts
```

## Notes

- Email sending in active code paths uses Brevo (`src/lib/email/sendEmail.ts`).
- `src/lib/email/sesClient.ts` is legacy SES code and is not used by current booking/email flows.
- Additional implementation details exist in project docs:
  - `WALLET_PAYOUT_SYSTEM.md`
  - `REVIEWS_SYSTEM_IMPLEMENTATION.md`
  - `MIGRATION_INSTRUCTIONS.md`
