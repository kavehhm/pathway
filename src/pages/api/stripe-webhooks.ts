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
      // Handle Connect account updates
      case 'account.updated': {
        await handleAccountUpdated(event.data.object);
        break;
      }

      // Handle successful payments - THIS NOW TRIGGERS CALENDAR + EMAIL
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
  } catch (error: any) {
    console.error('Error processing webhook:', error?.message ?? error);

    // If booking wasn't found, return 500 so Stripe retries the webhook later
    // (the booking is likely still being created by the client-side mutation).
    // For all other errors, return 200 to prevent infinite retries on unrecoverable failures.
    if (typeof error?.message === 'string' && error.message.startsWith('BOOKING_NOT_FOUND')) {
      return res.status(500).json({ error: 'Booking not yet created, please retry' });
    }

    return res.status(200).json({ received: true });
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
// This is the main handler that creates calendar events and sends emails
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`PaymentIntent succeeded: ${paymentIntent.id}`);

  // Find the booking associated with this payment.
  // The booking is created by the bookSession mutation which may run after this webhook,
  // so we retry a few times with a short delay to handle the race condition.
  // Use short delays to stay well within Vercel's function timeout.
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

  if (!booking) {
    for (let attempt = 0; attempt < 3; attempt++) {
      await new Promise((r) => setTimeout(r, 1000));
      booking = await db.booking.findFirst({
        where: { stripePaymentIntentId: paymentIntent.id },
        include: bookingInclude,
      });
      if (booking) break;
    }
  }

  if (!booking) {
    console.error(`No booking found for PaymentIntent ${paymentIntent.id} after retries`);
    // Throw so the outer handler returns a non-200 status.
    // Stripe will retry the webhook later, when the booking should exist.
    throw new Error(`BOOKING_NOT_FOUND: ${paymentIntent.id}`);
  }

  console.log(`Found booking ${booking.id} for PaymentIntent: ${paymentIntent.id}`);

  // Extract booking info from PaymentIntent metadata
  const studentName = paymentIntent.metadata.studentName ?? booking.studentName ?? 'Student';
  const studentEmail = paymentIntent.metadata.studentEmail ?? booking.studentEmail;
  const tutorName = `${booking.tutor.firstName} ${booking.tutor.lastName}`;
  const tutorEmail = booking.tutor.email;
  const tutorTimezone = booking.tutor.timezone ?? 'America/Los_Angeles';

  if (!studentEmail) {
    console.error(`No student email for booking ${booking.id}, cannot send invites`);
    await markBookingSchedulingFailed(booking.id, 'Missing student email');
    return;
  }

  const tutorMeetingLink = booking.tutor.meetingLink;
  const useGoogleMeet = !isValidUrl(tutorMeetingLink);

  // --- STEP 1: Send Brevo confirmation emails FIRST ---
  // Emails are fast (~2s parallel) and must go out before any slow API calls.
  // If Google Meet is needed, attendees will receive the link via Google's
  // own calendar invitation email after the event is created below.
  try {
    const endTime = calculateEndTime(booking.time);
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
      endTime,
      tutorTimezone,
      studentTimezone: tutorTimezone,
      meetingLink: emailMeetingLink,
      calendarLink: null,
    });

    console.log(`Email results - Tutor: ${emailResult.tutorEmail.success}, Student: ${emailResult.studentEmail.success}`);

    if (!emailResult.tutorEmail.success) {
      console.error(`Failed to send tutor email:`, emailResult.tutorEmail.error);
    }
    if (!emailResult.studentEmail.success) {
      console.error(`Failed to send student email:`, emailResult.studentEmail.error);
    }
  } catch (error: any) {
    console.error(`Failed to send confirmation emails for booking ${booking.id}:`, error);
  }

  // --- STEP 2: Create Google Calendar event (slow — OAuth refresh + API call) ---
  // Skip if already created (idempotency for Stripe webhook retries).
  // If the function times out here, emails were already sent and Stripe will
  // retry the webhook, which will skip emails and create the calendar event.
  let meetLink = tutorMeetingLink ?? '';
  let calendarEventId = '';
  let calendarHtmlLink = '';

  if (useGoogleMeet && !booking.calendarEventId) {
    try {
      console.log(`Creating Google Calendar event for booking ${booking.id}`);

      const { startTime, endTime } = parseBookingDateTime(
        booking.date.toISOString().split('T')[0] ?? '',
        booking.time,
        tutorTimezone
      );

      const { summary, description } = formatBookingForCalendar(tutorName, studentName);

      const eventDetails: CalendarEventDetails = {
        summary,
        description,
        startTime,
        endTime,
        timezone: tutorTimezone,
        tutorEmail,
        studentEmail,
        tutorName,
        studentName,
      };

      const calendarResult = await createMeetEvent(eventDetails);

      meetLink = calendarResult.meetLink;
      calendarEventId = calendarResult.eventId;
      calendarHtmlLink = calendarResult.htmlLink;

      console.log(`Created calendar event ${calendarEventId} with Meet link: ${meetLink}`);
    } catch (error: any) {
      console.error(`Failed to create calendar event for booking ${booking.id}:`, error);
      markBookingSchedulingFailed(booking.id, error.message).catch((e: any) => {
        console.error('Failed to mark scheduling failed:', e);
      });
      sendSchedulingFailureNotification(booking.id, tutorName, studentName, error.message).catch((e: any) => {
        console.error('Failed to send scheduling failure notification:', e);
      });
      meetLink = tutorMeetingLink ?? '';
    }
  } else if (!useGoogleMeet) {
    console.log(`Using tutor's meeting link: ${tutorMeetingLink}`);
  } else {
    console.log(`Booking ${booking.id} already has calendar event, skipping creation`);
  }

  // Update the booking with calendar/meeting info (fire-and-forget to save time)
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
      await db.$transaction(async (tx) => {
        let wallet = await tx.mentorWallet.findUnique({
          where: { mentorId },
        });

        if (!wallet) {
          wallet = await tx.mentorWallet.create({
            data: { mentorId, availableCents: 0, pendingCents: 0 },
          });
        }

        const newBalance = wallet.availableCents + earningsCents;

        await tx.mentorWallet.update({
          where: { mentorId },
          data: { availableCents: newBalance },
        });

        await tx.mentorLedgerEntry.create({
          data: {
            mentorId,
            type: 'SESSION_EARNED',
            amountCents: earningsCents,
            balanceAfterCents: newBalance,
            relatedSessionId: bookingId,
            stripePaymentIntentId: paymentIntent.id,
            description: `Earnings from session on ${bookingDate.toLocaleDateString()}`,
          },
        });

        await tx.booking.update({
          where: { id: bookingId },
          data: { earningsProcessed: true, status: 'completed' },
        });
      });

      console.log(`Credited ${earningsCents} cents to tutor ${mentorId}'s wallet`);
    } catch (error: any) {
      console.error(`Failed to credit wallet for booking ${bookingId}:`, error);
    }
  }
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
