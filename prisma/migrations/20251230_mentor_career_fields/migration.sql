-- SAFE, ADD-ONLY MIGRATION (no drops, no renames)
-- Adds career/admissions fields used by the app for filtering/search.

ALTER TABLE "public"."User"
  ADD COLUMN IF NOT EXISTS "careerCompanies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "careerIsInternship" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "isTransfer" BOOLEAN NOT NULL DEFAULT FALSE;


