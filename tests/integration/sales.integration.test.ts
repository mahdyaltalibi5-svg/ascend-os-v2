import { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { weightedValue } from "@/lib/sales/operations";
import { normalizeBusinessName, normalizeDomain, normalizePhone } from "@/lib/sales/normalization";

const testUrl = process.env.TEST_DATABASE_URL;
const runIntegration =
  Boolean(testUrl) && testUrl !== process.env.DATABASE_URL && process.env.NODE_ENV !== "production";

const describeSales = runIntegration ? describe : describe.skip;

describeSales("sales database workflows", () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: testUrl ?? "postgresql://skip:skip@127.0.0.1:1/skip" } }
  });

  it("creates leads, deduplicates, converts to prospect, records sales activity, and hands off revenue", async () => {
    const unique = Date.now();
    const orgA = await prisma.organization.create({
      data: {
        name: `Sales Test A ${unique}`,
        slug: `sales-test-a-${unique}`,
        timezone: "America/Denver"
      }
    });
    const orgB = await prisma.organization.create({
      data: {
        name: `Sales Test B ${unique}`,
        slug: `sales-test-b-${unique}`,
        timezone: "America/Denver"
      }
    });
    const pipeline = await prisma.pipeline.create({
      data: { organizationId: orgA.id, name: `Pipeline ${unique}`, isDefault: true }
    });
    const newStage = await prisma.pipelineStage.create({
      data: {
        organizationId: orgA.id,
        pipelineId: pipeline.id,
        name: "New prospect",
        sortOrder: 0,
        defaultProbability: 10
      }
    });
    const wonStage = await prisma.pipelineStage.create({
      data: {
        organizationId: orgA.id,
        pipelineId: pipeline.id,
        name: "Won",
        sortOrder: 1,
        defaultProbability: 100,
        isWonStage: true
      }
    });
    const service = await prisma.serviceOffering.create({
      data: {
        organizationId: orgA.id,
        name: `Growth System ${unique}`,
        revenueCategory: "website",
        billingType: "project"
      }
    });

    const lead = await prisma.leadBusiness.create({
      data: {
        organizationId: orgA.id,
        businessName: "Wasatch Comfort Pros",
        normalizedBusinessName: normalizeBusinessName("Wasatch Comfort Pros"),
        trade: "HVAC",
        ownerName: "Jamie Smith",
        primaryPhone: "(801) 555-0100",
        normalizedPhone: normalizePhone("(801) 555-0100"),
        email: "owner@wasatch.example",
        websiteUrl: "https://apex.example",
        normalizedDomain: normalizeDomain("https://apex.example"),
        googleBusinessProfileUrl: "https://maps.google.com/?cid=123",
        city: "Salt Lake City",
        state: "UT",
        industry: "HVAC",
        sourceUrls: ["https://apex.example/contact"],
        phoneVerificationMethod: "official_company_website",
        phoneVerificationSource: "https://apex.example/contact",
        phoneVerificationDate: new Date("2026-07-28T16:00:00.000Z"),
        phoneType: "official_company_line",
        leadScore: 83,
        callReady: true,
        callReadyAt: new Date("2026-07-28T16:00:00.000Z"),
        rating: 4.1,
        reviewCount: 42,
        source: "manual"
      }
    });
    const duplicate = await prisma.leadBusiness.findFirst({
      where: { organizationId: orgA.id, normalizedPhone: normalizePhone("8015550100") }
    });
    expect(duplicate?.id).toBe(lead.id);
    await expect(
      prisma.leadBusiness.create({
        data: {
          organizationId: orgA.id,
          businessName: "Duplicate Comfort",
          normalizedBusinessName: normalizeBusinessName("Duplicate Comfort"),
          trade: "HVAC",
          primaryPhone: "8015550100",
          normalizedPhone: normalizePhone("8015550100"),
          state: "UT",
          source: "manual"
        }
      })
    ).rejects.toThrow();

    const racingPhone = normalizePhone("801-555-0199");
    const racingWrites = await Promise.allSettled([
      prisma.leadBusiness.create({
        data: {
          organizationId: orgA.id,
          businessName: "Concurrent HVAC One",
          normalizedBusinessName: normalizeBusinessName("Concurrent HVAC One"),
          trade: "HVAC",
          primaryPhone: "801-555-0199",
          normalizedPhone: racingPhone,
          state: "UT",
          source: "manual"
        }
      }),
      prisma.leadBusiness.create({
        data: {
          organizationId: orgA.id,
          businessName: "Concurrent HVAC Two",
          normalizedBusinessName: normalizeBusinessName("Concurrent HVAC Two"),
          trade: "HVAC",
          primaryPhone: "(801) 555-0199",
          normalizedPhone: racingPhone,
          state: "UT",
          source: "manual"
        }
      })
    ]);
    expect(racingWrites.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(racingWrites.filter((result) => result.status === "rejected")).toHaveLength(1);

    const analysis = await prisma.leadAnalysis.create({
      data: {
        organizationId: orgA.id,
        leadBusinessId: lead.id,
        websiteStatus: "reachable",
        websiteQualityScore: 45,
        mobileQualityScore: 35,
        conversionQualityScore: 30,
        seoWeaknessScore: 55,
        gbpWeaknessScore: 60,
        automationOpportunityScore: 50,
        ownerAccessibilityScore: 75,
        abilityToPayScore: 70,
        urgencyScore: 65,
        overallFitScore: 78,
        classification: "hot",
        primaryWeaknesses: ["No clear CTA"],
        recommendedService: "Website conversion rebuild",
        researchSummary: "Deterministic evidence found a conversion opportunity.",
        evidence: { reasons: ["No clear CTA"] }
      }
    });
    expect(analysis.classification).toBe("hot");

    const prospect = await prisma.prospect.create({
      data: {
        organizationId: orgA.id,
        leadBusinessId: lead.id,
        assignedUserId: "salesperson-test",
        status: "assigned",
        priority: "hot",
        estimatedValueCents: 500000,
        recommendedService: analysis.recommendedService
      }
    });
    await prisma.outreachAttempt.create({
      data: {
        organizationId: orgA.id,
        prospectId: prospect.id,
        userId: "salesperson-test",
        channel: "phone",
        direction: "outbound",
        startedAt: new Date("2026-07-28T16:00:00.000Z"),
        completedAt: new Date("2026-07-28T16:03:00.000Z"),
        outcome: "interested",
        durationSeconds: 180
      }
    });
    await prisma.prospect.update({
      where: { id: prospect.id },
      data: { attemptCount: 1, conversationCount: 1, status: "connected" }
    });
    const followUp = await prisma.followUp.create({
      data: {
        organizationId: orgA.id,
        prospectId: prospect.id,
        assignedUserId: "salesperson-test",
        type: "call",
        dueAt: new Date("2026-07-29T16:00:00.000Z"),
        priority: "hot"
      }
    });
    expect(followUp.status).toBe("open");

    const opportunity = await prisma.opportunity.create({
      data: {
        organizationId: orgA.id,
        prospectId: prospect.id,
        assignedCloserId: "founder-test",
        name: "Apex Roofing Website",
        pipelineStageId: newStage.id,
        serviceOfferingId: service.id,
        estimatedValueCents: 500000,
        weightedValueCents: weightedValue(500000, 10),
        probabilityPercent: 10,
        expectedCloseDate: new Date("2026-08-15T00:00:00.000Z"),
        status: "open"
      }
    });
    await prisma.appointment.create({
      data: {
        organizationId: orgA.id,
        prospectId: prospect.id,
        opportunityId: opportunity.id,
        title: "Sales call",
        startAt: new Date("2026-07-30T16:00:00.000Z"),
        endAt: new Date("2026-07-30T17:00:00.000Z"),
        timezone: "America/Denver",
        status: "scheduled",
        meetingType: "sales_call"
      }
    });
    await prisma.opportunity.update({
      where: { id: opportunity.id },
      data: {
        pipelineStageId: wonStage.id,
        status: "won",
        probabilityPercent: 100,
        weightedValueCents: 500000,
        wonAt: new Date("2026-08-01T00:00:00.000Z")
      }
    });
    const client = await prisma.client.create({
      data: {
        organizationId: orgA.id,
        businessName: "Apex Roofing",
        status: "active",
        source: "sales_handoff"
      }
    });
    const contract = await prisma.revenueContract.create({
      data: {
        organizationId: orgA.id,
        clientId: client.id,
        serviceOfferingId: service.id,
        sourceOpportunityId: opportunity.id,
        name: "Apex Roofing Website",
        contractedAmountCents: 500000,
        billingType: "project",
        status: "signed",
        startDate: new Date("2026-08-01T00:00:00.000Z")
      }
    });
    expect(contract.sourceOpportunityId).toBe(opportunity.id);

    await prisma.contactSuppression.create({
      data: {
        organizationId: orgA.id,
        prospectId: prospect.id,
        leadBusinessId: lead.id,
        businessName: lead.businessName,
        normalizedBusinessName: lead.normalizedBusinessName,
        phone: normalizePhone("(801) 555-0100"),
        channel: "phone",
        reason: "do_not_call",
        permanent: true
      }
    });
    await expect(
      prisma.contactSuppression.create({
        data: {
          organizationId: orgA.id,
          leadBusinessId: lead.id,
          businessName: lead.businessName,
          normalizedBusinessName: lead.normalizedBusinessName,
          phone: normalizePhone("(801) 555-0100"),
          channel: "phone",
          reason: "wrong_person",
          permanent: true
        }
      })
    ).rejects.toThrow();
    const crossOrgProspectLookup = await prisma.prospect.findFirst({
      where: { id: prospect.id, organizationId: orgB.id }
    });
    expect(crossOrgProspectLookup).toBeNull();
  });
});
