-- Add Google Calendar integration fields to Booking table
-- This migration adds fields for storing calendar event data and meeting info

-- Add student and tutor email fields for calendar invites
ALTER TABLE "Booking" ADD COLUMN "studentEmail" TEXT;
ALTER TABLE "Booking" ADD COLUMN "studentName" TEXT;
ALTER TABLE "Booking" ADD COLUMN "tutorEmail" TEXT;

-- Add Google Calendar integration fields
ALTER TABLE "Booking" ADD COLUMN "calendarEventId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "meetLink" TEXT;
ALTER TABLE "Booking" ADD COLUMN "calendarHtmlLink" TEXT;

-- Create index on calendarEventId for idempotency lookups
CREATE INDEX "Booking_calendarEventId_idx" ON "Booking"("calendarEventId");
