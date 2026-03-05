-- CreateEnum
CREATE TYPE "PlatformOwner" AS ENUM ('EMMETT', 'KAVEH');

-- CreateTable
CREATE TABLE "PlatformOwnerPayout" (
    "id" TEXT NOT NULL,
    "owner" "PlatformOwner" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'INITIATED',
    "stripeTransferId" TEXT,
    "failureReason" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "trigger" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformOwnerPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformOwnerPayout_idempotencyKey_key" ON "PlatformOwnerPayout"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PlatformOwnerPayout_owner_idx" ON "PlatformOwnerPayout"("owner");

-- CreateIndex
CREATE INDEX "PlatformOwnerPayout_status_idx" ON "PlatformOwnerPayout"("status");

-- CreateIndex
CREATE INDEX "PlatformOwnerPayout_createdAt_idx" ON "PlatformOwnerPayout"("createdAt");
