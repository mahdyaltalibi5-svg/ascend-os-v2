"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getCurrentSession } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { writeAuditEvent } from "@/lib/server/audit";
import { requirePermission, requireOrganizationContext } from "@/lib/server/organization";
import { parseMoneyToCents } from "@/lib/revenue/formatting";
import { getDefaultPipeline } from "@/lib/server/sales";
import { analyzeWebsite, scoreLead } from "@/lib/sales/scoring";
import {
  businessNameSimilarity,
  canMarkCallReady,
  crmLeadScore,
  dedupeCandidateKeys,
  escapeCsvFormula,
  normalizeEmail,
  normalizePhone,
  normalizeSourceUrls
} from "@/lib/sales/normalization";
import {
  followUpForOutcome,
  prospectStatusAfterOutcome,
  weightedValue
} from "@/lib/sales/operations";
import {
  appointmentSchema,
  followUpSchema,
  leadBusinessSchema,
  leadCampaignSchema,
  opportunitySchema,
  outreachAttemptSchema,
  prospectConversionSchema,
  prospectUpdateSchema,
  revenueHandoffSchema,
  salesGoalSchema,
  suppressionSchema
} from "@/lib/validation/sales";
import {
  getLeadSourceProvider,
  normalizeProviderResult,
  type ProviderLeadResult
} from "@/lib/sales/providers";
import type { PermissionKey } from "@/lib/permissions";

type SalesContext = {
  userId: string;
  organizationId: string;
  permissions: string[];
  timezone: string;
};

async function salesContext(permission: PermissionKey): Promise<SalesContext> {
  const session = await getCurrentSession();
  if (!session?.user?.id) throw new Error("AUTHENTICATION_REQUIRED");
  const context = await requirePermission(session.user.id, permission);
  return {
    userId: session.user.id,
    organizationId: context.organization.id,
    permissions: context.permissions,
    timezone: context.organization.timezone
  };
}

async function anySalesContext(required: PermissionKey[]): Promise<SalesContext> {
  const session = await getCurrentSession();
  if (!session?.user?.id) throw new Error("AUTHENTICATION_REQUIRED");
  const context = await requireOrganizationContext(session.user.id);
  if (!required.some((permission) => context.permissions.includes(permission))) {
    throw new Error("FORBIDDEN");
  }
  return {
    userId: session.user.id,
    organizationId: context.organization.id,
    permissions: context.permissions,
    timezone: context.organization.timezone
  };
}

export async function createLeadCampaignAction(formData: FormData) {
  const context = await salesContext("leads.campaigns.manage");
  const parsed = leadCampaignSchema.parse(Object.fromEntries(formData));
  const searchTerms = parsed.searchTerms
    .split(",")
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, 8);

  const campaign = await prisma.leadCampaign.create({
    data: {
      organizationId: context.organizationId,
      name: parsed.name,
      industry: parsed.industry,
      subIndustry: parsed.subIndustry || null,
      country: parsed.country,
      state: parsed.state || null,
      metroArea: parsed.metroArea || null,
      city: parsed.city || null,
      searchRadiusMiles: nullableNumber(parsed.searchRadiusMiles),
      searchTerms,
      minReviewCount: nullableNumber(parsed.minReviewCount),
      maxReviewCount: nullableNumber(parsed.maxReviewCount),
      minRating: decimalOrNull(parsed.minRating),
      maxRating: decimalOrNull(parsed.maxRating),
      ownerOperatedOnly: parsed.ownerOperatedOnly,
      excludeFranchises: parsed.excludeFranchises,
      excludeSuppliers: parsed.excludeSuppliers,
      excludeSchools: parsed.excludeSchools,
      excludeJobListings: parsed.excludeJobListings,
      excludeParts: parsed.excludeParts,
      targetLeadCount: parsed.targetLeadCount,
      status: parsed.status,
      sourceProvider: parsed.sourceProvider,
      createdByUserId: context.userId
    }
  });

  await audit(context, "sales.campaign.created", "LeadCampaign", campaign.id, {
    sourceProvider: campaign.sourceProvider,
    targetLeadCount: campaign.targetLeadCount
  });
  revalidateSales();
}

export async function launchLeadCampaignAction(formData: FormData) {
  const context = await salesContext("leads.campaigns.manage");
  const campaignId = String(formData.get("campaignId") ?? "");
  const campaign = await prisma.leadCampaign.findFirstOrThrow({
    where: { id: campaignId, organizationId: context.organizationId }
  });
  const provider = getLeadSourceProvider(campaign.sourceProvider);
  const job = await prisma.$transaction(async (tx) => {
    const updatedCampaign = await tx.leadCampaign.update({
      where: { id: campaign.id },
      data: {
        status: provider.enabled ? "running" : "failed",
        startedAt: provider.enabled ? new Date() : campaign.startedAt
      }
    });
    const createdJob = await tx.backgroundJob.create({
      data: {
        organizationId: context.organizationId,
        campaignId: campaign.id,
        type: "lead_campaign_search",
        status: provider.enabled ? "queued" : "failed",
        input: {
          campaignId: campaign.id,
          sourceProvider: campaign.sourceProvider,
          location: [campaign.city, campaign.state, campaign.country].filter(Boolean).join(", "),
          searchTerms: campaign.searchTerms,
          targetLeadCount: campaign.targetLeadCount
        },
        progressTotal: Math.min(campaign.targetLeadCount, 500),
        errorMessage: provider.enabled ? null : "GOOGLE_PLACES_API_KEY is not configured."
      }
    });
    return { updatedCampaign, createdJob };
  });

  await audit(context, "sales.campaign.launched", "LeadCampaign", campaign.id, {
    jobId: job.createdJob.id,
    providerEnabled: provider.enabled
  });
  revalidateSales();
}

export async function createManualLeadAction(formData: FormData) {
  const context = await salesContext("leads.manage");
  const parsed = leadBusinessSchema.parse(Object.fromEntries(formData));
  const lead = await upsertLeadBusiness(context, {
    businessName: parsed.businessName,
    trade: parsed.trade,
    ownerName: parsed.ownerName || null,
    phone: parsed.primaryPhone || null,
    email: parsed.email || null,
    websiteUrl: parsed.websiteUrl || null,
    googleBusinessProfileUrl: parsed.googleBusinessProfileUrl || null,
    sourceUrls: parsed.sourceUrls || null,
    ownerVerificationSource: parsed.ownerVerificationSource || null,
    phoneVerificationSource: parsed.phoneVerificationSource || null,
    phoneVerificationMethod: parsed.phoneVerificationMethod,
    phoneType: parsed.phoneType,
    assignedUserId: parsed.assignedUserId || null,
    nextFollowUpAt: parsed.nextFollowUpAt || null,
    doNotCall: parsed.doNotCall,
    requestedCallReady: parsed.callReady,
    address: parsed.address || null,
    city: parsed.city || null,
    state: parsed.state || null,
    postalCode: parsed.postalCode || null,
    country: parsed.country,
    industry: parsed.industry || null,
    rating: nullableNumber(parsed.rating),
    reviewCount: nullableNumber(parsed.reviewCount),
    source: "manual",
    notes: parsed.notes || null
  });

  if (parsed.contactName || parsed.contactEmail) {
    await prisma.leadContact.create({
      data: {
        organizationId: context.organizationId,
        leadBusinessId: lead.id,
        fullName: parsed.contactName || null,
        email: normalizeEmail(parsed.contactEmail),
        source: "manual",
        notes: parsed.notes || null
      }
    });
  }
  if (lead.doNotCall && lead.normalizedPhone) {
    await suppressLeadNumber(context, lead, "do_not_call", "lead_create");
  }

  await audit(context, "sales.lead.created", "LeadBusiness", lead.id, {
    source: "manual",
    callReady: lead.callReady,
    trade: lead.trade
  });
  revalidateSales();
}

