import type { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import Stripe from 'stripe';
import { db } from '~/server/db';
import {
  createMeetEvent,
  formatBookingForCalendar,
  parseBookingDateTime,
  type CalendarEventDetails,
} from '~/lib/googleCalendar';
import {
  sendBookingConfirmationEmails,
  sendSchedulingFailureNotification,
  calculateEndTime,
} from '~/lib/sendBookingEmails';
import { isValidUrl } from '~/lib/validateUrl';

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
  
  let rawBody: Buffer;
  try {
    rawBody = await buffer(req);
  } catch (err: any) {
    console.error('Error reading request body:', err.message);
    return res.status(400).json({ error: 'Failed to read request body' });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  console.log(`Received Stripe webhook: ${event.type}, event ID: ${event.id}`);

  try {
    switch (event.type) {
      case 'account.updated': {
        await handleAccountUpdated(event.data.object);
        return res.status(200).json({ received: true, event: event.type });
      }

      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        const diag = await handlePaymentIntentSucceeded(pi);
        return res.status(200).json({ received: true, event: event.type, diagnostics: diag });
      }

      case 'payment_intent.payment_failed': {
        const failedPi = event.data.object;
        handlePaymentIntentFailed(failedPi);
        return res.status(200).json({ received: true, event: event.type });
      }

      case 'transfer.created': {
        const transfer = event.data.object;
        await handleTransferCreated(transfer);
        return res.status(200).json({ received: true, event: event.type });
      }

      case 'transfer.reversed': {
        const reversedTransfer = event.data.object;
        await handleTransferReversed(reversedTransfer);
        return res.status(200).json({ received: true, event: event.type });
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
        return res.status(200).json({ received: true, event: event.type, handled: false });
    }
  } catch (error: any) {
    console.error('Error processing webhook:', error?.message ?? error);

    if (typeof error?.message === 'string' && error.message.startsWith('BOOKING_NOT_FOUND')) {
      return res.status(500).json({ error: 'Booking not yet created, please retry', event: event.type });
    }

    return res.status(200).json({ received: true, event: event.type, error: error?.message });
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

// Diagnostic result passed back through the webhook response so we can see what happened in Stripe dashboard
interface WebhookDiagnostics {
  bookingFound: boolean;
  bookingId?: string;
  retries?: number;
  emailsSent?: { tutor: boolean; student: boolean };
  calendarCreated?: boolean;
  calendarSkipped?: string;
  errors: string[];
}

// Handle successful payment intents
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<WebhookDiagnostics> {
  const diag: WebhookDiagnostics = { bookingFound: false, errors: [] };

  console.log(`PaymentIntent succeeded: ${paymentIntent.id}`);

  const bookingInclude = {
    tutor: {
      select: {
        firstName: true,
        lastName: true,
        email: true,
        meetingLink: true,
        timezone: true,
        clerkId: true,
      },
    },
  } as const;

  let booking = await db.booking.findFirst({
    where: { stripePaymentIntentId: paymentIntent.id },
    include: bookingInclude,
  });

  let retries = 0;
  if (!booking) {
    for (let attempt = 0; attempt < 3; attempt++) {
      retries++;
      await new Promise((r) => setTimeout(r, 1000));
      booking = await db.booking.findFirst({
        where: { stripePaymentIntentId: paymentIntent.id },
        include: bookingInclude,
      });
      if (booking) break;
    }
  }

  diag.retries = retries;

  if (!booking) {
    console.error(`No booking found for PaymentIntent ${paymentIntent.id} after ${retries} retries`);
    throw new Error(`BOOKING_NOT_FOUND: ${paymentIntent.id}`);
  }

  diag.bookingFound = true;
  diag.bookingId = booking.id;
  console.log(`Found booking ${booking.id} for PaymentIntent: ${paymentIntent.id}`);

  // If bookSession already ran (earningsProcessed=true), the client-side code
  // will call /api/send-booking-email to handle emails + calendar in its own
  // request with a full timeout budget.  The webhook only acts as a safety net
  // for wallet crediting below.
  if (booking.earningsProcessed) {
    diag.calendarSkipped = 'client handling (earningsProcessed=true)';
    console.log(`Booking ${booking.id}: earningsProcessed=true → client handles emails/calendar`);
    return diag;
  }

  // Safety net: bookSession didn't run or didn't credit earnings.
  // Process emails and calendar here as a fallback.
  const studentName = paymentIntent.metadata.studentName ?? booking.studentName ?? 'Student';
  const studentEmail = paymentIntent.metadata.studentEmail ?? booking.studentEmail;
  const tutorName = `${booking.tutor.firstName} ${booking.tutor.lastName}`;
  const tutorEmail = booking.tutor.email;
  const tutorTimezone = booking.tutor.timezone ?? 'America/Los_Angeles';

  if (!studentEmail) {
    diag.errors.push('Missing student email');
    console.error(`No student email for booking ${booking.id}, cannot send invites`);
    await markBookingSchedulingFailed(booking.id, 'Missing student email');
    return diag;
  }

  const tutorMeetingLink = booking.tutor.meetingLink;
  const useGoogleMeet = !isValidUrl(tutorMeetingLink);

  try {
    const endTimeStr = calculateEndTime(booking.time);
    const dateStr = booking.date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const emailMeetingLink = useGoogleMeet
      ? 'A Google Calendar invite with the Meet link will be sent shortly.'
      : (tutorMeetingLink ?? 'N/A');

    const emailResult = await sendBookingConfirmationEmails({
      tutorName,
      studentName,
      tutorEmail,
      studentEmail,
      date: dateStr,
      startTime: booking.time,
      endTime: endTimeStr,
      tutorTimezone,
      studentTimezone: tutorTimezone,
      meetingLink: emailMeetingLink,
      calendarLink: null,
    });

    diag.emailsSent = {
      tutor: emailResult.tutorEmail.success,
      student: emailResult.studentEmail.success,
    };
    console.log(`Email results - Tutor: ${emailResult.tutorEmail.success}, Student: ${emailResult.studentEmail.success}`);
  } catch (error: any) {
    diag.errors.push(`Email exception: ${error.message}`);
    console.error(`Failed to send confirmation emails for booking ${booking.id}:`, error);
  }

  let meetLink = tutorMeetingLink ?? '';
  let calendarEventId = '';
  let calendarHtmlLink = '';

  if (useGoogleMeet && !booking.calendarEventId) {
    try {
      const { startTime, endTime } = parseBookingDateTime(
        booking.date.toISOString().split('T')[0] ?? '',
        booking.time,
        tutorTimezone
      );
      const { summary, description } = formatBookingForCalendar(tutorName, studentName);
      const eventDetails: CalendarEventDetails = {
        summary, description, startTime, endTime,
        timezone: tutorTimezone, tutorEmail, studentEmail, tutorName, studentName,
      };

      const calendarResult = await createMeetEvent(eventDetails);
      meetLink = calendarResult.meetLink;
      calendarEventId = calendarResult.eventId;
      calendarHtmlLink = calendarResult.htmlLink;
      diag.calendarCreated = true;
    } catch (error: any) {
      diag.calendarCreated = false;
      diag.errors.push(`Calendar failed: ${error.message}`);
      console.error(`Failed to create calendar event for booking ${booking.id}:`, error);
      markBookingSchedulingFailed(booking.id, error.message).catch((e: unknown) => {
        console.error('Failed to mark scheduling failed:', e);
      });
      meetLink = tutorMeetingLink ?? '';
    }
  } else if (!useGoogleMeet) {
    diag.calendarSkipped = 'tutor has meeting link';
  } else {
    diag.calendarSkipped = 'already created';
  }

  db.booking.update({
    where: { id: booking.id },
    data: {
      studentEmail,
      studentName,
      tutorEmail,
      meetLink: meetLink || null,
      calendarEventId: calendarEventId || null,
      calendarHtmlLink: calendarHtmlLink || null,
    },
  }).catch((error: any) => {
    console.error(`Failed to update booking with meeting info:`, error);
  });

  // Credit the tutor's wallet if bookSession hasn't already done so
  const earningsCents = booking.mentorEarningsCents;
  const bookingId = booking.id;
  const bookingDate = booking.date;
  const mentorId = booking.tutor.clerkId;

  if (!booking.earningsProcessed && !booking.free && earningsCents) {
    try {
      const HOLD_DAYS = 7;
      const availableAt = new Date(Date.now() + HOLD_DAYS * 24 * 60 * 60 * 1000);

      await db.$transaction(async (tx) => {
        let wallet = await tx.mentorWallet.findUnique({
          where: { mentorId },
        });

        if (!wallet) {
          wallet = await tx.mentorWallet.create({
            data: { mentorId, availableCents: 0, pendingCents: 0 },
          });
        }

        const newPending = wallet.pendingCents + earningsCents;

        await tx.mentorWallet.update({
          where: { mentorId },
          data: { pendingCents: newPending },
        });

        await tx.mentorLedgerEntry.create({
          data: {
            mentorId,
            type: 'SESSION_EARNED',
            amountCents: earningsCents,
            balanceAfterCents: newPending,
            relatedSessionId: bookingId,
            stripePaymentIntentId: paymentIntent.id,
            description: `Earnings from session on ${bookingDate.toLocaleDateString()} (available ${availableAt.toLocaleDateString()})`,
          },
        });

        await tx.booking.update({
          where: { id: bookingId },
          data: { earningsProcessed: true, status: 'completed', availableAt, fundsReleased: false },
        });
      });

      console.log(`Credited ${earningsCents} cents to tutor ${mentorId}'s pending wallet`);
    } catch (error: any) {
      diag.errors.push(`Wallet credit failed: ${error.message}`);
      console.error(`Failed to credit wallet for booking ${bookingId}:`, error);
    }
  }

  return diag;
}

// Helper to mark booking as scheduling failed
async function markBookingSchedulingFailed(bookingId: string, reason: string) {
  try {
    await db.booking.update({
      where: { id: bookingId },
      data: {
        status: 'SCHEDULING_FAILED',
      },
    });
    console.log(`Marked booking ${bookingId} as SCHEDULING_FAILED: ${reason}`);
  } catch (error) {
    console.error(`Failed to mark booking ${bookingId} as failed:`, error);
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
