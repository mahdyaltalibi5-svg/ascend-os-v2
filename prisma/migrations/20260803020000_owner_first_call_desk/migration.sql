-- Milestone 2: owner-first call desk, callback engine, locks, and PWA push foundation.
ALTER TABLE "LeadBusiness"
  ADD COLUMN "ownerReachScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "ownerReachScoreReasons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "operationalStatus" TEXT NOT NULL DEFAULT 'new',
  ADD COLUMN "bestCallingWindowStart" TEXT,
  ADD COLUMN "bestCallingWindowEnd" TEXT,
  ADD COLUMN "bestCallingWindowTimezone" TEXT,
  ADD COLUMN "marketingNeedSignals" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "websiteWeaknesses" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "wrongNumber" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "CallAttempt" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "leadBusinessId" TEXT NOT NULL,
  "callerUserId" TEXT,
  "pendingSessionId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3),
  "durationSeconds" INTEGER,
  "outcome" TEXT NOT NULL,
  "contactType" TEXT NOT NULL DEFAULT 'unknown',
  "ownerReached" BOOLEAN NOT NULL DEFAULT false,
  "fullPitchDelivered" BOOLEAN NOT NULL DEFAULT false,
  "interested" BOOLEAN NOT NULL DEFAULT false,
  "callbackRequested" BOOLEAN NOT NULL DEFAULT false,
  "appointmentBooked" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "previousPipelineStage" TEXT,
  "newPipelineStage" TEXT,
  "nextAction" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CallAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PendingCallSession" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "leadBusinessId" TEXT NOT NULL,
  "callerUserId" TEXT NOT NULL,
  "sessionKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "canceledAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PendingCallSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesCallback" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "leadBusinessId" TEXT NOT NULL,
  "assignedCallerId" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "timezone" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "createdById" TEXT,
  "linkedCallAttemptId" TEXT,
  "completedAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SalesCallback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadLock" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "leadBusinessId" TEXT NOT NULL,
  "lockedByUserId" TEXT NOT NULL,
  "sessionKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "releasedAt" TIMESTAMP(3),
  "releaseReason" TEXT,

  CONSTRAINT "LeadLock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CallingPolicy" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT 'Default calling policy',
  "timezone" TEXT NOT NULL,
  "weekdayStart" TEXT NOT NULL DEFAULT '09:00',
  "weekdayEnd" TEXT NOT NULL DEFAULT '18:00',
  "saturdayStart" TEXT,
  "saturdayEnd" TEXT,
  "sundayStart" TEXT,
  "sundayEnd" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CallingPolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PushSubscription" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "endpointHash" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT,
  "auth" TEXT,
  "userAgent" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OwnerReachScoreReview" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "leadBusinessId" TEXT NOT NULL,
  "reviewedById" TEXT,
  "previousScore" INTEGER NOT NULL,
  "newScore" INTEGER NOT NULL,
  "previousReasons" TEXT[] NOT NULL,
  "newReasons" TEXT[] NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OwnerReachScoreReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CallAttempt_organizationId_idempotencyKey_key"
  ON "CallAttempt"("organizationId", "idempotencyKey");
CREATE INDEX "CallAttempt_organizationId_leadBusinessId_startedAt_idx"
  ON "CallAttempt"("organizationId", "leadBusinessId", "startedAt");
CREATE INDEX "CallAttempt_organizationId_callerUserId_startedAt_idx"
  ON "CallAttempt"("organizationId", "callerUserId", "startedAt");
CREATE INDEX "CallAttempt_organizationId_outcome_idx"
  ON "CallAttempt"("organizationId", "outcome");

CREATE UNIQUE INDEX "PendingCallSession_organizationId_callerUserId_sessionKey_key"
  ON "PendingCallSession"("organizationId", "callerUserId", "sessionKey");
CREATE INDEX "PendingCallSession_organizationId_callerUserId_status_idx"
  ON "PendingCallSession"("organizationId", "callerUserId", "status");
CREATE INDEX "PendingCallSession_organizationId_leadBusinessId_status_idx"
  ON "PendingCallSession"("organizationId", "leadBusinessId", "status");

CREATE INDEX "SalesCallback_organizationId_assignedCallerId_status_scheduledAt_idx"
  ON "SalesCallback"("organizationId", "assignedCallerId", "status", "scheduledAt");
CREATE INDEX "SalesCallback_organizationId_scheduledAt_idx"
  ON "SalesCallback"("organizationId", "scheduledAt");