export async function updateLeadBusinessAction(formData: FormData) {
  const context = await salesContext("leads.manage");
  const id = String(formData.get("leadBusinessId") ?? "");
  const existing = await prisma.leadBusiness.findFirstOrThrow({
    where: { id, organizationId: context.organizationId }
  });
  const parsed = leadBusinessSchema.parse(Object.fromEntries(formData));
  const normalizedPhone = normalizePhone(parsed.primaryPhone);
  if (normalizedPhone && normalizedPhone !== existing.normalizedPhone) {
    await assertPhoneAvailable(context.organizationId, normalizedPhone);
  }
  const phoneVerificationDate = parsed.phoneVerificationSource
    ? (existing.phoneVerificationDate ?? new Date())
    : null;
  const callReady = canMarkCallReady({
    normalizedPhone,
    phoneVerificationMethod: parsed.phoneVerificationMethod,
    phoneVerificationSource: parsed.phoneVerificationSource
  });
  if (parsed.callReady && !callReady)
    throw new Error("CALL_READY_REQUIRES_OFFICIAL_PHONE_EVIDENCE");
  if (parsed.phoneType === "direct_owner" && !parsed.ownerVerificationSource) {
    throw new Error("OWNER_DIRECT_REQUIRES_EVIDENCE");
  }
  const updated = await prisma.leadBusiness.update({
    where: { id: existing.id },
    data: {
      businessName: parsed.businessName,
      normalizedBusinessName: normalizeProviderResult({ businessName: parsed.businessName })
        .normalizedBusinessName,
      trade: parsed.trade,
      ownerName: parsed.ownerName || null,
      primaryPhone: parsed.primaryPhone || null,
      normalizedPhone,
      email: normalizeEmail(parsed.email),
      websiteUrl: parsed.websiteUrl || null,
      normalizedDomain: normalizeProviderResult({
        businessName: parsed.businessName,
        websiteUrl: parsed.websiteUrl
      }).normalizedDomain,
      googleBusinessProfileUrl: parsed.googleBusinessProfileUrl || null,
      sourceUrls: normalizeSourceUrls(parsed.sourceUrls),
      ownerVerificationSource: parsed.ownerVerificationSource || null,
      phoneVerificationSource: parsed.phoneVerificationSource || null,
      phoneVerificationDate,
      phoneVerificationMethod: parsed.phoneVerificationMethod,
      phoneType: parsed.phoneType,
      leadScore: crmLeadScore({
        trade: parsed.trade,
        state: parsed.state,
        normalizedPhone,
        phoneVerificationMethod: parsed.phoneVerificationMethod,
        phoneVerificationSource: parsed.phoneVerificationSource,
        phoneType: parsed.phoneType,
        ownerName: parsed.ownerName,
        websiteUrl: parsed.websiteUrl,
        googleBusinessProfileUrl: parsed.googleBusinessProfileUrl
      }),
      assignedUserId: parsed.assignedUserId || null,
      nextFollowUpAt: parsed.nextFollowUpAt ? new Date(parsed.nextFollowUpAt) : null,
      doNotCall: parsed.doNotCall,
      callReady: parsed.doNotCall ? false : callReady,
      callReadyAt: callReady && !existing.callReady ? new Date() : existing.callReadyAt,
      notes: parsed.notes || null
    }
  });
  if (updated.doNotCall && updated.normalizedPhone) {
    await suppressLeadNumber(context, updated, "do_not_call", "lead_update");
  }
  await audit(context, "sales.lead.updated", "LeadBusiness", updated.id, {
    callReady: updated.callReady,
    phoneType: updated.phoneType
  });
  revalidateSales();
}

export async function importLeadsCsvAction(formData: FormData) {
  const context = await salesContext("leads.manage");
  const csv = String(formData.get("csv") ?? "");
  const rows = parseCsv(csv).slice(0, 500);
  const members = await prisma.organizationMembership.findMany({
    where: { organizationId: context.organizationId, status: "ACTIVE" },
    include: { user: true }
  });
  let created = 0;
  let deduped = 0;
  let rejected = 0;

  for (const row of rows) {
    if (!row["Business name"] && !row["businessName"] && !row["business_name"]) continue;
    let lead;
    try {
      lead = await upsertLeadBusiness(context, {
        businessName: cell(row, "Business name", "businessName", "business_name"),
        trade: tradeCell(row),
        ownerName: cell(row, "Owner name", "ownerName", "owner_name"),
        phone: cell(row, "Phone", "phone"),
        email: cell(row, "Email", "email"),
        websiteUrl: cell(row, "Website", "website"),
        googleBusinessProfileUrl: cell(
          row,
          "Google Business Profile URL",
          "googleBusinessProfileUrl",
          "google_business_profile_url",
          "Google Maps URL"
        ),
        sourceUrls: cell(row, "Source URLs", "sourceUrls", "source_urls"),
        ownerVerificationSource: cell(
          row,
          "Owner verification source",
          "ownerVerificationSource",
          "owner_verification_source"
        ),
        phoneVerificationSource: cell(
          row,
          "Phone verification source",
          "phoneVerificationSource",
          "phone_verification_source"
        ),
        phoneVerificationMethod: verificationMethodCell(row),
        phoneType: phoneTypeCell(row),
        assignedUserId: assignedUserCell(context, members, row),
        doNotCall: boolCell(row, "Do-not-call status", "doNotCall", "do_not_call"),
        requestedCallReady: boolCell(row, "Call Ready", "callReady", "call_ready"),
        address: cell(row, "Address", "address"),
        city: cell(row, "City", "city"),
        state: cell(row, "State", "state") || "UT",
        postalCode: cell(row, "Postal code", "postalCode", "postal_code"),
        industry: cell(row, "Industry", "industry") || tradeCell(row),
        rating: numberCell(row, "Rating", "rating"),
        reviewCount: numberCell(row, "Review count", "reviewCount", "review_count"),
        source: "csv_import",
        notes: cell(row, "Notes", "notes")
      });
      if (lead.createdAt.getTime() + 2000 > Date.now()) created += 1;
      else deduped += 1;
    } catch (error) {
      if (
        error instanceof Error &&
        [
          "DUPLICATE_NORMALIZED_PHONE",
          "SUPPRESSED_NUMBER",
          "CALL_READY_REQUIRES_OFFICIAL_PHONE_EVIDENCE",
          "OWNER_DIRECT_REQUIRES_EVIDENCE"
        ].includes(error.message)
      ) {
        rejected += 1;
        continue;
      }
      throw error;
    }
    const contactName = cell(row, "Contact name", "contactName", "contact_name");
    const contactEmail = cell(row, "Contact email", "contactEmail", "contact_email");
    if (contactName || contactEmail) {
      await prisma.leadContact.create({
        data: {
          organizationId: context.organizationId,
          leadBusinessId: lead.id,
          fullName: contactName || null,
          email: normalizeEmail(contactEmail),
          source: "csv_import"
        }
      });
    }
  }

  await audit(context, "sales.csv_import", "LeadBusiness", null, {
    rows: rows.length,
    created,
    deduped,
    rejected
  });
  revalidateSales();
}

