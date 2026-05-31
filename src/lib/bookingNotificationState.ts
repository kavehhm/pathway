import { db } from "~/server/db";

export async function claimBookingNotificationSend(bookingId: string): Promise<boolean> {
  const now = new Date();
  const result = await db.booking.updateMany({
    where: {
      id: bookingId,
      notificationSentAt: null,
      notificationStatus: { not: "sent" },
      OR: [
        { notificationInFlight: false },
        // Recover stale processing locks older than 10 minutes.
        { notificationLastAttemptAt: { lt: new Date(now.getTime() - 10 * 60 * 1000) } },
      ],
    },
    data: {
      notificationInFlight: true,
      notificationStatus: "processing",
      notificationLastAttemptAt: now,
      notificationAttemptCount: { increment: 1 },
      notificationLastError: null,
    },
  });

  return result.count === 1;
}

export async function markBookingNotificationSent(bookingId: string) {
  await db.booking.update({
    where: { id: bookingId },
    data: {
      notificationInFlight: false,
      notificationStatus: "sent",
      notificationSentAt: new Date(),
      notificationLastError: null,
    },
  });
}

export async function markBookingNotificationFailed(bookingId: string, errorMessage: string) {
  await db.booking.update({
    where: { id: bookingId },
    data: {
      notificationInFlight: false,
      notificationStatus: "failed",
      notificationLastError: errorMessage.slice(0, 1000),
    },
  });
}