CREATE INDEX "SalesCallback_organizationId_leadBusinessId_status_idx"
  ON "SalesCallback"("organizationId", "leadBusinessId", "status");

CREATE UNIQUE INDEX "LeadLock_organizationId_leadBusinessId_key"
  ON "LeadLock"("organizationId", "leadBusinessId");
CREATE INDEX "LeadLock_organizationId_lockedByUserId_expiresAt_idx"
  ON "LeadLock"("organizationId", "lockedByUserId", "expiresAt");
CREATE INDEX "LeadLock_organizationId_expiresAt_idx"
  ON "LeadLock"("organizationId", "expiresAt");

CREATE INDEX "CallingPolicy_organizationId_active_idx"
  ON "CallingPolicy"("organizationId", "active");

CREATE UNIQUE INDEX "PushSubscription_organizationId_userId_endpointHash_key"
  ON "PushSubscription"("organizationId", "userId", "endpointHash");
CREATE INDEX "PushSubscription_organizationId_userId_enabled_idx"
  ON "PushSubscription"("organizationId", "userId", "enabled");

CREATE INDEX "OwnerReachScoreReview_organizationId_leadBusinessId_createdAt_idx"
  ON "OwnerReachScoreReview"("organizationId", "leadBusinessId", "createdAt");
CREATE INDEX "OwnerReachScoreReview_organizationId_reviewedById_idx"
  ON "OwnerReachScoreReview"("organizationId", "reviewedById");

CREATE INDEX "LeadBusiness_organizationId_assignedUserId_operationalStatus_idx"
  ON "LeadBusiness"("organizationId", "assignedUserId", "operationalStatus");
CREATE INDEX "LeadBusiness_organizationId_ownerReachScore_idx"
  ON "LeadBusiness"("organizationId", "ownerReachScore");
CREATE INDEX "LeadBusiness_organizationId_wrongNumber_idx"
  ON "LeadBusiness"("organizationId", "wrongNumber");

ALTER TABLE "CallAttempt" ADD CONSTRAINT "CallAttempt_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CallAttempt" ADD CONSTRAINT "CallAttempt_leadBusinessId_fkey"
  FOREIGN KEY ("leadBusinessId") REFERENCES "LeadBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CallAttempt" ADD CONSTRAINT "CallAttempt_callerUserId_fkey"
  FOREIGN KEY ("callerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CallAttempt" ADD CONSTRAINT "CallAttempt_pendingSessionId_fkey"
  FOREIGN KEY ("pendingSessionId") REFERENCES "PendingCallSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PendingCallSession" ADD CONSTRAINT "PendingCallSession_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PendingCallSession" ADD CONSTRAINT "PendingCallSession_leadBusinessId_fkey"
  FOREIGN KEY ("leadBusinessId") REFERENCES "LeadBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PendingCallSession" ADD CONSTRAINT "PendingCallSession_callerUserId_fkey"
  FOREIGN KEY ("callerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SalesCallback" ADD CONSTRAINT "SalesCallback_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesCallback" ADD CONSTRAINT "SalesCallback_leadBusinessId_fkey"
  FOREIGN KEY ("leadBusinessId") REFERENCES "LeadBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesCallback" ADD CONSTRAINT "SalesCallback_assignedCallerId_fkey"
  FOREIGN KEY ("assignedCallerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesCallback" ADD CONSTRAINT "SalesCallback_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesCallback" ADD CONSTRAINT "SalesCallback_linkedCallAttemptId_fkey"
  FOREIGN KEY ("linkedCallAttemptId") REFERENCES "CallAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LeadLock" ADD CONSTRAINT "LeadLock_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadLock" ADD CONSTRAINT "LeadLock_leadBusinessId_fkey"
  FOREIGN KEY ("leadBusinessId") REFERENCES "LeadBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadLock" ADD CONSTRAINT "LeadLock_lockedByUserId_fkey"
  FOREIGN KEY ("lockedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CallingPolicy" ADD CONSTRAINT "CallingPolicy_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OwnerReachScoreReview" ADD CONSTRAINT "OwnerReachScoreReview_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OwnerReachScoreReview" ADD CONSTRAINT "OwnerReachScoreReview_leadBusinessId_fkey"
  FOREIGN KEY ("leadBusinessId") REFERENCES "LeadBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OwnerReachScoreReview" ADD CONSTRAINT "OwnerReachScoreReview_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