export async function analyzeLeadAction(formData: FormData) {
  const context = await salesContext("leads.research.manage");
  const leadBusinessId = String(formData.get("leadBusinessId") ?? "");
  const lead = await prisma.leadBusiness.findFirstOrThrow({
    where: { id: leadBusinessId, organizationId: context.organizationId }
  });
  const website = await analyzeWebsite(lead.websiteUrl);
  const scoring = scoreLead({
    rating: decimalToNumber(lead.rating),
    reviewCount: lead.reviewCount,
    websiteEvidence: website.evidence,
    franchiseStatus: lead.franchiseStatus,
    normalizedPhone: lead.normalizedPhone,
    industry: lead.industry
  });
  const analysis = await prisma.leadAnalysis.create({
    data: {
      organizationId: context.organizationId,
      leadBusinessId: lead.id,
      websiteStatus: website.websiteStatus,
      websiteQualityScore: website.websiteQualityScore,
      mobileQualityScore: website.mobileQualityScore,
      conversionQualityScore: website.conversionQualityScore,
      seoWeaknessScore: website.seoWeaknessScore,
      gbpWeaknessScore: scoring.gbpWeaknessScore,
      automationOpportunityScore: scoring.automationOpportunityScore,
      ownerAccessibilityScore: scoring.ownerAccessibilityScore,
      abilityToPayScore: scoring.abilityToPayScore,
      urgencyScore: scoring.urgencyScore,
      overallFitScore: scoring.overallFitScore,
      classification: scoring.classification,
      primaryWeaknesses: [...website.primaryWeaknesses, ...scoring.reasons].slice(0, 8),
      recommendedService: scoring.recommendedService,
      researchSummary: scoring.reasons.join(" "),
      evidence: {
        website: website.evidence,
        reasons: scoring.reasons,
        confidence: scoring.confidenceLevel
      }
    }
  });

  await audit(context, "sales.lead.analyzed", "LeadAnalysis", analysis.id, {
    leadBusinessId: lead.id,
    classification: analysis.classification
  });
  revalidateSales();
}

export async function convertLeadToProspectAction(formData: FormData) {
  const context = await anySalesContext(["prospects.manage_all", "prospects.manage_own"]);
  const parsed = prospectConversionSchema.parse(Object.fromEntries(formData));
  const lead = await prisma.leadBusiness.findFirstOrThrow({
    where: { id: parsed.leadBusinessId, organizationId: context.organizationId },
    include: {
      contacts: { where: { archivedAt: null }, take: 1 },
      analyses: { orderBy: { createdAt: "desc" }, take: 1 }
    }
  });
  const existing = await prisma.prospect.findFirst({
    where: { organizationId: context.organizationId, leadBusinessId: lead.id, archivedAt: null }
  });
  if (existing) throw new Error("DUPLICATE_ACTIVE_PROSPECT");
  if (!lead.callReady) throw new Error("CALL_READY_REQUIRES_OFFICIAL_PHONE_EVIDENCE");
  if (lead.doNotCall) throw new Error("LEAD_DO_NOT_CALL");
  await assertNumberNotSuppressed(context.organizationId, lead.normalizedPhone, "phone");
  const firstFollowUp = parsed.firstFollowUpDate
    ? new Date(`${parsed.firstFollowUpDate}T16:00:00.000Z`)
    : null;
  const prospect = await prisma.$transaction(async (tx) => {
    const created = await tx.prospect.create({
      data: {
        organizationId: context.organizationId,
        leadBusinessId: lead.id,
        primaryContactId: lead.contacts[0]?.id ?? null,
        assignedUserId: parsed.assignedUserId || context.userId,
        status: parsed.assignedUserId ? "assigned" : "ready",
        priority: parsed.priority,
        leadSource: lead.source,
        nextActionAt: firstFollowUp ?? lead.nextFollowUpAt,
        nextActionType: firstFollowUp || lead.nextFollowUpAt ? "call" : null,
        estimatedValueCents: optionalCents(parsed.estimatedValue),
        recommendedService:
          parsed.recommendedService || lead.analyses[0]?.recommendedService || null,
        notes: parsed.notes || null
      }
    });
    if (firstFollowUp) {
      await tx.followUp.create({
        data: {
          organizationId: context.organizationId,
          prospectId: created.id,
          assignedUserId: created.assignedUserId,
          type: "call",
          dueAt: firstFollowUp,
          priority: parsed.priority,
          notes: "First outreach follow-up."
        }
      });
    }
    return created;
  });

  await audit(context, "sales.prospect.created", "Prospect", prospect.id, {
    leadBusinessId: lead.id
  });
  revalidateSales();
}

export async function updateProspectAction(formData: FormData) {
  const context = await anySalesContext(["prospects.manage_all", "prospects.manage_own"]);
  const parsed = prospectUpdateSchema.parse(Object.fromEntries(formData));
  const prospect = await assertProspectAccess(context, parsed.prospectId, "manage");
  const updated = await prisma.prospect.update({
    where: { id: prospect.id },
    data: {
      assignedUserId: parsed.assignedUserId || prospect.assignedUserId,
      status: parsed.status,
      priority: parsed.priority,
      nextActionAt: parsed.nextActionAt ? new Date(parsed.nextActionAt) : null,
      notes: parsed.notes || prospect.notes
    }
  });
  await audit(context, "sales.prospect.assigned", "Prospect", updated.id, {
    assignedUserId: updated.assignedUserId,
    status: updated.status
  });
  revalidateSales();
}

