import { Prisma } from "@prisma/client";

import type { PermissionKey } from "@/lib/permissions";
import { crmLeadScore, normalizePhone } from "@/lib/sales/normalization";
import { getLeadSourceProvider, normalizeProviderResult } from "@/lib/sales/providers";
import type { LeadSourceProvider, ProviderLeadResult } from "@/lib/sales/providers";
import {
  SCRAPER_USER_AGENT,
  buildScraperSearchPlan,
  classifyTrade,
  detectMarketingWeaknesses,
  detectOwnerEvidence,
  duplicateWarningsFor,
  extractPhoneNumbers,
  isOfficialScraperPhoneVerification,
  isUtahResult,
  normalizeScraperDiscovery,
  phoneMethodForScraperStatus,
  scoreDiscovery,
  scraperPhoneTypeForOwnerConfidence,
  scraperStatusFor,
  verifyPhone,
  type ScraperTrade,
  type ScraperWeakness
} from "@/lib/sales/scraper";
import { fetchWithSafety } from "@/lib/sales/url-safety";
import { writeAuditEvent } from "@/lib/server/audit";
import { getCurrentSession } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { requireOrganizationContext } from "@/lib/server/organization";
import type {
  scraperJobSchema,
  scraperPolicySchema,
  scraperReviewSchema
} from "@/lib/validation/sales";

type ScraperContext = {
  userId: string;
  organizationId: string;
  permissions: string[];
  timezone: string;
};

type ScraperJobInput = ReturnType<typeof scraperJobSchema.parse>;
type ScraperReviewInput = ReturnType<typeof scraperReviewSchema.parse>;
type ScraperPolicyInput = ReturnType<typeof scraperPolicySchema.parse>;

type WebsiteFetchResult = {
  finalUrl: string;
  status: number;
  html: string;
  contentType?: string;
  responseMs?: number;
};

type ProcessScraperOptions = {
  provider?: LeadSourceProvider;
  fetchWebsite?: (url: string) => Promise<WebsiteFetchResult>;
  now?: Date;
};

export type ScraperDashboardData = Awaited<ReturnType<typeof getScraperDashboardData>>;

export async function getScraperContext(): Promise<ScraperContext> {
  const session = await getCurrentSession();
  if (!session?.user?.id) throw new Error("AUTHENTICATION_REQUIRED");
  const context = await requireOrganizationContext(session.user.id);
  if (!context.permissions.includes("scraper.view")) throw new Error("FORBIDDEN");
  return {
    userId: session.user.id,
    organizationId: context.organization.id,
    permissions: context.permissions,
    timezone: context.organization.timezone
  };
}

