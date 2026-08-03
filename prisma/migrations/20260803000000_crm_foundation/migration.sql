-- Ascend CRM Foundation: Utah HVAC/plumbing lead integrity.
ALTER TABLE "LeadBusiness"
  ADD COLUMN "trade" TEXT,
  ADD COLUMN "ownerName" TEXT,
  ADD COLUMN "email" TEXT,
  ADD COLUMN "googleBusinessProfileUrl" TEXT,
  ADD COLUMN "sourceUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "ownerVerificationSource" TEXT,
  ADD COLUMN "phoneVerificationSource" TEXT,
  ADD COLUMN "phoneVerificationDate" TIMESTAMP(3),
  ADD COLUMN "phoneVerificationMethod" TEXT NOT NULL DEFAULT 'unverified',
  ADD COLUMN "phoneType" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN "leadScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "assignedUserId" TEXT,
  ADD COLUMN "lastContactedAt" TIMESTAMP(3),
  ADD COLUMN "nextFollowUpAt" TIMESTAMP(3),
  ADD COLUMN "doNotCall" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "callReady" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "callReadyAt" TIMESTAMP(3);

ALTER TABLE "ContactSuppression"
  ADD COLUMN "businessName" TEXT,
  ADD COLUMN "normalizedBusinessName" TEXT,
  ADD COLUMN "permanent" BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX "LeadBusiness_organizationId_normalizedPhone_key"
  ON "LeadBusiness"("organizationId", "normalizedPhone");

CREATE INDEX "LeadBusiness_organizationId_trade_city_state_idx"
  ON "LeadBusiness"("organizationId", "trade", "city", "state");

CREATE INDEX "LeadBusiness_organizationId_assignedUserId_callReady_idx"
  ON "LeadBusiness"("organizationId", "assignedUserId", "callReady");

CREATE INDEX "LeadBusiness_organizationId_doNotCall_idx"
  ON "LeadBusiness"("organizationId", "doNotCall");

CREATE INDEX "ContactSuppression_organizationId_normalizedBusinessName_idx"
  ON "ContactSuppression"("organizationId", "normalizedBusinessName");

CREATE UNIQUE INDEX "ContactSuppression_organizationId_phone_channel_key"
  ON "ContactSuppression"("organizationId", "phone", "channel");