export async function recordOutreachAttemptAction(formData: FormData) {
  const context = await salesContext("outreach.create");
  const parsed = outreachAttemptSchema.parse(Object.fromEntries(formData));
  const prospect = await assertProspectAccess(context, parsed.prospectId, "manage");
  await assertNotSuppressed(context.organizationId, prospect.id, parsed.channel);
  const startedAt = new Date();
  const outcomeStatus = prospectStatusAfterOutcome(parsed.outcome);
  const followUp = parsed.createFollowUp ? followUpForOutcome(parsed.outcome, startedAt) : null;
  const attempt = await prisma.$transaction(async (tx) => {
    const created = await tx.outreachAttempt.create({
      data: {
        organizationId: context.organizationId,
        prospectId: prospect.id,
        userId: context.userId,
        contactId: parsed.contactId || prospect.primaryContactId,
        channel: parsed.channel,
        direction: parsed.direction,
        startedAt,
        completedAt: startedAt,
        durationSeconds: nullableNumber(parsed.durationSeconds),
        outcome: parsed.outcome,
        notes: parsed.notes || null
      }
    });
    await tx.prospect.update({
      where: { id: prospect.id },
      data: {
        status: outcomeStatus,
        lastContactAt: startedAt,
        attemptCount: { increment: 1 },
        noAnswerCount: parsed.outcome === "no_answer" ? { increment: 1 } : undefined,
        conversationCount: [
          "owner_conversation",
          "full_pitch",
          "interested",
          "callback_requested",
          "appointment_booked"
        ].includes(parsed.outcome)
          ? { increment: 1 }
          : undefined,
        nextActionAt: followUp?.dueAt ?? null,
        nextActionType: followUp?.type ?? null
      }
    });
    await tx.leadBusiness.update({
      where: { id: prospect.leadBusinessId },
      data: {
        lastContactedAt: startedAt,
        nextFollowUpAt: followUp?.dueAt ?? null,
        doNotCall: parsed.outcome === "do_not_contact" ? true : prospect.leadBusiness.doNotCall,
        callReady: parsed.outcome === "wrong_number" ? false : prospect.leadBusiness.callReady
      }
    });
    if (followUp) {
      await tx.followUp.create({
        data: {
          organizationId: context.organizationId,
          prospectId: prospect.id,
          assignedUserId: prospect.assignedUserId || context.userId,
          relatedOutreachAttemptId: created.id,
          type: followUp.type,
          dueAt: followUp.dueAt,
          priority: prospect.priority,
          notes: followUp.notes
        }
      });
    }
    return created;
  });
  if (parsed.outcome === "wrong_number" || parsed.outcome === "do_not_contact") {
    await suppressLeadNumber(
      context,
      prospect.leadBusiness,
      parsed.outcome === "wrong_number" ? "wrong_person" : "do_not_call",
      "outreach_disposition"
    );
  }

  await audit(context, "sales.outreach.recorded", "OutreachAttempt", attempt.id, {
    prospectId: prospect.id,
    outcome: attempt.outcome
  });
  revalidateSales();
}

export async function createFollowUpAction(formData: FormData) {
  const context = await anySalesContext(["followups.manage_all", "followups.manage_own"]);
  const parsed = followUpSchema.parse(Object.fromEntries(formData));
  const prospect = await assertProspectAccess(context, parsed.prospectId, "manage");
  const followUp = await prisma.followUp.create({
    data: {
      organizationId: context.organizationId,
      prospectId: prospect.id,
      assignedUserId: parsed.assignedUserId || prospect.assignedUserId || context.userId,
      type: parsed.type,
      dueAt: new Date(parsed.dueAt),
      priority: parsed.priority,
      notes: parsed.notes || null
    }
  });
  await audit(context, "sales.followup.created", "FollowUp", followUp.id, {
    prospectId: prospect.id
  });
  revalidateSales();
}

export async function completeFollowUpAction(formData: FormData) {
  const context = await anySalesContext(["followups.manage_all", "followups.manage_own"]);
  const id = String(formData.get("followUpId") ?? "");
  const followUp = await prisma.followUp.findFirstOrThrow({
    where: { id, organizationId: context.organizationId }
  });
  if (
    !context.permissions.includes("followups.manage_all") &&
    followUp.assignedUserId !== context.userId
  ) {
    throw new Error("FORBIDDEN");
  }
  await prisma.followUp.update({
    where: { id: followUp.id },
    data: { status: "completed", completedAt: new Date() }
  });
  await audit(context, "sales.followup.completed", "FollowUp", followUp.id, {});
  revalidateSales();
}

export async function createAppointmentAction(formData: FormData) {
  const context = await anySalesContext(["appointments.manage_all", "appointments.manage_own"]);
  const parsed = appointmentSchema.parse(Object.fromEntries(formData));
  const prospect = await assertProspectAccess(context, parsed.prospectId, "manage");
  const pipeline = await getDefaultPipeline(context.organizationId);
  const appointmentStage =
    pipeline.stages.find((stage) => stage.name === "Appointment Booked") ?? pipeline.stages[0];
  const startAt = new Date(parsed.startAt);
  const endAt = new Date(parsed.endAt);
  if (endAt <= startAt) throw new Error("INVALID_APPOINTMENT_RANGE");

  const appointment = await prisma.$transaction(async (tx) => {
    const opportunity =
      (await tx.opportunity.findFirst({
        where: { organizationId: context.organizationId, prospectId: prospect.id, status: "open" }
      })) ??
      (await tx.opportunity.create({
        data: {
          organizationId: context.organizationId,
          prospectId: prospect.id,
          assignedCloserId: parsed.assignedCloserId || parsed.assignedSetterId || context.userId,
          name: `${prospect.leadBusiness.businessName} opportunity`,
          pipelineStageId: appointmentStage.id,
          estimatedValueCents: prospect.estimatedValueCents ?? 500000,
          weightedValueCents: weightedValue(
            prospect.estimatedValueCents ?? 500000,
            appointmentStage.defaultProbability
          ),
          probabilityPercent: appointmentStage.defaultProbability,
          expectedCloseDate: new Date(startAt.getTime() + 14 * 24 * 60 * 60 * 1000),
          lastActivityAt: startAt,
          nextActionAt: startAt,
          status: "open"
        }
      }));
    const created = await tx.appointment.create({
      data: {
        organizationId: context.organizationId,
        prospectId: prospect.id,
        opportunityId: opportunity.id,
        assignedSetterId: parsed.assignedSetterId || context.userId,
        assignedCloserId: parsed.assignedCloserId || context.userId,
        contactId: parsed.contactId || prospect.primaryContactId,
        title: parsed.title,
        startAt,
        endAt,
        timezone: parsed.timezone,
        status: parsed.status,
        meetingType: parsed.meetingType,
        meetingUrl: parsed.meetingUrl || null,
        location: parsed.location || null,
        notes: parsed.notes || null
      }
    });
    await tx.prospect.update({
      where: { id: prospect.id },
      data: {
        status: "appointment_booked",
        nextActionAt: startAt,
        nextActionType: "appointment_confirmation"
      }
    });
    await tx.followUp.create({
      data: {
        organizationId: context.organizationId,
        prospectId: prospect.id,
        assignedUserId: parsed.assignedSetterId || context.userId,
        type: "appointment_confirmation",
        dueAt: new Date(startAt.getTime() - 24 * 60 * 60 * 1000),
        priority: "hot",
        notes: "Confirm appointment before the meeting."
      }
    });
    return created;
  });

  await audit(context, "sales.appointment.booked", "Appointment", appointment.id, {
    prospectId: prospect.id
  });
  revalidateSales();
}

