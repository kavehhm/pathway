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

    // IMPORTANT: Always return 200 to acknowledge receipt
    // Even if processing fails internally, we don't want Stripe to keep retrying
    return res.status(200).json({ received: true });
  } catch (error: any) {
    // Log the error but still return 200 to prevent webhook retries
    // The error is logged and can be investigated via logs
    console.error('Error processing webhook:', error?.message || error);
    
    // Return 200 anyway to acknowledge receipt and stop retries
    // Errors are handled internally (e.g., marking booking as SCHEDULING_FAILED)
    return res.status(200).json({ received: true, error: 'Internal processing error logged' });
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

  // Find the booking associated with this payment
  const booking = await db.booking.findFirst({
    where: { stripePaymentIntentId: paymentIntent.id },
    include: {
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
    },
  });

  if (!booking) {
    console.log(`No booking found for PaymentIntent: ${paymentIntent.id}`);
    // This might happen if the booking hasn't been created yet
    // The booking is created via the bookSession mutation which runs after payment confirmation
    return;
  }

  console.log(`Found booking ${booking.id} for PaymentIntent: ${paymentIntent.id}`);

  // IDEMPOTENCY CHECK: If we already have a calendar event, don't create another
  if (booking.calendarEventId) {
    console.log(`Booking ${booking.id} already has calendar event ${booking.calendarEventId}, skipping`);
    return;
  }

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

  // Determine which meeting link to use
  // If tutor has a valid meeting link, use that. Otherwise, generate Google Meet
  const tutorMeetingLink = booking.tutor.meetingLink;
  const useGoogleMeet = !isValidUrl(tutorMeetingLink);

  let meetLink = tutorMeetingLink ?? '';
  let calendarEventId = '';
  let calendarHtmlLink = '';

  if (useGoogleMeet) {
    // Create Google Calendar event with Google Meet
    try {
      console.log(`Creating Google Calendar event for booking ${booking.id}`);
      
      // Parse the booking date and time
      const { startTime, endTime } = parseBookingDateTime(
        booking.date.toISOString().split('T')[0] ?? '',
        booking.time,
        tutorTimezone
      );

      // Format the event details
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
      // Mark as scheduling failed but continue to try sending emails
      await markBookingSchedulingFailed(booking.id, error.message);
      
      await sendSchedulingFailureNotification(
        booking.id,
        tutorName,
        studentName,
        error.message
      );
      
      // Still try to use the tutor's meeting link as fallback
      meetLink = tutorMeetingLink ?? '';
    }
  } else {
    console.log(`Using tutor's meeting link: ${tutorMeetingLink}`);
    meetLink = tutorMeetingLink ?? '';
  }

  // Update the booking with calendar/meeting info
  try {
    await db.booking.update({
      where: { id: booking.id },
      data: {
        studentEmail,
        studentName,
        tutorEmail,
        meetLink: meetLink || null,
        calendarEventId: calendarEventId || null,
        calendarHtmlLink: calendarHtmlLink || null,
      },
    });
    console.log(`Updated booking ${booking.id} with meeting info`);
  } catch (error: any) {
    console.error(`Failed to update booking ${booking.id} with meeting info:`, error);
  }

  // Send confirmation emails via Brevo (server-side, after calendar event is created)
  try {
    const endTime = calculateEndTime(booking.time);
    const dateStr = booking.date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

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
      meetingLink: meetLink ?? null,
      calendarLink: calendarHtmlLink ?? null,
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

  // Credit the tutor's wallet with their earnings
  if (!booking.earningsProcessed && !booking.free && booking.mentorEarningsCents) {
    try {
      const mentorId = booking.tutor.clerkId;
      await db.$transaction(async (tx) => {
        let wallet = await tx.mentorWallet.findUnique({
          where: { mentorId },
        });

        if (!wallet) {
          wallet = await tx.mentorWallet.create({
            data: { mentorId, availableCents: 0, pendingCents: 0 },
          });
        }

        const newBalance = wallet.availableCents + booking.mentorEarningsCents!;

        await tx.mentorWallet.update({
          where: { mentorId },
          data: { availableCents: newBalance },
        });

        await tx.mentorLedgerEntry.create({
          data: {
            mentorId,
            type: 'SESSION_EARNED',
            amountCents: booking.mentorEarningsCents!,
            balanceAfterCents: newBalance,
            relatedSessionId: booking.id,
            stripePaymentIntentId: paymentIntent.id,
            description: `Earnings from session on ${booking.date.toLocaleDateString()}`,
          },
        });

        await tx.booking.update({
          where: { id: booking.id },
          data: { earningsProcessed: true, status: 'completed' },
        });
      });

      console.log(`Credited ${booking.mentorEarningsCents} cents to tutor ${mentorId}'s wallet`);
    } catch (error: any) {
      console.error(`Failed to credit wallet for booking ${booking.id}:`, error);
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
