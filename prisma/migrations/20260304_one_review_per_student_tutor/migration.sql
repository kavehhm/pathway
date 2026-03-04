-- Keep only the newest review per student+tutor pair before enforcing uniqueness.
DELETE FROM "Review" r1
USING "Review" r2
WHERE r1."studentClerkId" = r2."studentClerkId"
  AND r1."tutorClerkId" = r2."tutorClerkId"
  AND (
    r1."createdAt" < r2."createdAt"
    OR (r1."createdAt" = r2."createdAt" AND r1."id" < r2."id")
  );

CREATE UNIQUE INDEX "Review_studentClerkId_tutorClerkId_key"
ON "Review"("studentClerkId", "tutorClerkId");