export async function createOpportunityAction(formData: FormData) {
  const context = await anySalesContext(["opportunities.manage_all", "opportunities.manage_own"]);
  const parsed = opportunitySchema.parse(Object.fromEntries(formData));
  const prospect = await assertProspectAccess(context, parsed.prospectId, "manage");
  await assertStage(context.organizationId, parsed.pipelineStageId);
  if (parsed.serviceOfferingId)
    await assertService(context.organizationId, parsed.serviceOfferingId);
  const estimatedValueCents = requiredCents(parsed.estimatedValue);
  const opportunity = await prisma.opportunity.create({
    data: {
      organizationId: context.organizationId,
      prospectId: prospect.id,
      assignedCloserId: parsed.assignedCloserId || prospect.assignedUserId || context.userId,
      name: parsed.name,
      pipelineStageId: parsed.pipelineStageId,
      serviceOfferingId: parsed.serviceOfferingId || null,
      estimatedValueCents,
      weightedValueCents: weightedValue(estimatedValueCents, parsed.probabilityPercent),
      probabilityPercent: parsed.probabilityPercent,
      expectedCloseDate: parsed.expectedCloseDate
        ? new Date(`${parsed.expectedCloseDate}T00:00:00.000Z`)
        : null,
      status: parsed.status,
      notes: parsed.notes || null
    }
  });
  await audit(context, "sales.opportunity.created", "Opportunity", opportunity.id, {
    prospectId: prospect.id
  });
  revalidateSales();
}

export async function moveOpportunityStageAction(formData: FormData) {
  const context = await anySalesContext([
    "pipeline.manage",
    "opportunities.manage_all",
    "opportunities.manage_own"
  ]);
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const pipelineStageId = String(formData.get("pipelineStageId") ?? "");
  const opportunity = await assertOpportunityAccess(context, opportunityId, "manage");
  const stage = await assertStage(context.organizationId, pipelineStageId);
  const status = stage.isWonStage
    ? "won"
    : stage.isLostStage
      ? "lost"
      : opportunity.status === "won"
        ? "open"
        : opportunity.status;
  const updated = await prisma.opportunity.update({
    where: { id: opportunity.id },
    data: {
      pipelineStageId: stage.id,
      probabilityPercent: stage.defaultProbability,
      weightedValueCents: weightedValue(opportunity.estimatedValueCents, stage.defaultProbability),
      status,
      lastActivityAt: new Date(),
      wonAt: stage.isWonStage ? new Date() : opportunity.wonAt,
      lostAt: stage.isLostStage ? new Date() : opportunity.lostAt
    }
  });
  await audit(context, "sales.opportunity.stage_changed", "Opportunity", updated.id, {
    pipelineStageId: stage.id,
    status
  });
  revalidateSales();
}

export async function createRevenueHandoffAction(formData: FormData) {
  const context = await salesContext("revenue.contracts.manage");
  const parsed = revenueHandoffSchema.parse(Object.fromEntries(formData));
  const opportunity = await prisma.opportunity.findFirstOrThrow({
    where: { id: parsed.opportunityId, organizationId: context.organizationId },
    include: { prospect: { include: { leadBusiness: true } }, revenueContracts: true }
  });
  if (opportunity.revenueContracts.length) throw new Error("REVENUE_HANDOFF_ALREADY_CREATED");
  if (parsed.serviceOfferingId)
    await assertService(context.organizationId, parsed.serviceOfferingId);
  const contractedAmountCents = requiredCents(parsed.contractedAmount);
  const result = await prisma.$transaction(async (tx) => {
    const client = parsed.clientId
      ? await tx.client.findFirstOrThrow({
          where: { id: parsed.clientId, organizationId: context.organizationId }
        })
      : await tx.client.create({
          data: {
            organizationId: context.organizationId,
            businessName: parsed.businessName || opportunity.prospect.leadBusiness.businessName,
            contactPhone: opportunity.prospect.leadBusiness.primaryPhone,
            status: "active",
            source: "sales_handoff"
          }
        });
    const contract = await tx.revenueContract.create({
      data: {
        organizationId: context.organizationId,
        clientId: client.id,
        serviceOfferingId: parsed.serviceOfferingId || null,
        sourceOpportunityId: opportunity.id,
        name: parsed.contractName,
        contractedAmountCents,
        billingType: parsed.billingType,
        status: "signed",
        depositAmountCents: optionalCents(parsed.depositAmount),
        signedDate: new Date(),
        startDate: new Date(`${parsed.startDate}T00:00:00.000Z`)
      }
    });
    if (parsed.createInitialInvoice) {
      await tx.invoice.create({
        data: {
          organizationId: context.organizationId,
          clientId: client.id,
          revenueContractId: contract.id,
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          totalAmountCents: optionalCents(parsed.depositAmount) || contractedAmountCents,
          amountOutstandingCents: optionalCents(parsed.depositAmount) || contractedAmountCents,
          status: "open",
          notes: "Initial invoice created from won opportunity handoff."
        }
      });
    }
    await tx.opportunity.update({
      where: { id: opportunity.id },
      data: { status: "won", wonAt: new Date(), clientId: client.id }
    });
    await tx.prospect.update({
      where: { id: opportunity.prospectId },
      data: { status: "converted" }
    });
    return { client, contract };
  });

  await audit(context, "sales.revenue_handoff.created", "RevenueContract", result.contract.id, {
    opportunityId: opportunity.id,
    clientId: result.client.id,
    contractedAmountCents
  });
  revalidateSales();
  revalidatePath("/app/revenue");
}

