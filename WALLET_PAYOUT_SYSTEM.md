# Wallet + Withdraw Payout System

This document describes the mentor payout system using **Stripe Connect Express** with **Separate Charges and Transfers**.

## Overview

The payout flow has been updated to use a "wallet + withdraw" model:

1. **No upfront Stripe onboarding** - Mentors can complete signup without providing SSN/bank info
2. **Platform holds funds** - Student payments go to the platform's Stripe account
3. **Wallet balance system** - After sessions are completed, earnings accrue in mentor wallets
4. **On-demand withdrawal** - Mentors withdraw when ready; Stripe onboarding happens at first withdrawal

## Architecture

### Payment Flow

```
Student Payment → Platform Stripe Account → Mentor Wallet (DB) → Transfer to Mentor (on withdraw)
```

### Key Components

1. **Separate Charges and Transfers**
   - PaymentIntents created WITHOUT `transfer_data.destination`
   - Funds remain in platform account until withdrawal
   - Manual transfers via `stripe.transfers.create()` on withdraw

2. **Wallet System** (Database)
   - `MentorWallet` - Available and pending balances
   - `MentorLedgerEntry` - Audit trail of all balance changes
   - `MentorPayout` - Withdrawal requests and their status

3. **Express Connect Accounts**
   - Created on first withdrawal attempt
   - Account Links for onboarding
   - `charges_enabled` and `payouts_enabled` status tracking

## Database Schema

### New Models

```prisma
model MentorWallet {
  id             String   @id @default(uuid())
  mentorId       String   @unique
  availableCents Int      @default(0)  // Ready to withdraw
  pendingCents   Int      @default(0)  // Awaiting processing
  currency       String   @default("usd")
  // ... timestamps
}

model MentorLedgerEntry {
  id                    String          @id @default(uuid())
  mentorId              String
  type                  LedgerEntryType // SESSION_EARNED, WITHDRAW_REQUESTED, etc.
  amountCents           Int
  balanceAfterCents     Int?
  relatedSessionId      String?
  stripeTransferId      String?
  // ... timestamps
}

model MentorPayout {
  id               String       @id @default(uuid())
  mentorId         String
  amountCents      Int
  status           PayoutStatus // INITIATED, REQUIRES_ONBOARDING, PROCESSING, PAID, FAILED
  stripeTransferId String?
  idempotencyKey   String       @unique
  // ... timestamps
}
```

### Updated User Fields

```prisma
model User {
  // ... existing fields
  stripeChargesEnabled  Boolean @default(false)
  stripePayoutsEnabled  Boolean @default(false)
  stripeRequirements    Json?
}
```

### Updated Booking Fields

```prisma
model Booking {
  // ... existing fields
  stripePaymentIntentId String?
  totalAmountCents      Int?
  platformFeeCents      Int?
  mentorEarningsCents   Int?
  earningsProcessed     Boolean @default(false)
}
```

## API Endpoints

### Wallet & Earnings

| Endpoint | Description |
|----------|-------------|
| `getMentorWallet` | Get wallet balance and recent activity |
| `getUnprocessedEarnings` | Get sessions pending earnings processing |
| `completeSessionAndAddEarnings` | Mark session complete, add earnings to wallet |
| `withdrawEarnings` | Initiate withdrawal (creates Stripe account if needed) |
| `processPendingPayout` | Complete pending payout after onboarding |
| `getStripeOnboardingLink` | Get/create onboarding link |
| `getMentorStripeStatus` | Check Stripe account status |
| `getPayoutHistory` | Get payout history |

### Webhook Handler

`/api/stripe-webhooks` handles:
- `account.updated` - Sync Stripe account status
- `payment_intent.succeeded` - Audit trail
- `payment_intent.payment_failed` - Audit trail
- `transfer.created` - Log successful transfers (transfers are synchronous)
- `transfer.reversed` - Handle reversed transfers, restore balance

## Environment Variables

Add these to your `.env`:

```env
# Existing
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# New - Required for webhooks
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Stripe Dashboard Setup

### 1. Enable Connect

1. Go to Stripe Dashboard → Connect → Settings
2. Enable Express accounts for your platform
3. Configure branding and payout settings

### 2. Create Webhook Endpoint

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourapp.com/api/stripe-webhooks`
3. Select events:
   - `account.updated`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `transfer.created`
   - `transfer.reversed`
4. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

**Note:** Transfers in Stripe are synchronous - they succeed or fail immediately when created. There are no `transfer.paid` or `transfer.failed` events. The `transfer.reversed` event handles cases where a transfer is reversed (e.g., disputes).

### 3. Test Mode

In test mode:
- Use test card: `4242 4242 4242 4242`
- Stripe provides test SSN: `000-00-0000`
- Test bank account: routing `110000000`, account `000123456789`

## Testing Locally

### 1. Stripe CLI for Webhooks

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe-webhooks

# Copy the webhook signing secret shown
```

### 2. Simulate Mentor Flow

1. Create account and complete profile (no Stripe setup needed)
2. Have a "student" book and pay for a session
3. Mark session as completed (adds earnings to wallet)
4. Go to Earnings page and click Withdraw
5. Complete Stripe onboarding when prompted
6. Transfer is created

### 3. Test Account Status Updates

```bash
# Trigger account.updated webhook
stripe trigger account.updated
```

## UI Pages

### Earnings Dashboard (`/earnings`)

- Shows available and pending balance
- Withdraw button
- Ledger activity log
- Payout history
- Stripe account status

### Tutor Onboarding (`/tutor-onboarding`)

- Removed Stripe Connect setup section
- Added info card about how payments work
- Link to Earnings page

## Platform Fee

- **Platform keeps**: 10% of each session
- **Mentor receives**: 90% of each session
- Fee calculated at payment time and stored in booking metadata

## Security Considerations

1. **Webhook Signature Verification** - All Stripe webhooks verified
2. **Idempotency Keys** - Prevent duplicate transfers
3. **Transaction Safety** - Database transactions for balance updates
4. **Double-Withdraw Prevention** - Check payout status before transfers
5. **Protected Endpoints** - Internal endpoints protected

## Edge Cases Handled

- Mentor withdraws but needs onboarding → Payout status = REQUIRES_ONBOARDING
- Transfer fails after creation → Balance restored, ledger entry created
- Onboarding incomplete → Account Link regenerated
- Zero balance withdrawal → Blocked with error message
- Duplicate payouts → Prevented by idempotency keys

## Migration from Old System

If migrating from the previous destination charges model:

1. Run Prisma migration to add new models
2. Existing bookings without new fields will work (treated as non-wallet bookings)
3. New bookings will track payment info for wallet processing
4. Mentors with existing Stripe accounts keep their accounts

```bash
# Run migration
npx prisma migrate dev --name wallet_payout_system

# Generate client
npx prisma generate
```

## Monitoring

Track these metrics:
- Total platform balance (sum of mentor available + pending balances)
- Pending withdrawals count
- Failed transfers rate
- Average time to withdraw after earning

## Troubleshooting

### "Transfer failed: Insufficient funds"
- Platform Stripe balance may be too low
- Check Stripe Dashboard → Balance

### "Account not fully onboarded"
- Check `requirements.currently_due` on account
- Generate new account link for user

### "Duplicate transfer"
- Idempotency key collision
- Check if previous transfer succeeded

### Balance discrepancy
- Check MentorLedgerEntry for complete audit trail
- Sum all entries for a mentor to verify balance
