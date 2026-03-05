import Stripe from 'stripe';
import { db } from '~/server/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2025-06-30.basil',
});

type OwnerKey = 'EMMETT' | 'KAVEH';

const OWNER_DESTINATIONS: Record<OwnerKey, string> = {
  EMMETT: process.env.EMMETT_OWNER_STRIPE_ACCOUNT_ID ?? 'acct_1RjD1AFbuybrd1fd',
  KAVEH: process.env.KAVEH_OWNER_STRIPE_ACCOUNT_ID ?? 'acct_1RjClLFJD9p5jh3n',
};

const OWNER_PROFIT_SPLIT_EMMETT_BPS = Number.parseInt(process.env.EMMETT_OWNER_PROFIT_SPLIT_BPS ?? '5000', 10);
const OWNER_PROFIT_SPLIT_KAVEH_BPS = 10000 - OWNER_PROFIT_SPLIT_EMMETT_BPS;

const MIN_DISTRIBUTION_CENTS = Number.parseInt(
  process.env.PLATFORM_PROFIT_MIN_DISTRIBUTION_CENTS ?? '2000',
  10,
);

const FIXED_RESERVE_CENTS = Number.parseInt(
  process.env.PLATFORM_PROFIT_FIXED_RESERVE_CENTS ?? '5000',
  10,
);

const LIABILITY_RESERVE_BPS = Number.parseInt(
  process.env.PLATFORM_PROFIT_LIABILITY_RESERVE_BPS ?? '500',
  10,
);

function clampBps(value: number): number {
  if (!Number.isFinite(value)) return 5000;
  if (value < 0) return 0;
  if (value > 10000) return 10000;
  return value;
}

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

export interface ProfitDistributionResult {
  attempted: boolean;
  reason?: string;
  stripeAvailableCents: number;
  tutorLiabilitiesCents: number;
  reserveCents: number;
  distributableCents: number;
  emmettAmountCents: number;
  kavehAmountCents: number;
  paidTransfers: Array<{ owner: OwnerKey; transferId: string; amountCents: number }>;
  failedTransfers: Array<{ owner: OwnerKey; amountCents: number; reason: string }>;
}

/**
 * Distributes *real* platform profit to owners while preserving tutor obligations.
 *
 * Real distributable profit is computed as:
 * stripe available balance - total tutor liabilities - reserve.
 */
