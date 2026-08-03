CREATE TABLE "ScraperLeadDiscovery" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT,
    "backgroundJobId" TEXT,
    "sourceProvider" TEXT NOT NULL,
    "sourceQuery" TEXT,
    "sourceRecordId" TEXT,
    "googlePlaceId" TEXT,
    "googleMapsUrl" TEXT,
    "businessName" TEXT NOT NULL,
    "normalizedBusinessName" TEXT NOT NULL,
    "trade" TEXT,
    "phone" TEXT,
    "normalizedPhone" TEXT,
    "websiteUrl" TEXT,
    "normalizedDomain" TEXT,
    "googleBusinessProfileUrl" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'United States',
    "rating" DECIMAL(3,2),
    "reviewCount" INTEGER,
    "businessStatus" TEXT,
    "status" TEXT NOT NULL DEFAULT 'discovered',
    "phoneVerificationStatus" TEXT NOT NULL DEFAULT 'unable_to_verify',
    "phoneVerificationSource" TEXT,
    "phoneVerificationDate" TIMESTAMP(3),
    "ownerName" TEXT,
    "ownerVerificationSource" TEXT,
    "ownerVerificationMethod" TEXT,
    "ownerConfidence" TEXT NOT NULL DEFAULT 'unverified',
    "ownerVerificationDate" TIMESTAMP(3),
    "ownerReachScore" INTEGER NOT NULL DEFAULT 0,
    "marketingNeedScore" INTEGER NOT NULL DEFAULT 0,
    "dataConfidenceScore" INTEGER NOT NULL DEFAULT 0,
    "callPriorityScore" INTEGER NOT NULL DEFAULT 0,
    "ownerReachReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "marketingNeedReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dataConfidenceReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "duplicateWarnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sourceUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rejectionReason" TEXT,
    "approvedLeadBusinessId" TEXT,
    "assignedUserId" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScraperLeadDiscovery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScraperMarketingWeakness" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "discoveryId" TEXT NOT NULL,
    "signal" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "severity" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScraperMarketingWeakness_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScraperScoringPolicy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default scraper scoring',
    "ownerReachWeight" INTEGER NOT NULL DEFAULT 40,
    "marketingNeedWeight" INTEGER NOT NULL DEFAULT 40,
    "dataConfidenceWeight" INTEGER NOT NULL DEFAULT 20,
    "minimumConfidence" INTEGER NOT NULL DEFAULT 70,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScraperScoringPolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScraperDomainRateLimit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "lastFetchedAt" TIMESTAMP(3),
    "fetchCount" INTEGER NOT NULL DEFAULT 0,
    "lastStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScraperDomainRateLimit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScraperLeadDiscovery_organizationId_status_createdAt_idx" ON "ScraperLeadDiscovery"("organizationId", "status", "createdAt");
CREATE INDEX "ScraperLeadDiscovery_organizationId_campaignId_idx" ON "ScraperLeadDiscovery"("organizationId", "campaignId");
CREATE INDEX "ScraperLeadDiscovery_organizationId_backgroundJobId_idx" ON "ScraperLeadDiscovery"("organizationId", "backgroundJobId");
CREATE INDEX "ScraperLeadDiscovery_organizationId_normalizedPhone_idx" ON "ScraperLeadDiscovery"("organizationId", "normalizedPhone");
CREATE INDEX "ScraperLeadDiscovery_organizationId_normalizedDomain_idx" ON "ScraperLeadDiscovery"("organizationId", "normalizedDomain");
CREATE INDEX "ScraperLeadDiscovery_organizationId_normalizedBusinessName_idx" ON "ScraperLeadDiscovery"("organizationId", "normalizedBusinessName");
CREATE INDEX "ScraperLeadDiscovery_organizationId_googlePlaceId_idx" ON "ScraperLeadDiscovery"("organizationId", "googlePlaceId");
CREATE INDEX "ScraperLeadDiscovery_organizationId_callPriorityScore_idx" ON "ScraperLeadDiscovery"("organizationId", "callPriorityScore");

CREATE INDEX "ScraperMarketingWeakness_organizationId_discoveryId_idx" ON "ScraperMarketingWeakness"("organizationId", "discoveryId");
CREATE INDEX "ScraperMarketingWeakness_organizationId_signal_idx" ON "ScraperMarketingWeakness"("organizationId", "signal");
CREATE INDEX "ScraperMarketingWeakness_organizationId_severity_idx" ON "ScraperMarketingWeakness"("organizationId", "severity");

CREATE INDEX "ScraperScoringPolicy_organizationId_active_idx" ON "ScraperScoringPolicy"("organizationId", "active");

CREATE UNIQUE INDEX "ScraperDomainRateLimit_organizationId_domain_key" ON "ScraperDomainRateLimit"("organizationId", "domain");
CREATE INDEX "ScraperDomainRateLimit_organizationId_lastFetchedAt_idx" ON "ScraperDomainRateLimit"("organizationId", "lastFetchedAt");

ALTER TABLE "ScraperLeadDiscovery" ADD CONSTRAINT "ScraperLeadDiscovery_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScraperLeadDiscovery" ADD CONSTRAINT "ScraperLeadDiscovery_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "LeadCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScraperLeadDiscovery" ADD CONSTRAINT "ScraperLeadDiscovery_backgroundJobId_fkey" FOREIGN KEY ("backgroundJobId") REFERENCES "BackgroundJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScraperLeadDiscovery" ADD CONSTRAINT "ScraperLeadDiscovery_approvedLeadBusinessId_fkey" FOREIGN KEY ("approvedLeadBusinessId") REFERENCES "LeadBusiness"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScraperLeadDiscovery" ADD CONSTRAINT "ScraperLeadDiscovery_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ScraperMarketingWeakness" ADD CONSTRAINT "ScraperMarketingWeakness_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScraperMarketingWeakness" ADD CONSTRAINT "ScraperMarketingWeakness_discoveryId_fkey" FOREIGN KEY ("discoveryId") REFERENCES "ScraperLeadDiscovery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScraperScoringPolicy" ADD CONSTRAINT "ScraperScoringPolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScraperDomainRateLimit" ADD CONSTRAINT "ScraperDomainRateLimit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
