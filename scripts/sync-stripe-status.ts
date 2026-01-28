/**
 * One-time migration script to sync Stripe account status for existing mentors
 * Run with: npx tsx scripts/sync-stripe-status.ts
 */

import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2025-06-30.basil',
});

async function syncStripeStatus() {
  console.log('Fetching mentors with Stripe accounts...\n');

  // Find all users with a stripeAccountId
  const mentors = await prisma.user.findMany({
    where: {
      stripeAccountId: { not: null },
    },
    select: {
      clerkId: true,
      firstName: true,
      lastName: true,
      stripeAccountId: true,
      stripeAccountStatus: true,
      stripeChargesEnabled: true,
      stripePayoutsEnabled: true,
    },
  });

  console.log(`Found ${mentors.length} mentors with Stripe accounts\n`);

  for (const mentor of mentors) {
    if (!mentor.stripeAccountId) continue;

    try {
      // Fetch current status from Stripe
      const account = await stripe.accounts.retrieve(mentor.stripeAccountId);

      console.log(`${mentor.firstName} ${mentor.lastName}:`);
      console.log(`  Stripe Account: ${mentor.stripeAccountId}`);
      console.log(`  Current DB: chargesEnabled=${mentor.stripeChargesEnabled}, payoutsEnabled=${mentor.stripePayoutsEnabled}`);
      console.log(`  From Stripe: charges_enabled=${account.charges_enabled}, payouts_enabled=${account.payouts_enabled}`);

      // Update database with current Stripe status
      await prisma.user.update({
        where: { clerkId: mentor.clerkId },
        data: {
          stripeChargesEnabled: account.charges_enabled,
          stripePayoutsEnabled: account.payouts_enabled,
          stripeRequirements: account.requirements as any,
          // Also ensure stripeAccountStatus is correct
          stripeAccountStatus: account.charges_enabled ? 'active' : 'pending',
        },
      });

      console.log(`  ✓ Updated successfully\n`);
    } catch (error: any) {
      console.log(`  ✗ Error: ${error.message}\n`);
    }
  }

  console.log('Done!');
}

syncStripeStatus()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