export async function distributePlatformProfit(
  trigger: string,
  idempotencyScope?: string,
): Promise<ProfitDistributionResult> {
  const emmettSplitBps = clampBps(OWNER_PROFIT_SPLIT_EMMETT_BPS);
  const kavehSplitBps = 10000 - emmettSplitBps;

  if (kavehSplitBps !== OWNER_PROFIT_SPLIT_KAVEH_BPS) {
    console.warn('Owner profit split bps were out of range; using clamped values.');
  }

  const balance = await stripe.balance.retrieve();
  const usdAvailable = balance.available.find((entry) => entry.currency === 'usd');
  const stripeAvailableCents = clampNonNegative(usdAvailable?.amount ?? 0);

  const walletSums = await db.mentorWallet.aggregate({
    _sum: {
      availableCents: true,
      pendingCents: true,
    },
  });

  const tutorLiabilitiesCents =
    clampNonNegative(walletSums._sum.availableCents ?? 0) +
    clampNonNegative(walletSums._sum.pendingCents ?? 0);

  const fixedReserve = clampNonNegative(FIXED_RESERVE_CENTS);
  const variableReserve = Math.floor((tutorLiabilitiesCents * clampBps(LIABILITY_RESERVE_BPS)) / 10000);
  const reserveCents = Math.max(fixedReserve, variableReserve);

  const rawDistributable = stripeAvailableCents - tutorLiabilitiesCents - reserveCents;
  const distributableCents = clampNonNegative(rawDistributable);

  const baseResult: ProfitDistributionResult = {
    attempted: false,
    stripeAvailableCents,
    tutorLiabilitiesCents,
    reserveCents,
    distributableCents,
    emmettAmountCents: 0,
    kavehAmountCents: 0,
    paidTransfers: [],
    failedTransfers: [],
  };

  if (distributableCents < clampNonNegative(MIN_DISTRIBUTION_CENTS)) {
    return {
      ...baseResult,
      reason: `Distributable profit (${distributableCents}) is below minimum payout threshold (${MIN_DISTRIBUTION_CENTS}).`,
    };
  }

  const [emmettPaid, kavehPaid] = await Promise.all([
    db.platformOwnerPayout.aggregate({
      where: { owner: 'EMMETT', status: 'PAID' },
      _sum: { amountCents: true },
    }),
    db.platformOwnerPayout.aggregate({
      where: { owner: 'KAVEH', status: 'PAID' },
      _sum: { amountCents: true },
    }),
  ]);

  const totalEmmettPaid = clampNonNegative(emmettPaid._sum.amountCents ?? 0);
  const totalKavehPaid = clampNonNegative(kavehPaid._sum.amountCents ?? 0);
  const totalPaidSoFar = totalEmmettPaid + totalKavehPaid;

  const targetEmmettTotal = Math.floor(
    ((totalPaidSoFar + distributableCents) * emmettSplitBps) / 10000,
  );
  let emmettAmountCents = clampNonNegative(targetEmmettTotal - totalEmmettPaid);

  if (emmettAmountCents > distributableCents) {
    emmettAmountCents = distributableCents;
  }

  const kavehAmountCents = distributableCents - emmettAmountCents;

  const payoutPlan = [
    { owner: 'EMMETT', amountCents: emmettAmountCents },
    { owner: 'KAVEH', amountCents: kavehAmountCents },
  ] satisfies Array<{ owner: OwnerKey; amountCents: number }>;

  const nonZeroPayoutPlan: Array<{ owner: OwnerKey; amountCents: number }> = payoutPlan.filter(
    (item) => item.amountCents > 0,
  );

  if (nonZeroPayoutPlan.length === 0) {
    return {
      ...baseResult,
      reason: 'No owner payout is due after split balancing.',
      emmettAmountCents,
      kavehAmountCents,
    };
  }

  const result: ProfitDistributionResult = {
    ...baseResult,
    attempted: true,
    emmettAmountCents,
    kavehAmountCents,
  };

  for (const payout of nonZeroPayoutPlan) {
    const destination = OWNER_DESTINATIONS[payout.owner];

    if (!destination) {
      result.failedTransfers.push({
        owner: payout.owner,
        amountCents: payout.amountCents,
        reason: `Missing Stripe destination account for ${payout.owner}`,
      });
      continue;
    }

    const idempotencyKey = [
      'platform_profit',
      payout.owner.toLowerCase(),
      idempotencyScope ?? `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ].join('_');

    // If this exact payout was already attempted with the same idempotency key, skip.
    const existing = await db.platformOwnerPayout.findUnique({
      where: { idempotencyKey },
    });

    if (existing) {
      if (existing.status === 'PAID' && existing.stripeTransferId) {
        result.paidTransfers.push({
          owner: payout.owner,
          transferId: existing.stripeTransferId,
          amountCents: existing.amountCents,
        });
      } else if (existing.status === 'FAILED') {
        result.failedTransfers.push({
          owner: payout.owner,
          amountCents: existing.amountCents,
          reason: existing.failureReason ?? 'Previous payout attempt failed',
        });
      }
      continue;
    }

    const payoutRecord = await db.platformOwnerPayout.create({
      data: {
        owner: payout.owner,
        amountCents: payout.amountCents,
        status: 'PROCESSING',
        idempotencyKey,
        trigger,
      },
    });

    try {
      const transfer = await stripe.transfers.create(
        {
          amount: payout.amountCents,
          currency: 'usd',
          destination,
          metadata: {
            category: 'platform_profit_distribution',
            owner: payout.owner,
            platformOwnerPayoutId: payoutRecord.id,
            trigger,
          },
        },
        { idempotencyKey },
      );

      await db.platformOwnerPayout.update({
        where: { id: payoutRecord.id },
        data: {
          status: 'PAID',
          stripeTransferId: transfer.id,
        },
      });

      result.paidTransfers.push({
        owner: payout.owner,
        transferId: transfer.id,
        amountCents: payout.amountCents,
      });
    } catch (error: any) {
      const reason = error?.message ?? 'Unknown Stripe transfer error';
      await db.platformOwnerPayout.update({
        where: { id: payoutRecord.id },
        data: {
          status: 'FAILED',
          failureReason: reason,
        },
      });

      result.failedTransfers.push({
        owner: payout.owner,
        amountCents: payout.amountCents,
        reason,
      });
    }
  }

  return result;
}
