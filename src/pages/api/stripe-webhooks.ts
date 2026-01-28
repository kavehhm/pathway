import type { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import Stripe from 'stripe';
import { db } from '~/server/db';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2025-06-30.basil',
});

// Webhook signing secret from Stripe Dashboard
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  const sig = req.headers['stripe-signature'] as string;
  const rawBody = await buffer(req);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  console.log(`Received Stripe webhook: ${event.type}`);

  try {
    switch (event.type) {
      // Handle Connect account updates
      case 'account.updated': {
        await handleAccountUpdated(event.data.object);
        break;
      }

      // Handle successful payments (for audit trail)
      case 'payment_intent.succeeded': {
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      }

      // Handle failed payments
      case 'payment_intent.payment_failed': {
        handlePaymentIntentFailed(event.data.object);
        break;
      }

      // Handle transfer events
      // Note: Transfers are synchronous - they succeed or fail immediately
      // transfer.paid and transfer.failed don't exist as webhook events
      case 'transfer.created': {
        await handleTransferCreated(event.data.object);
        break;
      }

      case 'transfer.reversed': {
        await handleTransferReversed(event.data.object);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
}

// Handle Stripe Connect account status updates
async function handleAccountUpdated(account: Stripe.Account) {
  console.log(`Account updated: ${account.id}, charges_enabled: ${account.charges_enabled}, payouts_enabled: ${account.payouts_enabled}`);

  // Find user by Stripe account ID
  const user = await db.user.findFirst({
    where: { stripeAccountId: account.id },
  });

  if (!user) {
    console.log(`No user found for Stripe account: ${account.id}`);
    return;
  }

  // Update user's Stripe status
  await db.user.update({
    where: { clerkId: user.clerkId },
    data: {
      stripeChargesEnabled: account.charges_enabled,
      stripePayoutsEnabled: account.payouts_enabled,
      stripeRequirements: account.requirements as any,
      // Update legacy status field for compatibility
      stripeAccountStatus: account.charges_enabled ? 'active' : 'pending',
    },
  });

  console.log(`Updated Stripe status for user: ${user.clerkId}`);

  // If payouts just became enabled, check for pending payouts
  if (account.payouts_enabled) {
    const pendingPayouts = await db.mentorPayout.findMany({
      where: {
        mentorId: user.clerkId,
        status: 'REQUIRES_ONBOARDING',
      },
    });

    if (pendingPayouts.length > 0) {
      console.log(`Found ${pendingPayouts.length} pending payouts for ${user.clerkId}`);
      // Note: We don't auto-process here - let the user trigger it from the UI
      // This is safer and gives users control
    }
  }
}

// Handle successful payment intents
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`PaymentIntent succeeded: ${paymentIntent.id}`);

  // Update booking if we can find it
  const booking = await db.booking.findFirst({
    where: { stripePaymentIntentId: paymentIntent.id },
  });

  if (booking) {
    console.log(`Found booking for PaymentIntent: ${booking.id}`);
    // Payment already confirmed - this is just for audit trail
  } else {
    console.log(`No booking found for PaymentIntent: ${paymentIntent.id}`);
  }
}

// Handle failed payment intents
function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(`PaymentIntent failed: ${paymentIntent.id}`);
  console.log(`Failure reason: ${paymentIntent.last_payment_error?.message ?? 'Unknown'}`);

  // Log for audit - bookings aren't created until payment succeeds
}

// Handle transfer created
// Note: Transfers succeed or fail synchronously at creation time
// This webhook is for audit/logging purposes
async function handleTransferCreated(transfer: Stripe.Transfer) {
  const destinationId = typeof transfer.destination === 'string' ? transfer.destination : transfer.destination?.id ?? 'unknown';
  console.log(`Transfer created: ${transfer.id}, amount: ${transfer.amount}, destination: ${destinationId}`);

  // Find and update payout record if exists
  const payout = await db.mentorPayout.findFirst({
    where: { stripeTransferId: transfer.id },
  });

  if (payout) {
    // Transfer created successfully means it's paid (transfers are instant)
    await db.mentorPayout.update({
      where: { id: payout.id },
      data: { status: 'PAID' },
    });
    console.log(`Updated payout ${payout.id} to PAID`);
  }
}

// Handle transfer reversed (e.g., due to disputes or manual reversal)
async function handleTransferReversed(transfer: Stripe.Transfer) {
  console.log(`Transfer reversed: ${transfer.id}`);

  const payout = await db.mentorPayout.findFirst({
    where: { stripeTransferId: transfer.id },
  });

  if (payout) {
    // Get wallet to restore balance
    const wallet = await db.mentorWallet.findUnique({
      where: { mentorId: payout.mentorId },
    });

    await db.$transaction(async (tx) => {
      // Update payout status
      await tx.mentorPayout.update({
        where: { id: payout.id },
        data: {
          status: 'FAILED',
          failureReason: 'Transfer reversed',
        },
      });

      // Restore balance if wallet exists
      if (wallet) {
        await tx.mentorWallet.update({
          where: { mentorId: payout.mentorId },
          data: {
            availableCents: wallet.availableCents + payout.amountCents,
          },
        });
      }

      // Create ledger entry
      await tx.mentorLedgerEntry.create({
        data: {
          mentorId: payout.mentorId,
          type: 'TRANSFER_FAILED',
          amountCents: payout.amountCents, // Credit back
          relatedPayoutId: payout.id,
          stripeTransferId: transfer.id,
          description: 'Transfer reversed - funds restored to balance',
        },
      });
    });

    console.log(`Restored balance for reversed payout ${payout.id}`);
  }
}
