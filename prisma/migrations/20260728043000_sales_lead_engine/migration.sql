-- AlterTable
ALTER TABLE "RevenueContract" ADD COLUMN     "sourceOpportunityId" TEXT;

-- CreateTable
CREATE TABLE "LeadCampaign" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "subIndustry" TEXT,
    "country" TEXT NOT NULL DEFAULT 'United States',
    "state" TEXT,
    "metroArea" TEXT,
    "city" TEXT,
    "searchRadiusMiles" INTEGER,
    "searchTerms" TEXT[],
    "minReviewCount" INTEGER,
    "maxReviewCount" INTEGER,
    "minRating" DECIMAL(3,2),
    "maxRating" DECIMAL(3,2),
    "ownerOperatedOnly" BOOLEAN NOT NULL DEFAULT false,
    "excludeFranchises" BOOLEAN NOT NULL DEFAULT true,
    "excludeSuppliers" BOOLEAN NOT NULL DEFAULT true,
    "excludeSchools" BOOLEAN NOT NULL DEFAULT true,
    "excludeJobListings" BOOLEAN NOT NULL DEFAULT true,
    "excludeParts" BOOLEAN NOT NULL DEFAULT true,
    "targetLeadCount" INTEGER NOT NULL DEFAULT 100,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sourceProvider" TEXT NOT NULL DEFAULT 'google_places',
    "createdByUserId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadBusiness" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "normalizedBusinessName" TEXT NOT NULL,
    "primaryPhone" TEXT,
    "normalizedPhone" TEXT,
    "websiteUrl" TEXT,
    "normalizedDomain" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'United States',
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "industry" TEXT,
    "subIndustry" TEXT,
    "googlePlaceId" TEXT,
    "googleMapsUrl" TEXT,
    "rating" DECIMAL(3,2),
    "reviewCount" INTEGER,
    "businessStatus" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "sourceRecordId" TEXT,
    "franchiseStatus" TEXT,
    "ownerOperatedLikelihood" INTEGER,
    "estimatedCompanySize" TEXT,
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadBusiness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadContact" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadBusinessId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "fullName" TEXT,
    "jobTitle" TEXT,
    "role" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "isDecisionMaker" BOOLEAN NOT NULL DEFAULT false,
    "confidenceScore" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "verificationStatus" TEXT NOT NULL DEFAULT 'unverified',
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadCampaignMembership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "leadBusinessId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceRank" INTEGER,
    "searchQuery" TEXT,
    "originalResultPosition" INTEGER,
    "campaignStatus" TEXT NOT NULL DEFAULT 'new',

    CONSTRAINT "LeadCampaignMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadAnalysis" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadBusinessId" TEXT NOT NULL,
    "websiteStatus" TEXT NOT NULL DEFAULT 'unknown',
    "websiteQualityScore" INTEGER NOT NULL DEFAULT 0,
    "mobileQualityScore" INTEGER NOT NULL DEFAULT 0,
    "conversionQualityScore" INTEGER NOT NULL DEFAULT 0,
    "seoWeaknessScore" INTEGER NOT NULL DEFAULT 0,
    "gbpWeaknessScore" INTEGER NOT NULL DEFAULT 0,
    "automationOpportunityScore" INTEGER NOT NULL DEFAULT 0,
    "ownerAccessibilityScore" INTEGER NOT NULL DEFAULT 0,
    "abilityToPayScore" INTEGER NOT NULL DEFAULT 0,
    "urgencyScore" INTEGER NOT NULL DEFAULT 0,
    "overallFitScore" INTEGER NOT NULL DEFAULT 0,
    "classification" TEXT NOT NULL DEFAULT 'needs_review',
    "primaryWeaknesses" TEXT[],
    "recommendedService" TEXT,
    "researchSummary" TEXT,
    "evidence" JSONB NOT NULL,
    "analyzerVersion" TEXT NOT NULL DEFAULT 'deterministic-v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadBusinessId" TEXT NOT NULL,
    "primaryContactId" TEXT,
    "assignedUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "priority" TEXT NOT NULL DEFAULT 'standard',
    "leadSource" TEXT NOT NULL DEFAULT 'manual',
    "leadCampaignId" TEXT,
    "lastContactAt" TIMESTAMP(3),
    "nextActionAt" TIMESTAMP(3),
    "nextActionType" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "noAnswerCount" INTEGER NOT NULL DEFAULT 0,
    "conversationCount" INTEGER NOT NULL DEFAULT 0,
    "estimatedValueCents" INTEGER,
    "recommendedService" TEXT,
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachAttempt" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "userId" TEXT,
    "contactId" TEXT,
    "channel" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'outbound',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "outcome" TEXT NOT NULL,
    "notes" TEXT,
    "externalProvider" TEXT,
    "externalActivityId" TEXT,
    "recordingUrl" TEXT,
    "transcriptStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutreachAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "assignedUserId" TEXT,
    "relatedOutreachAttemptId" TEXT,
    "type" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'standard',
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "assignedSetterId" TEXT,
    "assignedCloserId" TEXT,
    "contactId" TEXT,
    "title" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "meetingType" TEXT NOT NULL DEFAULT 'discovery',
    "meetingUrl" TEXT,
    "location" TEXT,
    "bookingSource" TEXT,
    "notes" TEXT,
    "confirmationStatus" TEXT NOT NULL DEFAULT 'pending',
    "reminderStatus" TEXT NOT NULL DEFAULT 'not_sent',
    "externalCalendarId" TEXT,
    "externalEventId" TEXT,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pipeline" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineStage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "defaultProbability" INTEGER NOT NULL DEFAULT 10,
    "isWonStage" BOOLEAN NOT NULL DEFAULT false,
    "isLostStage" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "clientId" TEXT,
    "assignedCloserId" TEXT,
    "name" TEXT NOT NULL,
    "pipelineStageId" TEXT NOT NULL,
    "serviceOfferingId" TEXT,
    "estimatedValueCents" INTEGER NOT NULL,
    "weightedValueCents" INTEGER NOT NULL,
    "probabilityPercent" INTEGER NOT NULL,
    "expectedCloseDate" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3),
    "nextActionAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'open',
    "lossReason" TEXT,
    "notes" TEXT,
    "wonAt" TIMESTAMP(3),
    "lostAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesGoal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "teamId" TEXT,
    "periodType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "metric" TEXT NOT NULL,
    "targetValue" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactSuppression" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "leadBusinessId" TEXT,
    "prospectId" TEXT,
    "channel" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdById" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactSuppression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackgroundJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "input" JSONB NOT NULL,
    "progressCurrent" INTEGER NOT NULL DEFAULT 0,
    "progressTotal" INTEGER NOT NULL DEFAULT 0,
    "resultSummary" JSONB,
    "errorMessage" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lockedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "heartbeatAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadCampaign_organizationId_status_idx" ON "LeadCampaign"("organizationId", "status");

