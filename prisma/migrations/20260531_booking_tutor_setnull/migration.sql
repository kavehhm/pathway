-- Drop existing foreign key
ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_tutorId_fkey";

-- Make tutorId nullable so historical bookings can survive tutor account deletion
ALTER TABLE "Booking" ALTER COLUMN "tutorId" DROP NOT NULL;

-- Clean up existing orphan tutor references before recreating FK
UPDATE "Booking" b
SET "tutorId" = NULL
WHERE b."tutorId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "User" u WHERE u."clerkId" = b."tutorId"
  );

-- Recreate foreign key with ON DELETE SET NULL
ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_tutorId_fkey"
  FOREIGN KEY ("tutorId") REFERENCES "User"("clerkId")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
