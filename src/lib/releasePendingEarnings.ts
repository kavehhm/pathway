import { db } from '~/server/db';

/**
 * Move matured pending earnings to available balance for a given mentor.
 *
 * Finds all bookings where the 7-day hold has expired (availableAt <= now)
 * and the funds haven't been released yet, then atomically moves the total
 * from pendingCents to availableCents and creates a PENDING_TO_AVAILABLE
 * ledger entry for each booking.
 *
 * Safe to call multiple times — already-released bookings are skipped.
 *
 * @returns The total cents released.
 */
export async function releasePendingEarnings(mentorId: string): Promise<number> {
  const now = new Date();

  const maturedBookings = await db.booking.findMany({
    where: {
      tutorId: mentorId,
      earningsProcessed: true,
      fundsReleased: false,
      availableAt: { lte: now },
      mentorEarningsCents: { gt: 0 },
    },
    select: {
      id: true,
      mentorEarningsCents: true,
      date: true,
    },
  });

  if (maturedBookings.length === 0) return 0;

  const totalToRelease = maturedBookings.reduce(
    (sum, b) => sum + (b.mentorEarningsCents ?? 0),
    0,
  );

  if (totalToRelease <= 0) return 0;

  await db.$transaction(async (tx) => {
    let wallet = await tx.mentorWallet.findUnique({
      where: { mentorId },
    });

    if (!wallet) {
      wallet = await tx.mentorWallet.create({
        data: { mentorId, availableCents: 0, pendingCents: 0 },
      });
    }

    const newAvailable = wallet.availableCents + totalToRelease;
    const newPending = Math.max(0, wallet.pendingCents - totalToRelease);

    await tx.mentorWallet.update({
      where: { mentorId },
      data: { availableCents: newAvailable, pendingCents: newPending },
    });

    for (const booking of maturedBookings) {
      await tx.booking.update({
        where: { id: booking.id },
        data: { fundsReleased: true },
      });

      await tx.mentorLedgerEntry.create({
        data: {
          mentorId,
          type: 'PENDING_TO_AVAILABLE',
          amountCents: booking.mentorEarningsCents ?? 0,
          balanceAfterCents: newAvailable,
          relatedSessionId: booking.id,
          description: `Funds cleared for session on ${booking.date.toLocaleDateString()}`,
        },
      });
    }
  });

  return totalToRelease;
}
