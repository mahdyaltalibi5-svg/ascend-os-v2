-- Extend focus-block states without rewriting existing rows.
ALTER TYPE "FocusBlockStatus" ADD VALUE IF NOT EXISTS 'ACTIVE';
ALTER TYPE "FocusBlockStatus" ADD VALUE IF NOT EXISTS 'PAUSED';
ALTER TYPE "FocusBlockStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- Expand notification preferences for in-app Personal OS reminders.
ALTER TABLE "NotificationPreference" ADD COLUMN "criticalDue" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "NotificationPreference" ADD COLUMN "overdue" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "NotificationPreference" ADD COLUMN "focusStarting" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "NotificationPreference" ADD COLUMN "goalBehind" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "NotificationPreference" ADD COLUMN "dailyPlan" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "NotificationPreference" ADD COLUMN "dailyReview" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "NotificationPreference" ADD COLUMN "repeatedCarry" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "NotificationPreference" ADD COLUMN "longRunning" BOOLEAN NOT NULL DEFAULT true;

-- Expand priorities while preserving existing title/notes/status/urgency data.
ALTER TABLE "PersonalPriority" ADD COLUMN "description" TEXT;
ALTER TABLE "PersonalPriority" ADD COLUMN "priorityLevel" TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE "PersonalPriority" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'other';
ALTER TABLE "PersonalPriority" ADD COLUMN "timeframe" TEXT NOT NULL DEFAULT 'today';
ALTER TABLE "PersonalPriority" ADD COLUMN "dueTime" TEXT;
ALTER TABLE "PersonalPriority" ADD COLUMN "estimatedMinutes" INTEGER;
ALTER TABLE "PersonalPriority" ADD COLUMN "estimatedRevenueImpact" DECIMAL(12, 2);
ALTER TABLE "PersonalPriority" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PersonalPriority" ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PersonalPriority" ADD COLUMN "carryoverCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PersonalPriority" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "PersonalPriority" ADD COLUMN "deletedAt" TIMESTAMP(3);

UPDATE "PersonalPriority"
SET "priorityLevel" =
  CASE
    WHEN "urgency" = 'critical' THEN 'critical'
    WHEN "urgency" = 'high' THEN 'high'
    WHEN "urgency" = 'low' THEN 'low'
    ELSE 'medium'
  END
WHERE "priorityLevel" = 'medium';

UPDATE "PersonalPriority"
SET "archivedAt" = COALESCE("archivedAt", "updatedAt")
WHERE "status" = 'ARCHIVED' AND "archivedAt" IS NULL;

-- Expand notes with searchable/filterable metadata.
ALTER TABLE "OperatingNote" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'idea';
ALTER TABLE "OperatingNote" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "OperatingNote" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "OperatingNote" ADD COLUMN "convertedPriorityId" TEXT;

-- Expand focus blocks for real timer state and future calendar sync.
ALTER TABLE "FocusBlock" ADD COLUMN "priorityId" TEXT;
ALTER TABLE "FocusBlock" ADD COLUMN "endsAt" TIMESTAMP(3);
ALTER TABLE "FocusBlock" ADD COLUMN "plannedMinutes" INTEGER;
ALTER TABLE "FocusBlock" ADD COLUMN "actualStartAt" TIMESTAMP(3);
ALTER TABLE "FocusBlock" ADD COLUMN "actualEndAt" TIMESTAMP(3);
ALTER TABLE "FocusBlock" ADD COLUMN "actualFocusedMinutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "FocusBlock" ADD COLUMN "pausedAt" TIMESTAMP(3);
ALTER TABLE "FocusBlock" ADD COLUMN "interruptionCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "FocusBlock" ADD COLUMN "completionNote" TEXT;
ALTER TABLE "FocusBlock" ADD COLUMN "calendarEventId" TEXT;
ALTER TABLE "FocusBlock" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "FocusBlock" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "FocusBlock"
  ADD CONSTRAINT "FocusBlock_priorityId_fkey"
  FOREIGN KEY ("priorityId") REFERENCES "PersonalPriority"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Daily planning and review.