export async function createSuppressionAction(formData: FormData) {
  const context = await anySalesContext(["prospects.manage_all", "prospects.manage_own"]);
  const parsed = suppressionSchema.parse(Object.fromEntries(formData));
  const lead = parsed.leadBusinessId
    ? await prisma.leadBusiness.findFirst({
        where: { id: parsed.leadBusinessId, organizationId: context.organizationId }
      })
    : null;
  const suppressionPhone = normalizePhone(parsed.phone) ?? lead?.normalizedPhone ?? null;
  const suppressionData = {
    organizationId: context.organizationId,
    prospectId: parsed.prospectId || null,
    leadBusinessId: parsed.leadBusinessId || null,
    businessName: lead?.businessName ?? null,
    normalizedBusinessName: lead?.normalizedBusinessName ?? null,
    phone: suppressionPhone,
    email: normalizeEmail(parsed.email),
    channel: parsed.channel,
    reason: parsed.reason,
    source: parsed.source,
    permanent: true,
    createdById: context.userId
  };
  const suppression = suppressionPhone
    ? await prisma.contactSuppression.upsert({
        where: {
          organizationId_phone_channel: {
            organizationId: context.organizationId,
            phone: suppressionPhone,
            channel: parsed.channel
          }
        },
        update: {
          reason: parsed.reason,
          source: parsed.source,
          permanent: true,
          expiresAt: null
        },
        create: suppressionData
      })
    : await prisma.contactSuppression.create({ data: suppressionData });
  if (parsed.prospectId) {
    await prisma.prospect.updateMany({
      where: { id: parsed.prospectId, organizationId: context.organizationId },
      data: { status: parsed.reason === "duplicate" ? "archived" : "do_not_contact" }
    });
  }
  if (parsed.leadBusinessId || lead) {
    const leadFilters: Prisma.LeadBusinessWhereInput[] = [];
    if (parsed.leadBusinessId) leadFilters.push({ id: parsed.leadBusinessId });
    if (suppression.phone) leadFilters.push({ normalizedPhone: suppression.phone });
    await prisma.leadBusiness.updateMany({
      where: {
        organizationId: context.organizationId,
        OR: leadFilters
      },
      data: { doNotCall: parsed.reason === "do_not_call", callReady: false }
    });
  }
  await audit(context, "sales.suppression.created", "ContactSuppression", suppression.id, {
    channel: suppression.channel,
    reason: suppression.reason
  });
  revalidateSales();
}

export async function createSalesGoalAction(formData: FormData) {
  const context = await salesContext("sales.goals.manage");
  const parsed = salesGoalSchema.parse(Object.fromEntries(formData));
  const goal = await prisma.salesGoal.create({
    data: {
      organizationId: context.organizationId,
      userId: parsed.userId || null,
      periodType: parsed.periodType,
      metric: parsed.metric,
      targetValue: parsed.targetValue,
      startDate: new Date(`${parsed.startDate}T00:00:00.000Z`),
      endDate: new Date(`${parsed.endDate}T23:59:59.999Z`)
    }
  });
  await audit(context, "sales.goal.created", "SalesGoal", goal.id, { metric: goal.metric });
  revalidateSales();
}

export async function createSalesPriorityAction(formData: FormData) {
  const context = await anySalesContext(["dashboard.view"]);
  const title = String(formData.get("title") ?? "Sales priority").slice(0, 180);
  const description = String(formData.get("description") ?? "").slice(0, 500);
  const existing = await prisma.personalPriority.findFirst({
    where: {
      organizationId: context.organizationId,
      userId: context.userId,
      title,
      status: "OPEN",
      category: "sales"
    }
  });
  if (!existing) {
    const priority = await prisma.personalPriority.create({
      data: {
        organizationId: context.organizationId,
        userId: context.userId,
        title,
        description,
        category: "sales",
        urgency: "high",
        priorityLevel: "high",
        timeframe: "today",
        estimatedRevenueImpact: new Prisma.Decimal(
          String(Number(formData.get("impactCents") ?? 0) / 100)
        )
      }
    });
    await audit(context, "sales.priority.created", "PersonalPriority", priority.id, { title });
  }
  revalidatePath("/app");
  revalidateSales();
}

export async function processSalesJobs(limit = 3) {
  const jobs = await prisma.backgroundJob.findMany({
    where: { status: "queued", type: "lead_campaign_search" },
    include: { campaign: true },
    orderBy: { createdAt: "asc" },
    take: limit
  });

  for (const job of jobs) {
    if (!job.campaign) continue;
    await prisma.backgroundJob.update({
      where: { id: job.id },
      data: {
        status: "running",
        lockedAt: new Date(),
        startedAt: new Date(),
        attemptCount: { increment: 1 }
      }
    });
    try {
      const provider = getLeadSourceProvider(job.campaign.sourceProvider);
      const location = [job.campaign.city, job.campaign.state, job.campaign.country]
        .filter(Boolean)
        .join(", ");
      let stored = 0;
      for (const term of job.campaign.searchTerms) {
        const results = await provider.search({
          query: term,
          location,
          limit: Math.min(20, job.campaign.targetLeadCount - stored)
        });
        for (const result of results) {
          const lead = await upsertLeadBusiness(
            { organizationId: job.organizationId },
            { ...result, source: job.campaign.sourceProvider }
          );
          await prisma.leadCampaignMembership.upsert({
            where: {
              campaignId_leadBusinessId: { campaignId: job.campaign.id, leadBusinessId: lead.id }
            },
            update: {},
            create: {
              organizationId: job.organizationId,
              campaignId: job.campaign.id,
              leadBusinessId: lead.id,
              searchQuery: term,
              campaignStatus: "new"
            }
          });
          stored += 1;
        }
        if (stored >= job.campaign.targetLeadCount) break;
      }
      await prisma.$transaction([
        prisma.backgroundJob.update({
          where: { id: job.id },
          data: {
            status: "completed",
            progressCurrent: stored,
            progressTotal: job.progressTotal,
            resultSummary: { stored },
            completedAt: new Date(),
            lockedAt: null
          }
        }),
        prisma.leadCampaign.update({
          where: { id: job.campaign.id },
          data: { status: "completed", completedAt: new Date() }
        })
      ]);
    } catch (error) {
      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Job failed",
          completedAt: new Date(),
          lockedAt: null
        }
      });
      await prisma.leadCampaign.update({
        where: { id: job.campaign.id },
        data: { status: "failed" }
      });
    }
  }
}

