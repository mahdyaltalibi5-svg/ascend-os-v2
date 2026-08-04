import { describe, expect, it } from "vitest";

import {
  businessNameSimilarity,
  canMarkCallReady,
  crmLeadScore,
  dedupeCandidateKeys,
  escapeCsvFormula,
  normalizeBusinessName,
  normalizeDomain,
  normalizePhone
} from "@/lib/sales/normalization";
import {
  followUpForOutcome,
  isWithinCallingWindow,
  queueRank,
  weightedValue
} from "@/lib/sales/operations";
import { scoreLead } from "@/lib/sales/scoring";
import { isPrivateIp, parseHttpUrl } from "@/lib/sales/url-safety";

describe("sales core helpers", () => {
  it("normalizes businesses, phones, domains, and duplicate keys", () => {
    expect(normalizeBusinessName("Apex Roofing, LLC")).toBe("apex roofing");
    expect(normalizePhone("+1 (602) 555-0100")).toBe("6025550100");
    expect(normalizeDomain("https://www.apexroofing.com/services")).toBe("apexroofing.com");
    expect(
      dedupeCandidateKeys({
        googlePlaceId: "abc",
        normalizedPhone: "6025550100",
        normalizedDomain: "apexroofing.com",
        normalizedBusinessName: "apex roofing",
        address: "100 Main St",
        city: "Phoenix",
        state: "AZ"
      })
    ).toEqual(
      expect.arrayContaining([
        "place:abc",
        "phone:6025550100",
        "domain:apexroofing.com",
        "name-address:apex roofing:100 main st phoenix az"
      ])
    );
  });

  it("scores and classifies leads from deterministic evidence", () => {
    const score = scoreLead({
      rating: 4.0,
      reviewCount: 42,
      normalizedPhone: "6025550100",
      industry: "roofing",
      websiteEvidence: {
        reachable: true,
        https: true,
        hasTitle: true,
        hasMetaDescription: false,
        headingCount: 1,
        hasViewport: false,
        hasPhone: false,
        hasForm: false,
        hasPrimaryCta: false,
        outdatedCopyright: true,
        errors: []
      }
    });

    expect(score.overallFitScore).toBeGreaterThan(50);
    expect(["hot", "warm", "cold"]).toContain(score.classification);
    expect(score.reasons.length).toBeGreaterThan(0);
  });

  it("ranks queue items and creates deterministic follow-ups", () => {
    const now = new Date("2026-07-28T16:00:00.000Z");
    expect(isWithinCallingWindow(now)).toBe(true);
    expect(
      queueRank(
        {
          id: "p1",
          priority: "hot",
          status: "assigned",
          attemptCount: 0,
          noAnswerCount: 0,
          conversationCount: 0,
          nextActionAt: now,
          lastContactAt: null,
          estimatedValueCents: 500000,
          createdAt: now,
          leadBusinessId: "lead1",
          leadBusiness: {
            leadScore: 88,
            ownerReachScore: 74,
            marketingNeedSignals: ["Weak CTA"],
            websiteWeaknesses: ["No booking flow"],
            reviewCount: 42,
            rating: 4.1,
            city: "Salt Lake City",
            state: "UT",
            normalizedPhone: "8015550100",
            callReady: true,
            doNotCall: false
          }
        },
        now
      )
    ).toBeGreaterThan(150);
    expect(
      queueRank(
        {
          id: "missing-phone",
          priority: "hot",
          status: "assigned",
          attemptCount: 0,
          noAnswerCount: 0,
          conversationCount: 0,
          nextActionAt: now,
          lastContactAt: null,
          estimatedValueCents: 500000,
          createdAt: now,
          leadBusinessId: "lead2",
          leadBusiness: {
            leadScore: 95,
            ownerReachScore: 95,
            marketingNeedSignals: ["Weak CTA"],
            websiteWeaknesses: [],
            reviewCount: 42,
            rating: 4.1,
            city: "Salt Lake City",
            state: "UT",
            normalizedPhone: null,
            callReady: true,
            doNotCall: false
          }
        },
        now
      )
    ).toBe(-1);
    expect(followUpForOutcome("callback_requested", now)?.type).toBe("call");
    expect(weightedValue(500000, 40)).toBe(200000);
  });

  it("protects CSV exports and unsafe URLs", () => {
    expect(escapeCsvFormula("=IMPORTXML(...)")).toBe("'=IMPORTXML(...)");
    expect(parseHttpUrl("example.com").protocol).toBe("https:");
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("192.168.1.10")).toBe(true);
    expect(isPrivateIp("8.8.8.8")).toBe(false);
  });

  it("enforces CRM call-ready evidence and similar-name warnings", () => {
    expect(
      canMarkCallReady({
        normalizedPhone: "8015550100",
        phoneVerificationMethod: "official_company_website",
        phoneVerificationSource: "https://example.com/contact"
      })
    ).toBe(true);
    expect(
      canMarkCallReady({
        normalizedPhone: "8015550100",
        phoneVerificationMethod: "other",
        phoneVerificationSource: "https://directory.example"
      })
    ).toBe(false);
    expect(
      crmLeadScore({
        trade: "HVAC",
        state: "UT",
        normalizedPhone: "8015550100",
        phoneVerificationMethod: "official_google_business_profile",
        phoneVerificationSource: "https://maps.google.com/?cid=123",
        phoneType: "official_company_line",
        ownerName: "Jamie Smith",
        websiteUrl: "https://example.com",
        googleBusinessProfileUrl: "https://maps.google.com/?cid=123"
      })
    ).toBeGreaterThan(80);
    expect(
      businessNameSimilarity("Wasatch Plumbing LLC", "Wasatch Plumbing Company")
    ).toBeGreaterThan(0.7);
  });
});