export async function getScraperDashboardData(context: ScraperContext) {
  assertPermission(context, "scraper.view");
  const policy = await ensureScoringPolicy(context.organizationId);
  const [jobs, discoveries, members, recentSuppressions] = await prisma.$transaction([
    prisma.backgroundJob.findMany({
      where: { organizationId: context.organizationId, type: "lead_scraper_discovery" },
      orderBy: { createdAt: "desc" },
      take: 20
    }),
    prisma.scraperLeadDiscovery.findMany({
      where: { organizationId: context.organizationId },
      include: { weaknesses: true, approvedLeadBusiness: true, reviewedBy: true },
      orderBy: [{ status: "asc" }, { callPriorityScore: "desc" }, { createdAt: "desc" }],
      take: 80
    }),
    prisma.organizationMembership.findMany({
      where: { organizationId: context.organizationId, status: "ACTIVE" },
      include: { user: true, roles: { include: { role: true } } },
      orderBy: { createdAt: "asc" }
    }),
    prisma.contactSuppression.findMany({
      where: { organizationId: context.organizationId, permanent: true },
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ]);
  const provider = getLeadSourceProvider("google_places");
  const reviewQueue = discoveries.filter((discovery) =>
    ["call_ready", "verified", "needs_manual_review", "source_mismatch"].includes(discovery.status)
  );

  return {
    jobs,
    discoveries,
    reviewQueue,
    policy,
    members,
    recentSuppressions,
    providerStatus: {
      googlePlacesConfigured: provider.enabled,
      workerSecretConfigured: Boolean(process.env.SALES_WORKER_SECRET || process.env.CRON_SECRET)
    },
    metrics: {
      totalDiscovered: discoveries.length,
      callReady: discoveries.filter((discovery) => discovery.status === "call_ready").length,
      needsReview: discoveries.filter((discovery) => discovery.status === "needs_manual_review")
        .length,
      approved: discoveries.filter((discovery) => discovery.status === "approved").length,
      rejected: discoveries.filter((discovery) => discovery.status === "rejected").length,
      suppressed: discoveries.filter((discovery) => discovery.status === "suppressed").length
    }
  };
}

export async function createScraperJob(context: ScraperContext, input: ScraperJobInput) {
  assertPermission(context, "scraper.manage");
  const provider = getLeadSourceProvider(input.sourceProvider);
  if (!provider.enabled) throw new Error("GOOGLE_PLACES_API_KEY is not configured.");
  const plan = buildScraperSearchPlan({
    cities: input.cities,
    trades: input.trades as ScraperTrade[],
    limitPerSearch: input.limitPerSearch
  });
  const job = await prisma.backgroundJob.create({
    data: {
      organizationId: context.organizationId,
      type: "lead_scraper_discovery",
      status: "queued",
      input: {
        sourceProvider: input.sourceProvider,
        cities: input.cities,
        trades: input.trades,
        limitPerSearch: input.limitPerSearch,
        plan
      },
      progressTotal: plan.reduce((total, item) => total + item.limit, 0),
      maxAttempts: 2
    }
  });
  await audit(context, "scraper.job.created", "BackgroundJob", job.id, {
    cities: input.cities,
    trades: input.trades,
    limitPerSearch: input.limitPerSearch
  });
  return job;
}

export async function cancelScraperJob(context: ScraperContext, jobId: string) {
  assertPermission(context, "scraper.manage");
  const job = await prisma.backgroundJob.findFirstOrThrow({
    where: { id: jobId, organizationId: context.organizationId, type: "lead_scraper_discovery" }
  });
  if (!["queued", "running", "failed"].includes(job.status)) throw new Error("JOB_NOT_CANCELABLE");
  const updated = await prisma.backgroundJob.update({
    where: { id: job.id },
    data: { status: "cancelled", completedAt: new Date(), lockedAt: null }
  });
  await audit(context, "scraper.job.cancelled", "BackgroundJob", job.id, {});
  return updated;
}

export async function retryScraperJob(context: ScraperContext, jobId: string) {
  assertPermission(context, "scraper.manage");
  const job = await prisma.backgroundJob.findFirstOrThrow({
    where: { id: jobId, organizationId: context.organizationId, type: "lead_scraper_discovery" }
  });
  if (!["failed", "cancelled"].includes(job.status)) throw new Error("JOB_NOT_RETRYABLE");
  const updated = await prisma.backgroundJob.update({
    where: { id: job.id },
    data: {
      status: "queued",
      errorMessage: null,
      completedAt: null,
      lockedAt: null,
      progressCurrent: 0,
      resultSummary: Prisma.JsonNull
    }
  });
  await audit(context, "scraper.job.retried", "BackgroundJob", job.id, {});
  return updated;
}

export async function processScraperJobs(limit = 1, options: ProcessScraperOptions = {}) {
  const jobs = await prisma.backgroundJob.findMany({
    where: { status: "queued", type: "lead_scraper_discovery" },
    orderBy: { createdAt: "asc" },
    take: limit
  });
  const summaries: Array<{ jobId: string; stored: number; rejected: number; status: string }> = [];

  for (const job of jobs) {
    const context = {
      organizationId: job.organizationId,
      userId: null
    };
    const locked = await prisma.backgroundJob.update({
      where: { id: job.id },
      data: {
        status: "running",
        lockedAt: options.now ?? new Date(),
        startedAt: job.startedAt ?? options.now ?? new Date(),
        attemptCount: { increment: 1 },
        errorMessage: null
      }
    });

    try {
      const input = locked.input as Prisma.JsonObject;
      const sourceProvider = String(input.sourceProvider ?? "google_places");
      const provider = options.provider ?? getLeadSourceProvider(sourceProvider);
      if (!provider.enabled) throw new Error("GOOGLE_PLACES_API_KEY is not configured.");
      const plan = Array.isArray(input.plan)
        ? (input.plan as Array<{
            city: string;
            trade: ScraperTrade;
            query: string;
            location: string;
            limit: number;
          }>)
        : [];
      let stored = 0;
      let rejected = 0;

      for (const search of plan) {
        const freshJob = await prisma.backgroundJob.findUnique({ where: { id: locked.id } });
        if (freshJob?.status === "cancelled") break;
        const results = await provider.search({
          query: search.query,
          location: search.location,
          limit: search.limit
        });
        for (const result of results) {
          const discovery = await verifyAndStoreDiscovery({
            organizationId: locked.organizationId,
            backgroundJobId: locked.id,
            sourceProvider: provider.key,
            sourceQuery: search.query,
            requestedTrade: search.trade,
            result,
            fetchWebsite: options.fetchWebsite
          });
          if (
            ["not_target_trade", "outside_utah", "suppressed", "duplicate"].includes(
              discovery.status
            )
          ) {
            rejected += 1;
          } else {
            stored += 1;
          }
          await prisma.backgroundJob.update({
            where: { id: locked.id },
            data: { progressCurrent: { increment: 1 }, heartbeatAt: new Date() }
          });
        }
      }

      await prisma.backgroundJob.update({
        where: { id: locked.id },
        data: {
          status: "completed",
          resultSummary: { stored, rejected },
          completedAt: new Date(),
          lockedAt: null
        }
      });
      summaries.push({ jobId: locked.id, stored, rejected, status: "completed" });
      await writeAuditEvent({
        organizationId: context.organizationId,
        action: "scraper.job.completed",
        entityType: "BackgroundJob",
        entityId: locked.id,
        metadata: { stored, rejected }
      });
    } catch (error) {
      await prisma.backgroundJob.update({
        where: { id: locked.id },
        data: {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Scraper job failed",
          completedAt: new Date(),
          lockedAt: null
        }
      });
      summaries.push({ jobId: locked.id, stored: 0, rejected: 0, status: "failed" });
    }
  }

  return summaries;
}

export async function approveScraperDiscovery(context: ScraperContext, input: ScraperReviewInput) {
  assertPermission(context, "scraper.approve");
  if (input.action !== "approve") throw new Error("INVALID_REVIEW_ACTION");
  const discovery = await prisma.scraperLeadDiscovery.findFirstOrThrow({
    where: { id: input.discoveryId, organizationId: context.organizationId },
    include: { weaknesses: true }
  });
  await assertValidAssignee(context.organizationId, input.assignedUserId);

  const businessName = input.businessName || discovery.businessName;
  const phone = input.phone || discovery.phone;
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) throw new Error("INVALID_PHONE");
  if (discovery.trade !== "HVAC" && discovery.trade !== "Plumbing")
    throw new Error("INVALID_TRADE");
  if (discovery.state?.toUpperCase() !== "UT") throw new Error("INVALID_STATE");
  if (!isOfficialScraperPhoneVerification(discovery.phoneVerificationStatus)) {
    throw new Error("CALL_READY_REQUIRES_OFFICIAL_PHONE_EVIDENCE");
  }
  await assertNumberNotSuppressed(context.organizationId, normalizedPhone);
  await assertPhoneAvailable(context.organizationId, normalizedPhone);
  if (discovery.duplicateWarnings.length) throw new Error("DUPLICATE_REVIEW_REQUIRED");

  const phoneVerificationMethod = phoneMethodForScraperStatus(discovery.phoneVerificationStatus);
  const phoneType = scraperPhoneTypeForOwnerConfidence(discovery.ownerConfidence);
  const sourceUrls = Array.from(
    new Set(
      [
        ...discovery.sourceUrls,
        input.websiteUrl || discovery.websiteUrl,
        input.googleBusinessProfileUrl || discovery.googleBusinessProfileUrl
      ].filter(Boolean) as string[]
    )
  ).slice(0, 12);
  const lead = await prisma.$transaction(async (tx) => {
    const created = await tx.leadBusiness.create({
      data: {
        organizationId: context.organizationId,
        businessName,
        normalizedBusinessName: normalizeScraperDiscovery({ businessName }).normalizedBusinessName,
        trade: discovery.trade,
        ownerName: input.ownerName || discovery.ownerName,
        primaryPhone: phone,
        normalizedPhone,
        websiteUrl: input.websiteUrl || discovery.websiteUrl,
        normalizedDomain: normalizeScraperDiscovery({
          businessName,
          websiteUrl: input.websiteUrl || discovery.websiteUrl
        }).normalizedDomain,
        googleBusinessProfileUrl:
          input.googleBusinessProfileUrl || discovery.googleBusinessProfileUrl,
        address: discovery.address,
        city: discovery.city,
        state: discovery.state,
        postalCode: discovery.postalCode,
        country: discovery.country,
        industry: discovery.trade,
        googlePlaceId: discovery.googlePlaceId,
        googleMapsUrl: discovery.googleMapsUrl,
        rating: discovery.rating,
        reviewCount: discovery.reviewCount,
        businessStatus: discovery.businessStatus,
        source: "verified_scraper",
        sourceRecordId: discovery.sourceRecordId,
        sourceUrls,
        ownerVerificationSource: discovery.ownerVerificationSource,
        phoneVerificationSource: discovery.phoneVerificationSource,
        phoneVerificationDate: discovery.phoneVerificationDate ?? new Date(),
        phoneVerificationMethod,
        phoneType,
        leadScore: crmLeadScore({
          trade: discovery.trade,
          state: discovery.state,
          normalizedPhone,
          phoneVerificationMethod,
          phoneVerificationSource: discovery.phoneVerificationSource,
          phoneType,
          ownerName: input.ownerName || discovery.ownerName,
          websiteUrl: input.websiteUrl || discovery.websiteUrl,
          googleBusinessProfileUrl:
            input.googleBusinessProfileUrl || discovery.googleBusinessProfileUrl
        }),
        ownerReachScore: discovery.ownerReachScore,
        ownerReachScoreReasons: discovery.ownerReachReasons,
        assignedUserId: input.assignedUserId || null,
        marketingNeedSignals: discovery.marketingNeedReasons,
        websiteWeaknesses: discovery.weaknesses.map((weakness) => weakness.evidence),
        callReady: true,
        callReadyAt: new Date(),
        notes: input.notes || null
      }
    });
    await tx.scraperLeadDiscovery.update({
      where: { id: discovery.id },
      data: {
        status: "approved",
        reviewedById: context.userId,
        reviewedAt: new Date(),
        approvedLeadBusinessId: created.id,
        assignedUserId: input.assignedUserId || null
      }
    });
    return created;
  });
  await audit(context, "scraper.discovery.approved", "ScraperLeadDiscovery", discovery.id, {
    leadBusinessId: lead.id,
    assignedUserId: input.assignedUserId || null
  });
  return lead;
}

export async function rejectScraperDiscovery(context: ScraperContext, input: ScraperReviewInput) {
  assertPermission(context, "scraper.approve");
  if (input.action !== "reject") throw new Error("INVALID_REVIEW_ACTION");
  const existing = await prisma.scraperLeadDiscovery.findFirstOrThrow({
    where: { id: input.discoveryId, organizationId: context.organizationId }
  });
  const discovery = await prisma.scraperLeadDiscovery.update({
    where: { id: existing.id },
    data: {
      status: "rejected",
      rejectionReason: input.rejectionReason || "Rejected by reviewer.",
      reviewedById: context.userId,
      reviewedAt: new Date()
    }
  });
  await audit(context, "scraper.discovery.rejected", "ScraperLeadDiscovery", discovery.id, {
    reason: input.rejectionReason || null
  });
  return discovery;
}

export async function updateScraperPolicy(context: ScraperContext, input: ScraperPolicyInput) {
  assertPermission(context, "scraper.policy.manage");
  const current = await ensureScoringPolicy(context.organizationId);
  const updated = await prisma.scraperScoringPolicy.update({
    where: { id: current.id },
    data: input
  });
  await audit(context, "scraper.policy.updated", "ScraperScoringPolicy", updated.id, input);
  return updated;
}

async function verifyAndStoreDiscovery(input: {
  organizationId: string;
  backgroundJobId: string;
  sourceProvider: string;
  sourceQuery: string;
  requestedTrade: ScraperTrade;
  result: ProviderLeadResult;
  fetchWebsite?: (url: string) => Promise<WebsiteFetchResult>;
}) {
  const normalized = normalizeProviderResult(input.result);
  const trade =
    classifyTrade(input.result.businessName, input.result.address, input.requestedTrade) ??
    input.requestedTrade;
  const state = input.result.state ?? (isUtahResult(input.result) ? "UT" : null);
  const normalizedDomain = normalized.normalizedDomain;
  const [existingPhones, existingNames, suppressed, policy] = await Promise.all([
    normalized.normalizedPhone
      ? prisma.leadBusiness.findMany({
          where: {
            organizationId: input.organizationId,
            normalizedPhone: normalized.normalizedPhone
          },
          select: { normalizedPhone: true }
        })
      : Promise.resolve([]),
    prisma.leadBusiness.findMany({
      where: {
        organizationId: input.organizationId,
        normalizedBusinessName: {
          contains:
            normalized.normalizedBusinessName.split(" ")[0] || normalized.normalizedBusinessName
        }
      },
      select: { businessName: true },
      take: 12
    }),
    normalized.normalizedPhone
      ? prisma.contactSuppression.findFirst({
          where: {
            organizationId: input.organizationId,
            phone: normalized.normalizedPhone,
            permanent: true,
            OR: [{ channel: "phone" }, { channel: "all" }]
          }
        })
      : Promise.resolve(null),
    ensureScoringPolicy(input.organizationId)
  ]);
  const duplicateWarnings = duplicateWarningsFor({
    businessName: input.result.businessName,
    normalizedPhone: normalized.normalizedPhone,
    existingPhones: existingPhones
      .map((lead) => lead.normalizedPhone)
      .filter((phone): phone is string => Boolean(phone)),
    existingBusinessNames: existingNames.map((lead) => lead.businessName)
  });

  const website = await fetchOfficialWebsitePages({
    organizationId: input.organizationId,
    websiteUrl: input.result.websiteUrl,
    fetchWebsite: input.fetchWebsite
  });
  const html = website.pages.map((page) => page.html).join("\n");
  const websitePhones = website.pages.flatMap((page) => page.phones);
  const verification = verifyPhone({
    discoveryPhone: input.result.phone,
    googlePhone: input.result.phone,
    websitePhones,
    websiteUrl: website.bestUrl ?? input.result.websiteUrl,
    googleBusinessProfileUrl: input.result.googleMapsUrl
  });
  const ownerEvidence = detectOwnerEvidence({
    html,
    sourceUrl: website.bestUrl ?? input.result.websiteUrl ?? null,
    businessName: input.result.businessName
  });
  const weaknesses = website.weaknesses.length
    ? website.weaknesses
    : detectMarketingWeaknesses({ sourceUrl: input.result.websiteUrl ?? null });
  const scoring = scoreDiscovery(
    {
      trade,
      state,
      city: input.result.city,
      normalizedPhone: verification.normalizedPhone,
      phoneVerificationStatus: verification.status,
      ownerConfidence: ownerEvidence.ownerConfidence,
      ownerName: ownerEvidence.ownerName,
      websiteUrl: input.result.websiteUrl,
      googleBusinessProfileUrl: input.result.googleMapsUrl,
      reviewCount: input.result.reviewCount,
      rating: input.result.rating,
      weaknesses,
      duplicateWarnings,
      suppressed: Boolean(suppressed)
    },
    policy
  );
  const status = scraperStatusFor({
    trade,
    state,
    suppressed: Boolean(suppressed),
    duplicateWarnings,
    phoneVerificationStatus: verification.status,
    callReady: scoring.callReady
  });
  const sourceUrls = Array.from(
    new Set(
      [
        input.result.websiteUrl,
        input.result.googleMapsUrl,
        verification.source,
        ownerEvidence.ownerVerificationSource
      ].filter((value): value is string => Boolean(value))
    )
  );
  const existingDiscovery = await findExistingDiscovery(input.organizationId, normalized);

  const discovery = await prisma.$transaction(async (tx) => {
    const saved = existingDiscovery
      ? await tx.scraperLeadDiscovery.update({
          where: { id: existingDiscovery.id },
          data: discoveryData()
        })
      : await tx.scraperLeadDiscovery.create({
          data: {
            organizationId: input.organizationId,
            ...discoveryData()
          }
        });
    await tx.scraperMarketingWeakness.deleteMany({ where: { discoveryId: saved.id } });
    if (weaknesses.length) {
      await tx.scraperMarketingWeakness.createMany({
        data: weaknesses.map((weakness) => ({
          organizationId: input.organizationId,
          discoveryId: saved.id,
          signal: weakness.signal,
          evidence: weakness.evidence,
          sourceUrl: weakness.sourceUrl ?? null,
          severity: weakness.severity
        }))
      });
    }
    return saved;
  });

  return discovery;

  function discoveryData() {
    return {
      backgroundJobId: input.backgroundJobId,
      sourceProvider: input.sourceProvider,
      sourceQuery: input.sourceQuery,
      sourceRecordId: input.result.sourceRecordId ?? input.result.googlePlaceId ?? null,
      googlePlaceId: input.result.googlePlaceId ?? null,
      googleMapsUrl: input.result.googleMapsUrl ?? null,
      businessName: input.result.businessName,
      normalizedBusinessName: normalized.normalizedBusinessName,
      trade,
      phone: input.result.phone ?? null,
      normalizedPhone: verification.normalizedPhone,
      websiteUrl: input.result.websiteUrl ?? null,
      normalizedDomain,
      googleBusinessProfileUrl: input.result.googleMapsUrl ?? null,
      address: input.result.address ?? null,
      city: input.result.city ?? null,
      state,
      postalCode: input.result.postalCode ?? null,
      country: input.result.country ?? "United States",
      rating: decimalOrNull(input.result.rating),
      reviewCount: input.result.reviewCount ?? null,
      businessStatus: input.result.businessStatus ?? null,
      status,
      phoneVerificationStatus: verification.status,
      phoneVerificationSource: verification.source,
      phoneVerificationDate: verification.date,
      ownerName: ownerEvidence.ownerName,
      ownerVerificationSource: ownerEvidence.ownerVerificationSource,
      ownerVerificationMethod: ownerEvidence.ownerVerificationMethod,
      ownerConfidence: ownerEvidence.ownerConfidence,
      ownerVerificationDate: ownerEvidence.ownerVerificationSource ? new Date() : null,
      ownerReachScore: scoring.ownerReachScore,
      marketingNeedScore: scoring.marketingNeedScore,
      dataConfidenceScore: scoring.dataConfidenceScore,
      callPriorityScore: scoring.callPriorityScore,
      ownerReachReasons: [...ownerEvidence.reasons, ...scoring.ownerReachReasons].slice(0, 8),
      marketingNeedReasons: scoring.marketingNeedReasons,
      dataConfidenceReasons: scoring.dataConfidenceReasons,
      duplicateWarnings,
      sourceUrls
    };
  }
}

async function fetchOfficialWebsitePages(input: {
  organizationId: string;
  websiteUrl?: string | null;
  fetchWebsite?: (url: string) => Promise<WebsiteFetchResult>;
}) {
  const weaknesses: ScraperWeakness[] = [];
  const pages: Array<WebsiteFetchResult & { phones: string[] }> = [];
  if (!input.websiteUrl) return { pages, weaknesses, bestUrl: null };

  let urls: string[];
  try {
    await assertDomainRateLimit(input.organizationId, input.websiteUrl);
    urls = candidateWebsiteUrls(input.websiteUrl);
  } catch (error) {
    return {
      pages,
      weaknesses: detectMarketingWeaknesses({
        sourceUrl: input.websiteUrl,
        error: error instanceof Error ? error.message : "URL_REJECTED"
      }),
      bestUrl: input.websiteUrl
    };
  }

  for (const url of urls) {
    try {
      const started = Date.now();
      const fetched = input.fetchWebsite
        ? await input.fetchWebsite(url)
        : await fetchWithSafety(url, {
            userAgent: SCRAPER_USER_AGENT,
            timeoutMs: 8000,
            maxBytes: 500_000,
            maxRedirects: 3
          });
      const result: WebsiteFetchResult = {
        ...fetched,
        responseMs:
          "responseMs" in fetched && fetched.responseMs ? fetched.responseMs : Date.now() - started
      };
      const page = {
        ...result,
        phones: extractPhoneNumbers(result.html)
      };
      pages.push(page);
      weaknesses.push(
        ...detectMarketingWeaknesses({
          html: result.html,
          statusCode: result.status,
          finalUrl: result.finalUrl,
          sourceUrl: url,
          responseMs: page.responseMs
        })
      );
      await recordDomainFetch(input.organizationId, result.finalUrl, String(result.status));
      if (pages.length >= 3) break;
    } catch (error) {
      weaknesses.push(
        ...detectMarketingWeaknesses({
          sourceUrl: url,
          error: error instanceof Error ? error.message : "FETCH_FAILED"
        })
      );
      await recordDomainFetch(input.organizationId, url, "failed").catch(() => null);
    }
  }

  return {
    pages,
    weaknesses: weaknesses.slice(0, 10),
    bestUrl: pages[0]?.finalUrl ?? input.websiteUrl
  };
}

function candidateWebsiteUrls(websiteUrl: string) {
  const url = new URL(/^https?:\/\//i.test(websiteUrl) ? websiteUrl : `https://${websiteUrl}`);
  url.hash = "";
  const base = `${url.protocol}//${url.hostname}`;
  return Array.from(new Set([url.toString(), `${base}/contact`, `${base}/about`, `${base}/team`]));
}

async function findExistingDiscovery(
  organizationId: string,
  normalized: ReturnType<typeof normalizeProviderResult>
) {
  const or: Prisma.ScraperLeadDiscoveryWhereInput[] = [];
  if (normalized.googlePlaceId) or.push({ googlePlaceId: normalized.googlePlaceId });
  if (normalized.normalizedPhone) or.push({ normalizedPhone: normalized.normalizedPhone });
  if (!or.length) return null;
  return prisma.scraperLeadDiscovery.findFirst({
    where: { organizationId, OR: or, status: { notIn: ["approved", "rejected"] } }
  });
}

async function ensureScoringPolicy(organizationId: string) {
  const current = await prisma.scraperScoringPolicy.findFirst({
    where: { organizationId, active: true },
    orderBy: { createdAt: "asc" }
  });
  if (current) return current;
  return prisma.scraperScoringPolicy.create({
    data: {
      id: `default-scraper-policy-${organizationId}`,
      organizationId,
      name: "Default scraper scoring",
      ownerReachWeight: 40,
      marketingNeedWeight: 40,
      dataConfidenceWeight: 20,
      minimumConfidence: 70,
      active: true
    }
  });
}

async function assertDomainRateLimit(organizationId: string, rawUrl: string) {
  const domain = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`).hostname
    .toLowerCase()
    .replace(/^www\./, "");
  const record = await prisma.scraperDomainRateLimit.findUnique({
    where: { organizationId_domain: { organizationId, domain } }
  });
  if (record?.lastFetchedAt && Date.now() - record.lastFetchedAt.getTime() < 3_000) {
    throw new Error("DOMAIN_RATE_LIMITED");
  }
}

async function recordDomainFetch(organizationId: string, rawUrl: string, status: string) {
  const domain = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`).hostname
    .toLowerCase()
    .replace(/^www\./, "");
  await prisma.scraperDomainRateLimit.upsert({
    where: { organizationId_domain: { organizationId, domain } },
    update: { lastFetchedAt: new Date(), fetchCount: { increment: 1 }, lastStatus: status },
    create: {
      organizationId,
      domain,
      lastFetchedAt: new Date(),
      fetchCount: 1,
      lastStatus: status
    }
  });
}

async function assertPhoneAvailable(organizationId: string, normalizedPhone: string) {
  const existing = await prisma.leadBusiness.findFirst({
    where: { organizationId, normalizedPhone, archivedAt: null },
    select: { id: true }
  });
  if (existing) throw new Error("DUPLICATE_NORMALIZED_PHONE");
}

async function assertNumberNotSuppressed(organizationId: string, normalizedPhone: string | null) {
  if (!normalizedPhone) return;
  const suppression = await prisma.contactSuppression.findFirst({
    where: {
      organizationId,
      phone: normalizedPhone,
      permanent: true,
      OR: [{ channel: "phone" }, { channel: "all" }]
    }
  });
  if (suppression) throw new Error("SUPPRESSED_NUMBER");
}

async function assertValidAssignee(organizationId: string, assignedUserId?: string | null) {
  if (!assignedUserId) return;
  const membership = await prisma.organizationMembership.findFirst({
    where: { organizationId, userId: assignedUserId, status: "ACTIVE" },
    select: { id: true }
  });
  if (!membership) throw new Error("INVALID_ASSIGNEE");
}

function decimalOrNull(value: unknown) {
  if (value === "" || value === undefined || value === null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? new Prisma.Decimal(number) : null;
}

function assertPermission(context: ScraperContext, permission: PermissionKey) {
  if (!context.permissions.includes(permission)) throw new Error("FORBIDDEN");
}

async function audit(
  context: Pick<ScraperContext, "organizationId" | "userId">,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Prisma.InputJsonObject
) {
  await writeAuditEvent({
    organizationId: context.organizationId,
    actorUserId: context.userId,
    action,
    entityType,
    entityId,
    metadata
  });
}
