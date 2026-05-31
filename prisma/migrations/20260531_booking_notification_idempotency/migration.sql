ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "notificationStatus" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "notificationInFlight" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "notificationAttemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "notificationLastAttemptAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "notificationSentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "notificationLastError" TEXT;

CREATE INDEX IF NOT EXISTS "Booking_notificationStatus_idx" ON "Booking"("notificationStatus");
CREATE INDEX IF NOT EXISTS "Booking_notificationSentAt_idx" ON "Booking"("notificationSentAt");
