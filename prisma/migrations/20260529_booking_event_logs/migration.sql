-- CreateEnum
CREATE TYPE "BookingEventType" AS ENUM (
  'BOOKING_CREATED',
  'CALENDAR_CREATED',
  'CALENDAR_FAILED',
  'EMAILS_SENT',
  'EMAILS_FAILED',
  'WEBHOOK_FALLBACK_TRIGGERED',
  'WEBHOOK_FALLBACK_SKIPPED',
  'PAYMENT_VERIFIED',
  'PAYMENT_VERIFY_FAILED'
);

-- CreateTable
CREATE TABLE "BookingEventLog" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT,
  "eventType" "BookingEventType" NOT NULL,
  "message" TEXT NOT NULL,
  "tutorId" TEXT,
  "tutorEmail" TEXT,
  "studentEmail" TEXT,
  "totalAmountCents" INTEGER,
  "platformFeeCents" INTEGER,
  "mentorEarningsCents" INTEGER,
  "stripePaymentIntentId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BookingEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingEventLog_bookingId_createdAt_idx" ON "BookingEventLog"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "BookingEventLog_eventType_createdAt_idx" ON "BookingEventLog"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "BookingEventLog_createdAt_idx" ON "BookingEventLog"("createdAt");

-- AddForeignKey
ALTER TABLE "BookingEventLog" ADD CONSTRAINT "BookingEventLog_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