async function upsertLeadBusiness(
  context: Pick<SalesContext, "organizationId">,
  input: ProviderLeadResult & {
    trade?: string | null;
    ownerName?: string | null;
    email?: string | null;
    googleBusinessProfileUrl?: string | null;
    sourceUrls?: string | null;
    ownerVerificationSource?: string | null;
    phoneVerificationSource?: string | null;
    phoneVerificationMethod?: string | null;
    phoneType?: string | null;
    assignedUserId?: string | null;
    nextFollowUpAt?: string | null;
    doNotCall?: boolean;
    requestedCallReady?: boolean;
    industry?: string | null;
    source?: string;
    notes?: string | null;
  }
) {
  const normalized = normalizeProviderResult(input);
  if (normalized.normalizedPhone) {
    await assertPhoneAvailable(context.organizationId, normalized.normalizedPhone);
    await assertNumberNotSuppressed(context.organizationId, normalized.normalizedPhone, "phone");
  }
  const phoneVerificationMethod = input.phoneVerificationMethod ?? "unverified";
  const phoneVerificationSource = input.phoneVerificationSource?.trim() || null;
  const callReady = canMarkCallReady({
    normalizedPhone: normalized.normalizedPhone,
    phoneVerificationMethod,
    phoneVerificationSource
  });
  if (input.requestedCallReady && !callReady) {
    throw new Error("CALL_READY_REQUIRES_OFFICIAL_PHONE_EVIDENCE");
  }
  if (input.phoneType === "direct_owner" && !input.ownerVerificationSource) {
    throw new Error("OWNER_DIRECT_REQUIRES_EVIDENCE");
  }
  const keys = dedupeCandidateKeys({
    googlePlaceId: normalized.googlePlaceId,
    normalizedPhone: normalized.normalizedPhone,
    normalizedDomain: normalized.normalizedDomain,
    normalizedBusinessName: normalized.normalizedBusinessName,
    address: input.address,
    city: input.city,
    state: input.state,
    postalCode: input.postalCode
  });
  const existing = await findDuplicateLead(context.organizationId, normalized, keys);
  const similarNameWarning = await similarBusinessNameWarning(
    context.organizationId,
    input.businessName
  );
  const data = {
    businessName: input.businessName,
    normalizedBusinessName: normalized.normalizedBusinessName,
    trade: input.trade || tradeFromIndustry(input.industry),
    ownerName: input.ownerName || null,
    primaryPhone: input.phone || null,
    normalizedPhone: normalized.normalizedPhone,
    email: normalizeEmail(input.email),
    websiteUrl: input.websiteUrl || null,
    normalizedDomain: normalized.normalizedDomain,
    googleBusinessProfileUrl: input.googleBusinessProfileUrl || input.googleMapsUrl || null,
    address: input.address || null,
    city: input.city || null,
    state: input.state || "UT",
    postalCode: input.postalCode || null,
    country: input.country || "United States",
    latitude: decimalOrNull(input.latitude),
    longitude: decimalOrNull(input.longitude),
    industry: input.industry || null,
    googlePlaceId: input.googlePlaceId || null,
    googleMapsUrl: input.googleMapsUrl || null,
    rating: decimalOrNull(input.rating),
    reviewCount: input.reviewCount ?? null,
    businessStatus: input.businessStatus || null,
    source: input.source || "manual",
    sourceRecordId: input.sourceRecordId || input.googlePlaceId || null,
    sourceUrls: normalizeSourceUrls(input.sourceUrls),
    notes: input.notes || null
  };
  if (existing) {
    if (existing.normalizedPhone && existing.normalizedPhone === normalized.normalizedPhone) {
      throw new Error("DUPLICATE_NORMALIZED_PHONE");
    }
    return prisma.leadBusiness.update({
      where: { id: existing.id },
      data: {
        ...data,
        ownerVerificationSource: input.ownerVerificationSource || null,
        phoneVerificationSource,
        phoneVerificationDate: phoneVerificationSource ? new Date() : null,
        phoneVerificationMethod,
        phoneType: input.phoneType || "unknown",
        leadScore: crmLeadScore({
          trade: input.trade,
          state: input.state || "UT",
          normalizedPhone: normalized.normalizedPhone,
          phoneVerificationMethod,
          phoneVerificationSource,
          phoneType: input.phoneType,
          ownerName: input.ownerName,
          websiteUrl: input.websiteUrl,
          googleBusinessProfileUrl: input.googleBusinessProfileUrl || input.googleMapsUrl
        }),
        assignedUserId: input.assignedUserId || null,
        nextFollowUpAt: input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : null,
        doNotCall: Boolean(input.doNotCall),
        callReady: Boolean(!input.doNotCall && callReady),
        callReadyAt: callReady ? new Date() : null,
        notes: [data.notes, similarNameWarning].filter(Boolean).join("\n") || null
      }
    });
  }
  return prisma.leadBusiness.create({
    data: {
      organizationId: context.organizationId,
      ...data,
      ownerVerificationSource: input.ownerVerificationSource || null,
      phoneVerificationSource,
      phoneVerificationDate: phoneVerificationSource ? new Date() : null,
      phoneVerificationMethod,
      phoneType: input.phoneType || "unknown",
      leadScore: crmLeadScore({
        trade: input.trade,
        state: input.state || "UT",
        normalizedPhone: normalized.normalizedPhone,
        phoneVerificationMethod,
        phoneVerificationSource,
        phoneType: input.phoneType,
        ownerName: input.ownerName,
        websiteUrl: input.websiteUrl,
        googleBusinessProfileUrl: input.googleBusinessProfileUrl || input.googleMapsUrl
      }),
      assignedUserId: input.assignedUserId || null,
      nextFollowUpAt: input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : null,
      doNotCall: Boolean(input.doNotCall),
      callReady: Boolean(!input.doNotCall && callReady),
      callReadyAt: callReady ? new Date() : null,
      notes: [data.notes, similarNameWarning].filter(Boolean).join("\n") || null
    }
  });
}

async function findDuplicateLead(
  organizationId: string,
  normalized: ReturnType<typeof normalizeProviderResult>,
  keys: string[]
) {
  const or: Prisma.LeadBusinessWhereInput[] = [];
  if (normalized.googlePlaceId) or.push({ googlePlaceId: normalized.googlePlaceId });
  if (normalized.normalizedPhone) or.push({ normalizedPhone: normalized.normalizedPhone });
  if (normalized.normalizedDomain) or.push({ normalizedDomain: normalized.normalizedDomain });
  if (keys.some((key) => key.startsWith("name-address:"))) {
    or.push({
      normalizedBusinessName: normalized.normalizedBusinessName,
      address: normalized.address || undefined
    });
  }
  if (!or.length) return null;
  return prisma.leadBusiness.findFirst({ where: { organizationId, OR: or } });
}

async function assertPhoneAvailable(organizationId: string, normalizedPhone: string) {
  const existing = await prisma.leadBusiness.findFirst({
    where: { organizationId, normalizedPhone, archivedAt: null },
    select: { id: true }
  });
  if (existing) throw new Error("DUPLICATE_NORMALIZED_PHONE");
}

async function assertNumberNotSuppressed(
  organizationId: string,
  normalizedPhone: string | null,
  channel: string
) {
  if (!normalizedPhone) return;
  const suppression = await prisma.contactSuppression.findFirst({
    where: {
      organizationId,
      phone: normalizedPhone,
      permanent: true,
      OR: [{ channel }, { channel: "all" }]
    }
  });
  if (suppression) throw new Error("SUPPRESSED_NUMBER");
}

async function similarBusinessNameWarning(organizationId: string, businessName: string) {
  const normalizedBusinessName = normalizeProviderResult({ businessName }).normalizedBusinessName;
  const candidates = await prisma.leadBusiness.findMany({
    where: {
      organizationId,
      archivedAt: null,
      normalizedBusinessName: {
        contains: normalizedBusinessName.split(" ")[0] || normalizedBusinessName
      }
    },
    select: { businessName: true },
    take: 12
  });
  const match = candidates.find(
    (candidate) => businessNameSimilarity(candidate.businessName, businessName) >= 0.72
  );
  return match ? `Warning: similar business name already exists (${match.businessName}).` : null;
}

function tradeFromIndustry(industry?: string | null) {
  const value = industry?.toLowerCase() ?? "";
  if (value.includes("plumb")) return "Plumbing";
  if (value.includes("hvac") || value.includes("heating") || value.includes("cooling"))
    return "HVAC";
  return null;
}