CREATE TABLE "DailyPlan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "dailyIntention" TEXT,
    "topOutcome1" TEXT,
    "topOutcome2" TEXT,
    "topOutcome3" TEXT,
    "mainRisk" TEXT,
    "status" TEXT NOT NULL DEFAULT 'STARTED',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "completionSummary" TEXT,
    "progressMade" TEXT,
    "timeWasted" TEXT,
    "blockedBy" TEXT,
    "carryForward" TEXT,
    "removeTomorrow" TEXT,
    "tomorrowFirstAction" TEXT,
    "founderRating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyPlan_pkey" PRIMARY KEY ("id")
);

-- Goals are manual now and integration-ready later.
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "goalType" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'other',
    "metricType" TEXT NOT NULL DEFAULT 'count',
    "targetValue" DECIMAL(14, 2) NOT NULL DEFAULT 1,
    "currentValue" DECIMAL(14, 2) NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "unit" TEXT NOT NULL DEFAULT 'count',
    "ownerId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- In-app notifications are generated from stored data and kept tenant/user scoped.
CREATE TABLE "InAppNotification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "readAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InAppNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyPlan_organizationId_userId_dateKey_key" ON "DailyPlan"("organizationId", "userId", "dateKey");
CREATE INDEX "DailyPlan_organizationId_userId_status_idx" ON "DailyPlan"("organizationId", "userId", "status");
CREATE INDEX "DailyPlan_organizationId_userId_dateKey_idx" ON "DailyPlan"("organizationId", "userId", "dateKey");

CREATE INDEX "Goal_organizationId_userId_goalType_status_idx" ON "Goal"("organizationId", "userId", "goalType", "status");
CREATE INDEX "Goal_organizationId_userId_startDate_endDate_idx" ON "Goal"("organizationId", "userId", "startDate", "endDate");
CREATE INDEX "Goal_organizationId_userId_archivedAt_idx" ON "Goal"("organizationId", "userId", "archivedAt");

CREATE INDEX "InAppNotification_organizationId_userId_readAt_createdAt_idx" ON "InAppNotification"("organizationId", "userId", "readAt", "createdAt");
CREATE INDEX "InAppNotification_organizationId_userId_type_idx" ON "InAppNotification"("organizationId", "userId", "type");

CREATE INDEX "PersonalPriority_organizationId_userId_status_timeframe_sortOrder_idx" ON "PersonalPriority"("organizationId", "userId", "status", "timeframe", "sortOrder");
CREATE INDEX "PersonalPriority_organizationId_userId_dueDate_idx" ON "PersonalPriority"("organizationId", "userId", "dueDate");
CREATE INDEX "PersonalPriority_organizationId_userId_archivedAt_idx" ON "PersonalPriority"("organizationId", "userId", "archivedAt");

CREATE INDEX "OperatingNote_organizationId_userId_pinned_archivedAt_createdAt_idx" ON "OperatingNote"("organizationId", "userId", "pinned", "archivedAt", "createdAt");
CREATE INDEX "OperatingNote_organizationId_userId_category_idx" ON "OperatingNote"("organizationId", "userId", "category");

CREATE INDEX "FocusBlock_organizationId_userId_status_startsAt_idx" ON "FocusBlock"("organizationId", "userId", "status", "startsAt");
CREATE INDEX "FocusBlock_organizationId_userId_startsAt_idx" ON "FocusBlock"("organizationId", "userId", "startsAt");
CREATE INDEX "FocusBlock_organizationId_userId_archivedAt_idx" ON "FocusBlock"("organizationId", "userId", "archivedAt");
CREATE INDEX "FocusBlock_priorityId_idx" ON "FocusBlock"("priorityId");

ALTER TABLE "DailyPlan" ADD CONSTRAINT "DailyPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyPlan" ADD CONSTRAINT "DailyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InAppNotification" ADD CONSTRAINT "InAppNotification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InAppNotification" ADD CONSTRAINT "InAppNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
