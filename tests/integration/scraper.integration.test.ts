import { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { normalizeBusinessName, normalizePhone } from "@/lib/sales/normalization";
import type { LeadSourceProvider } from "@/lib/sales/providers";

const testUrl = process.env.TEST_DATABASE_URL;
const runIntegration =
  Boolean(testUrl) && testUrl !== process.env.DATABASE_URL && process.env.NODE_ENV !== "production";

const describeScraper = runIntegration ? describe : describe.skip;

describeScraper("verified scraper database workflows", () => {
  const setup = new PrismaClient({
    datasources: { db: { url: testUrl ?? "postgresql://skip:skip@127.0.0.1:1/skip" } }
  });

  it("processes mocked discovery, approves call-ready leads, and blocks duplicates and suppression", async () => {
    process.env.DATABASE_URL = testUrl;
    const { approveScraperDiscovery, processScraperJobs } = await import("@/lib/server/scraper");
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const org = await setup.organization.create({
      data: { name: `Scraper ${unique}`, slug: `scraper-${unique}`, timezone: "America/Denver" }
    });
    const mahdy = await setup.user.create({
      data: {
        name: "Mahdy",
        email: `mahdy-${unique}@example.test`,
        normalizedEmail: `mahdy-${unique}@example.test`,
        passwordHash: "test-hash"
      }
    });
    const logan = await setup.user.create({
      data: {
        name: "Logan",
        email: `logan-${unique}@example.test`,
        normalizedEmail: `logan-${unique}@example.test`,
        passwordHash: "test-hash"
      }
    });
    await setup.organizationMembership.createMany({
      data: [
        { organizationId: org.id, userId: mahdy.id },
        { organizationId: org.id, userId: logan.id }
      ]
    });
    await setup.scraperScoringPolicy.create({
      data: {
        organizationId: org.id,
        ownerReachWeight: 40,
        marketingNeedWeight: 40,
        dataConfidenceWeight: 20,
        minimumConfidence: 70
      }
    });

    await seedJob(setup, org.id, ["HVAC"]);
    const provider = providerFor("Wasatch Comfort Pros", "801-555-0100", "place-one");
    const fetchWebsite = async (url: string) => ({
      finalUrl: url,
      status: 200,
      html: `<title>Wasatch Comfort Pros</title><meta name="description" content="Local HVAC services in Utah"><meta name="viewport" content="width=device-width"><h1>Heating repair</h1><a href="tel:8015550100">Call</a><p>Founder Jamie Smith leads our locally owned team.</p>`,
      contentType: "text/html",
      responseMs: 100
    });

    await expect(processScraperJobs(1, { provider, fetchWebsite })).resolves.toMatchObject([
      { status: "completed", stored: 1 }
    ]);
    const discovery = await setup.scraperLeadDiscovery.findFirstOrThrow({
      where: { organizationId: org.id, googlePlaceId: "place-one" },
      include: { weaknesses: true }
    });
    expect(discovery.status).toBe("call_ready");
    expect(discovery.phoneVerificationStatus).toBe("official_website_verified");
    expect(discovery.ownerName).toBe("Jamie Smith");
    expect(discovery.weaknesses.length).toBeGreaterThan(0);

    const lead = await approveScraperDiscovery(
      {
        organizationId: org.id,
        userId: mahdy.id,
        timezone: "America/Denver",
        permissions: ["scraper.view", "scraper.approve"]
      },
      {
        discoveryId: discovery.id,
        action: "approve",
        assignedUserId: logan.id,
        rejectionReason: "",
        businessName: "",
        ownerName: "",
        phone: "",
        websiteUrl: "",
        googleBusinessProfileUrl: "",
        notes: ""
      }
    );
    expect(lead.callReady).toBe(true);
    expect(lead.assignedUserId).toBe(logan.id);
    expect(lead.phoneType).toBe("owner_operated_main_line");

    await seedJob(setup, org.id, ["HVAC"]);
    await processScraperJobs(1, { provider, fetchWebsite });
    const duplicate = await setup.scraperLeadDiscovery.findFirstOrThrow({
      where: { organizationId: org.id, googlePlaceId: "place-one", status: "duplicate" },
      orderBy: { createdAt: "desc" }
    });
    expect(duplicate.status).toBe("duplicate");
    expect(duplicate.duplicateWarnings.join(" ")).toContain("phone");
    await expect(
      setup.scraperLeadDiscovery.findUnique({ where: { id: discovery.id } })
    ).resolves.toMatchObject({
      status: "approved"
    });

    await setup.contactSuppression.create({
      data: {
        organizationId: org.id,
        phone: normalizePhone("801-555-0199"),
        businessName: "Suppressed Plumbing",
        normalizedBusinessName: normalizeBusinessName("Suppressed Plumbing"),
        channel: "phone",
        reason: "do_not_call",
        source: "test",
        permanent: true
      }
    });
    await seedJob(setup, org.id, ["Plumbing"]);
    await processScraperJobs(1, {
      provider: providerFor("Suppressed Plumbing", "801-555-0199", "place-two"),
      fetchWebsite: async (url) => ({
        finalUrl: url,
        status: 200,
        html: `<title>Suppressed Plumbing</title><meta name="description" content="Utah plumbing services"><meta name="viewport" content="width=device-width"><a href="tel:8015550199">Call</a>`,
        contentType: "text/html",
        responseMs: 100
      })
    });
    const suppressed = await setup.scraperLeadDiscovery.findFirstOrThrow({
      where: { organizationId: org.id, googlePlaceId: "place-two" }
    });
    expect(suppressed.status).toBe("suppressed");
  });
});

async function seedJob(prisma: PrismaClient, organizationId: string, trades: string[]) {
  return prisma.backgroundJob.create({
    data: {
      organizationId,
      type: "lead_scraper_discovery",
      status: "queued",
      input: {
        sourceProvider: "fixture",
        cities: ["Salt Lake City"],
        trades,
        limitPerSearch: 1,
        plan: trades.map((trade) => ({
          city: "Salt Lake City",
          trade,
          query: `${trade} Salt Lake City Utah`,
          location: "Salt Lake City, UT",
          limit: 1
        }))
      },
      progressTotal: trades.length
    }
  });
}

function providerFor(businessName: string, phone: string, placeId: string): LeadSourceProvider {
  return {
    key: "fixture",
    enabled: true,
    async search() {
      return [
        {
          businessName,
          phone,
          websiteUrl: "https://wasatch.example",
          address: "100 Main St, Salt Lake City, UT 84101, United States",
          city: "Salt Lake City",
          state: "UT",
          postalCode: "84101",
          country: "United States",
          googlePlaceId: placeId,
          googleMapsUrl: `https://maps.google.com/?cid=${placeId}`,
          rating: 4.1,
          reviewCount: 12,
          businessStatus: "OPERATIONAL",
          sourceRecordId: placeId
        }
      ];
    }
  };
}