function tradeCell(row: Record<string, string>) {
  const raw = cell(row, "Trade", "trade", "Industry", "industry");
  return tradeFromIndustry(raw) ?? (raw.toLowerCase().includes("plumb") ? "Plumbing" : "HVAC");
}

function verificationMethodCell(row: Record<string, string>) {
  const raw = cell(
    row,
    "Phone verification method",
    "phoneVerificationMethod",
    "phone_verification_method"
  )
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");
  if (raw.includes("google")) return "official_google_business_profile";
  if (raw.includes("website") || raw.includes("company_site")) return "official_company_website";
  if (raw === "other") return "other";
  return "unverified";
}

function phoneTypeCell(row: Record<string, string>) {
  const raw = cell(row, "Phone type", "phoneType", "phone_type")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");
  if (raw.includes("owner") && raw.includes("direct")) return "direct_owner";
  if (raw.includes("official") || raw.includes("company")) return "official_company_line";
  if (raw.includes("office")) return "office_line";
  return "unknown";
}

function boolCell(row: Record<string, string>, ...keys: string[]) {
  return ["true", "yes", "1", "y"].includes(
    cell(row, ...keys)
      .trim()
      .toLowerCase()
  );
}

function assignedUserCell(
  context: SalesContext,
  members: Array<{ userId: string; user: { name: string | null; email: string } }>,
  row: Record<string, string>
) {
  const raw = cell(row, "Assigned user", "assignedUser", "assigned_user").trim().toLowerCase();
  if (!raw) return null;
  const member = members.find((item) => {
    const name = item.user.name?.toLowerCase() ?? "";
    const email = item.user.email.toLowerCase();
    return name === raw || email === raw || email.startsWith(`${raw}@`);
  });
  if (member) return member.userId;
  return raw === "me" ? context.userId : raw;
}

async function suppressLeadNumber(
  context: Pick<SalesContext, "organizationId" | "userId">,
  lead: {
    id: string;
    businessName: string;
    normalizedBusinessName: string;
    normalizedPhone: string | null;
  },
  reason: string,
  source: string
) {
  if (!lead.normalizedPhone) return null;
  return prisma.contactSuppression.upsert({
    where: {
      organizationId_phone_channel: {
        organizationId: context.organizationId,
        phone: lead.normalizedPhone,
        channel: "phone"
      }
    },
    update: { reason, source, permanent: true, expiresAt: null },
    create: {
      organizationId: context.organizationId,
      leadBusinessId: lead.id,
      businessName: lead.businessName,
      normalizedBusinessName: lead.normalizedBusinessName,
      phone: lead.normalizedPhone,
      channel: "phone",
      reason,
      source,
      permanent: true,
      createdById: context.userId
    }
  });
}

async function assertProspectAccess(
  context: SalesContext,
  prospectId: string,
  mode: "view" | "manage"
) {
  const prospect = await prisma.prospect.findFirstOrThrow({
    where: { id: prospectId, organizationId: context.organizationId },
    include: { leadBusiness: true }
  });
  const allPermission = mode === "manage" ? "prospects.manage_all" : "prospects.view_all";
  if (!context.permissions.includes(allPermission) && prospect.assignedUserId !== context.userId) {
    throw new Error("FORBIDDEN");
  }
  return prospect;
}

async function assertOpportunityAccess(
  context: SalesContext,
  opportunityId: string,
  mode: "view" | "manage"
) {
  const opportunity = await prisma.opportunity.findFirstOrThrow({
    where: { id: opportunityId, organizationId: context.organizationId }
  });
  const allPermission = mode === "manage" ? "opportunities.manage_all" : "pipeline.view_all";
  if (
    !context.permissions.includes(allPermission) &&
    opportunity.assignedCloserId !== context.userId
  ) {
    throw new Error("FORBIDDEN");
  }
  return opportunity;
}

async function assertStage(organizationId: string, pipelineStageId: string) {
  return prisma.pipelineStage.findFirstOrThrow({ where: { id: pipelineStageId, organizationId } });
}

async function assertService(organizationId: string, serviceOfferingId: string) {
  return prisma.serviceOffering.findFirstOrThrow({
    where: { id: serviceOfferingId, organizationId }
  });
}

async function assertNotSuppressed(organizationId: string, prospectId: string, channel: string) {
  const prospect = await prisma.prospect.findFirstOrThrow({
    where: { id: prospectId, organizationId },
    include: { leadBusiness: true, primaryContact: true }
  });
  const phone = normalizePhone(
    prospect.primaryContact?.phone || prospect.leadBusiness.primaryPhone
  );
  if (prospect.leadBusiness.doNotCall) throw new Error("CONTACT_SUPPRESSED");
  const email = normalizeEmail(prospect.primaryContact?.email);
  const matches: Prisma.ContactSuppressionWhereInput[] = [
    { prospectId },
    { leadBusinessId: prospect.leadBusinessId }
  ];
  if (phone) matches.push({ phone, channel: { in: [channel, "all"] } });
  if (email) matches.push({ email, channel: { in: [channel, "all"] } });
  const suppression = await prisma.contactSuppression.findFirst({
    where: {
      organizationId,
      OR: matches
    }
  });
  if (suppression) throw new Error("CONTACT_SUPPRESSED");
}

function parseCsv(csv: string) {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const headers = splitCsvLine(lines.shift() ?? "").map((header) =>
    escapeCsvFormula(header.trim())
  );
  return lines.map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(
      headers.map((header, index) => [header, escapeCsvFormula(values[index]?.trim() ?? "")])
    );
  });
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function cell(row: Record<string, string>, ...keys: string[]) {
  return keys.map((key) => row[key]).find(Boolean) || "";
}

function numberCell(row: Record<string, string>, ...keys: string[]) {
  const value = Number(cell(row, ...keys));
  return Number.isFinite(value) ? value : null;
}

function requiredCents(value: string) {
  const cents = parseMoneyToCents(value);
  if (!cents || cents <= 0) throw new Error("INVALID_AMOUNT");
  return cents;
}

function optionalCents(value?: string | null) {
  if (!value) return null;
  const cents = parseMoneyToCents(value);
  if (cents === null || cents < 0) throw new Error("INVALID_AMOUNT");
  return cents;
}

function nullableNumber(value: unknown) {
  return value === "" || value === undefined || value === null ? null : Number(value);
}

function decimalOrNull(value: unknown) {
  const number = nullableNumber(value);
  return number === null || !Number.isFinite(number) ? null : new Prisma.Decimal(number);
}

function decimalToNumber(value: Prisma.Decimal | number | null) {
  if (value === null) return null;
  return typeof value === "number" ? value : value.toNumber();
}

async function audit(
  context: Pick<SalesContext, "organizationId" | "userId">,
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

function revalidateSales() {
  revalidatePath("/app");
  revalidatePath("/app/sales");
  revalidatePath("/app/sales/queue");
  revalidatePath("/app/sales/follow-ups");
  revalidatePath("/app/sales/appointments");
  revalidatePath("/app/sales/pipeline");
  revalidatePath("/app/sales/performance");
}
