-- Add tokenized booking action fields for tutor cancel + student reschedule/refund
ALTER TABLE "Booking" ADD COLUMN "tutorCancelTokenHash" TEXT;
ALTER TABLE "Booking" ADD COLUMN "tutorCancelTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "tutorCancelTokenUsedAt" TIMESTAMP(3);

ALTER TABLE "Booking" ADD COLUMN "studentRescheduleTokenHash" TEXT;
ALTER TABLE "Booking" ADD COLUMN "studentRescheduleTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "studentRescheduleTokenUsedAt" TIMESTAMP(3);

ALTER TABLE "Booking" ADD COLUMN "studentRefundTokenHash" TEXT;
ALTER TABLE "Booking" ADD COLUMN "studentRefundTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "studentRefundTokenUsedAt" TIMESTAMP(3);

ALTER TABLE "Booking" ADD COLUMN "tutorCancelledAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "refundedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "stripeRefundId" TEXT;

CREATE INDEX "Booking_tutorCancelTokenHash_idx" ON "Booking"("tutorCancelTokenHash");
CREATE INDEX "Booking_studentRescheduleTokenHash_idx" ON "Booking"("studentRescheduleTokenHash");
CREATE INDEX "Booking_studentRefundTokenHash_idx" ON "Booking"("studentRefundTokenHash");
