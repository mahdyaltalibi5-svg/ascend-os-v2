-- CreateEnum
CREATE TYPE "PersonalItemStatus" AS ENUM ('OPEN', 'DONE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FocusBlockStatus" AS ENUM ('PLANNED', 'DONE', 'SKIPPED');

-- CreateTable
CREATE TABLE "PersonalPriority" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "status" "PersonalItemStatus" NOT NULL DEFAULT 'OPEN',
    "urgency" TEXT NOT NULL DEFAULT 'normal',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalPriority_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatingNote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperatingNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FocusBlock" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "windowLabel" TEXT NOT NULL,
    "intention" TEXT,
    "status" "FocusBlockStatus" NOT NULL DEFAULT 'PLANNED',
    "startsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FocusBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonalPriority_organizationId_userId_status_createdAt_idx" ON "PersonalPriority"("organizationId", "userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PersonalPriority_userId_status_idx" ON "PersonalPriority"("userId", "status");

-- CreateIndex
CREATE INDEX "OperatingNote_organizationId_userId_pinned_createdAt_idx" ON "OperatingNote"("organizationId", "userId", "pinned", "createdAt");

-- CreateIndex
CREATE INDEX "OperatingNote_userId_createdAt_idx" ON "OperatingNote"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FocusBlock_organizationId_userId_status_createdAt_idx" ON "FocusBlock"("organizationId", "userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "FocusBlock_userId_status_idx" ON "FocusBlock"("userId", "status");

-- AddForeignKey
ALTER TABLE "PersonalPriority" ADD CONSTRAINT "PersonalPriority_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalPriority" ADD CONSTRAINT "PersonalPriority_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatingNote" ADD CONSTRAINT "OperatingNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatingNote" ADD CONSTRAINT "OperatingNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FocusBlock" ADD CONSTRAINT "FocusBlock_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FocusBlock" ADD CONSTRAINT "FocusBlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