-- CreateIndex
CREATE INDEX "LeadCampaign_organizationId_sourceProvider_idx" ON "LeadCampaign"("organizationId", "sourceProvider");

-- CreateIndex
CREATE INDEX "LeadCampaign_organizationId_industry_city_state_idx" ON "LeadCampaign"("organizationId", "industry", "city", "state");

-- CreateIndex
CREATE INDEX "LeadCampaign_createdByUserId_idx" ON "LeadCampaign"("createdByUserId");

-- CreateIndex
CREATE INDEX "LeadBusiness_organizationId_normalizedPhone_idx" ON "LeadBusiness"("organizationId", "normalizedPhone");

-- CreateIndex
CREATE INDEX "LeadBusiness_organizationId_normalizedDomain_idx" ON "LeadBusiness"("organizationId", "normalizedDomain");

-- CreateIndex
CREATE INDEX "LeadBusiness_organizationId_normalizedBusinessName_address_idx" ON "LeadBusiness"("organizationId", "normalizedBusinessName", "address");

-- CreateIndex
CREATE INDEX "LeadBusiness_organizationId_industry_city_state_idx" ON "LeadBusiness"("organizationId", "industry", "city", "state");

-- CreateIndex
CREATE INDEX "LeadBusiness_organizationId_archivedAt_idx" ON "LeadBusiness"("organizationId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LeadBusiness_organizationId_googlePlaceId_key" ON "LeadBusiness"("organizationId", "googlePlaceId");

-- CreateIndex
CREATE INDEX "LeadContact_organizationId_leadBusinessId_idx" ON "LeadContact"("organizationId", "leadBusinessId");

-- CreateIndex
CREATE INDEX "LeadContact_organizationId_email_idx" ON "LeadContact"("organizationId", "email");

-- CreateIndex
CREATE INDEX "LeadContact_organizationId_phone_idx" ON "LeadContact"("organizationId", "phone");

-- CreateIndex
CREATE INDEX "LeadCampaignMembership_organizationId_campaignStatus_idx" ON "LeadCampaignMembership"("organizationId", "campaignStatus");

-- CreateIndex
CREATE INDEX "LeadCampaignMembership_organizationId_leadBusinessId_idx" ON "LeadCampaignMembership"("organizationId", "leadBusinessId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadCampaignMembership_campaignId_leadBusinessId_key" ON "LeadCampaignMembership"("campaignId", "leadBusinessId");

-- CreateIndex
CREATE INDEX "LeadAnalysis_organizationId_classification_idx" ON "LeadAnalysis"("organizationId", "classification");

-- CreateIndex
CREATE INDEX "LeadAnalysis_organizationId_leadBusinessId_createdAt_idx" ON "LeadAnalysis"("organizationId", "leadBusinessId", "createdAt");

-- CreateIndex
CREATE INDEX "Prospect_organizationId_assignedUserId_status_idx" ON "Prospect"("organizationId", "assignedUserId", "status");

-- CreateIndex
CREATE INDEX "Prospect_organizationId_nextActionAt_idx" ON "Prospect"("organizationId", "nextActionAt");

-- CreateIndex
CREATE INDEX "Prospect_organizationId_priority_status_idx" ON "Prospect"("organizationId", "priority", "status");

-- CreateIndex
CREATE INDEX "Prospect_organizationId_leadCampaignId_idx" ON "Prospect"("organizationId", "leadCampaignId");

-- CreateIndex
CREATE UNIQUE INDEX "Prospect_organizationId_leadBusinessId_archivedAt_key" ON "Prospect"("organizationId", "leadBusinessId", "archivedAt");

-- CreateIndex
CREATE INDEX "OutreachAttempt_organizationId_userId_startedAt_idx" ON "OutreachAttempt"("organizationId", "userId", "startedAt");

-- CreateIndex
CREATE INDEX "OutreachAttempt_organizationId_prospectId_startedAt_idx" ON "OutreachAttempt"("organizationId", "prospectId", "startedAt");

-- CreateIndex
CREATE INDEX "OutreachAttempt_organizationId_outcome_idx" ON "OutreachAttempt"("organizationId", "outcome");

-- CreateIndex
CREATE INDEX "OutreachAttempt_externalProvider_externalActivityId_idx" ON "OutreachAttempt"("externalProvider", "externalActivityId");

-- CreateIndex
CREATE INDEX "FollowUp_organizationId_assignedUserId_status_idx" ON "FollowUp"("organizationId", "assignedUserId", "status");

-- CreateIndex
CREATE INDEX "FollowUp_organizationId_dueAt_idx" ON "FollowUp"("organizationId", "dueAt");

-- CreateIndex
CREATE INDEX "FollowUp_organizationId_prospectId_status_idx" ON "FollowUp"("organizationId", "prospectId", "status");

-- CreateIndex
CREATE INDEX "Appointment_organizationId_assignedSetterId_startAt_idx" ON "Appointment"("organizationId", "assignedSetterId", "startAt");

-- CreateIndex
CREATE INDEX "Appointment_organizationId_assignedCloserId_startAt_idx" ON "Appointment"("organizationId", "assignedCloserId", "startAt");

-- CreateIndex
CREATE INDEX "Appointment_organizationId_startAt_idx" ON "Appointment"("organizationId", "startAt");

-- CreateIndex
CREATE INDEX "Appointment_organizationId_status_idx" ON "Appointment"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Appointment_organizationId_opportunityId_idx" ON "Appointment"("organizationId", "opportunityId");

-- CreateIndex
CREATE INDEX "Pipeline_organizationId_isDefault_idx" ON "Pipeline"("organizationId", "isDefault");

-- CreateIndex
CREATE INDEX "Pipeline_organizationId_archivedAt_idx" ON "Pipeline"("organizationId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Pipeline_organizationId_name_key" ON "Pipeline"("organizationId", "name");

-- CreateIndex
CREATE INDEX "PipelineStage_organizationId_pipelineId_sortOrder_idx" ON "PipelineStage"("organizationId", "pipelineId", "sortOrder");

-- CreateIndex
CREATE INDEX "PipelineStage_organizationId_isWonStage_isLostStage_idx" ON "PipelineStage"("organizationId", "isWonStage", "isLostStage");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineStage_pipelineId_name_key" ON "PipelineStage"("pipelineId", "name");

-- CreateIndex
CREATE INDEX "Opportunity_organizationId_pipelineStageId_idx" ON "Opportunity"("organizationId", "pipelineStageId");

-- CreateIndex
CREATE INDEX "Opportunity_organizationId_assignedCloserId_status_idx" ON "Opportunity"("organizationId", "assignedCloserId", "status");

-- CreateIndex
CREATE INDEX "Opportunity_organizationId_expectedCloseDate_idx" ON "Opportunity"("organizationId", "expectedCloseDate");

-- CreateIndex
CREATE INDEX "Opportunity_organizationId_prospectId_idx" ON "Opportunity"("organizationId", "prospectId");

-- CreateIndex
CREATE INDEX "Opportunity_organizationId_clientId_idx" ON "Opportunity"("organizationId", "clientId");

-- CreateIndex
CREATE INDEX "Opportunity_organizationId_status_idx" ON "Opportunity"("organizationId", "status");

-- CreateIndex
CREATE INDEX "SalesGoal_organizationId_userId_metric_startDate_endDate_idx" ON "SalesGoal"("organizationId", "userId", "metric", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "SalesGoal_organizationId_status_idx" ON "SalesGoal"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ContactSuppression_organizationId_phone_channel_idx" ON "ContactSuppression"("organizationId", "phone", "channel");

-- CreateIndex
CREATE INDEX "ContactSuppression_organizationId_email_channel_idx" ON "ContactSuppression"("organizationId", "email", "channel");

-- CreateIndex
CREATE INDEX "ContactSuppression_organizationId_leadBusinessId_idx" ON "ContactSuppression"("organizationId", "leadBusinessId");

-- CreateIndex
CREATE INDEX "ContactSuppression_organizationId_prospectId_idx" ON "ContactSuppression"("organizationId", "prospectId");

-- CreateIndex
CREATE INDEX "BackgroundJob_organizationId_status_type_idx" ON "BackgroundJob"("organizationId", "status", "type");

-- CreateIndex
CREATE INDEX "BackgroundJob_organizationId_campaignId_idx" ON "BackgroundJob"("organizationId", "campaignId");

-- CreateIndex
CREATE INDEX "BackgroundJob_status_lockedAt_idx" ON "BackgroundJob"("status", "lockedAt");

-- CreateIndex
CREATE INDEX "RevenueContract_organizationId_sourceOpportunityId_idx" ON "RevenueContract"("organizationId", "sourceOpportunityId");

-- AddForeignKey
ALTER TABLE "RevenueContract" ADD CONSTRAINT "RevenueContract_sourceOpportunityId_fkey" FOREIGN KEY ("sourceOpportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadCampaign" ADD CONSTRAINT "LeadCampaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadBusiness" ADD CONSTRAINT "LeadBusiness_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadContact" ADD CONSTRAINT "LeadContact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadContact" ADD CONSTRAINT "LeadContact_leadBusinessId_fkey" FOREIGN KEY ("leadBusinessId") REFERENCES "LeadBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadCampaignMembership" ADD CONSTRAINT "LeadCampaignMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadCampaignMembership" ADD CONSTRAINT "LeadCampaignMembership_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "LeadCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadCampaignMembership" ADD CONSTRAINT "LeadCampaignMembership_leadBusinessId_fkey" FOREIGN KEY ("leadBusinessId") REFERENCES "LeadBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAnalysis" ADD CONSTRAINT "LeadAnalysis_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAnalysis" ADD CONSTRAINT "LeadAnalysis_leadBusinessId_fkey" FOREIGN KEY ("leadBusinessId") REFERENCES "LeadBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_leadBusinessId_fkey" FOREIGN KEY ("leadBusinessId") REFERENCES "LeadBusiness"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_primaryContactId_fkey" FOREIGN KEY ("primaryContactId") REFERENCES "LeadContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_leadCampaignId_fkey" FOREIGN KEY ("leadCampaignId") REFERENCES "LeadCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachAttempt" ADD CONSTRAINT "OutreachAttempt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachAttempt" ADD CONSTRAINT "OutreachAttempt_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachAttempt" ADD CONSTRAINT "OutreachAttempt_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "LeadContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_relatedOutreachAttemptId_fkey" FOREIGN KEY ("relatedOutreachAttemptId") REFERENCES "OutreachAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "LeadContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pipeline" ADD CONSTRAINT "Pipeline_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_pipelineStageId_fkey" FOREIGN KEY ("pipelineStageId") REFERENCES "PipelineStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_serviceOfferingId_fkey" FOREIGN KEY ("serviceOfferingId") REFERENCES "ServiceOffering"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesGoal" ADD CONSTRAINT "SalesGoal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactSuppression" ADD CONSTRAINT "ContactSuppression_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactSuppression" ADD CONSTRAINT "ContactSuppression_leadBusinessId_fkey" FOREIGN KEY ("leadBusinessId") REFERENCES "LeadBusiness"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactSuppression" ADD CONSTRAINT "ContactSuppression_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackgroundJob" ADD CONSTRAINT "BackgroundJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackgroundJob" ADD CONSTRAINT "BackgroundJob_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "LeadCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

