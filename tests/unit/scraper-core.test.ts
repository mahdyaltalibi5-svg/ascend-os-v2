import { describe, expect, it } from "vitest";

import {
  buildScraperSearchPlan,
  classifyTrade,
  detectMarketingWeaknesses,
  detectOwnerEvidence,
  duplicateWarningsFor,
  extractPhoneNumbers,
  isOfficialScraperPhoneVerification,
  isUtahResult,
  phoneMethodForScraperStatus,
  scoreDiscovery,
  scraperPhoneTypeForOwnerConfidence,
  scraperStatusFor,
  verifyPhone
} from "@/lib/sales/scraper";
import { isPrivateIp, parseHttpUrl } from "@/lib/sales/url-safety";

describe("scraper core helpers", () => {
  it("keeps discovery scoped to Utah HVAC and plumbing", () => {
    expect(classifyTrade("Wasatch HVAC and Cooling")).toBe("HVAC");
    expect(classifyTrade("Jordan River Plumbing")).toBe("Plumbing");
    expect(classifyTrade("Utah Electrical Services")).toBeNull();
    expect(isUtahResult({ state: "UT" })).toBe(true);
    expect(isUtahResult({ address: "10 Main St, Boise, ID" })).toBe(false);

    const plan = buildScraperSearchPlan({
      cities: ["Salt Lake City"],
      trades: ["HVAC", "Plumbing"],
      limitPerSearch: 2
    });
    expect(plan).toHaveLength(6);
    expect(plan.every((item) => item.location.endsWith(", UT"))).toBe(true);
  });

  it("verifies phones only against official website or Google profile evidence", () => {
    const html = `<a href="tel:+18015550100">Call</a><p>(385) 555-0199</p>`;
    expect(extractPhoneNumbers(html)).toEqual(expect.arrayContaining(["8015550100", "3855550199"]));

    const verified = verifyPhone({
      discoveryPhone: "801-555-0100",
      websitePhones: extractPhoneNumbers(html),
      websiteUrl: "https://wasatch.example/contact"
    });
    expect(verified.status).toBe("official_website_verified");
    expect(isOfficialScraperPhoneVerification(verified.status)).toBe(true);
    expect(phoneMethodForScraperStatus(verified.status)).toBe("official_company_website");

    expect(
      verifyPhone({
        discoveryPhone: "801-555-0100",
        websitePhones: ["3855550199"],
        websiteUrl: "https://wasatch.example/contact"
      }).status
    ).toBe("source_mismatch");
  });

  it("extracts owner signals without inventing owner-direct phone evidence", () => {
    const owner = detectOwnerEvidence({
      businessName: "Wasatch Comfort",
      sourceUrl: "https://wasatch.example/about",
      html: "<main>Founder Jamie Smith leads our locally owned HVAC company.</main>"
    });
    expect(owner.ownerName).toBe("Jamie Smith");
    expect(owner.ownerConfidence).toBe("verified_owner");
    expect(scraperPhoneTypeForOwnerConfidence(owner.ownerConfidence)).toBe(
      "owner_operated_main_line"
    );

    const none = detectOwnerEvidence({
      businessName: "Wasatch Comfort",
      sourceUrl: "https://wasatch.example",
      html: "<main>Call our dispatch team today.</main>"
    });
    expect(none.ownerName).toBeNull();
    expect(none.ownerConfidence).toBe("company_line_only");
  });

  it("scores weaknesses and blocks call-ready status for mismatches, duplicates, and suppression", () => {
    const weaknesses = detectMarketingWeaknesses({
      sourceUrl: "http://wasatch.example",
      finalUrl: "http://wasatch.example",
      statusCode: 200,
      html: "<html><body><h1>Heating</h1><p>Coming soon</p></body></html>",
      responseMs: 4200
    });
    expect(weaknesses.map((weakness) => weakness.signal)).toEqual(
      expect.arrayContaining(["no_https", "weak_primary_cta", "placeholder_content"])
    );

    const score = scoreDiscovery(
      {
        trade: "HVAC",
        state: "UT",
        normalizedPhone: "8015550100",
        phoneVerificationStatus: "official_website_verified",
        ownerConfidence: "verified_owner",
        websiteUrl: "https://wasatch.example",
        reviewCount: 14,
        rating: 4.0,
        weaknesses
      },
      {
        ownerReachWeight: 40,
        marketingNeedWeight: 40,
        dataConfidenceWeight: 20,
        minimumConfidence: 70
      }
    );
    expect(score.callReady).toBe(true);
    expect(scraperStatusFor({ trade: "HVAC", state: "UT", callReady: true })).toBe("call_ready");
    expect(
      scoreDiscovery(
        {
          ...score,
          trade: "HVAC",
          state: "UT",
          normalizedPhone: "8015550100",
          phoneVerificationStatus: "source_mismatch",
          duplicateWarnings: ["Duplicate normalized phone number already exists."]
        },
        {
          ownerReachWeight: 40,
          marketingNeedWeight: 40,
          dataConfidenceWeight: 20,
          minimumConfidence: 70
        }
      ).callReady
    ).toBe(false);
  });

  it("warns on duplicates and blocks unsafe URL targets", () => {
    expect(
      duplicateWarningsFor({
        businessName: "Wasatch Plumbing LLC",
        normalizedPhone: "8015550100",
        existingPhones: ["8015550100"],
        existingBusinessNames: ["Wasatch Plumbing Company"]
      })
    ).toHaveLength(2);
    expect(parseHttpUrl("example.com").protocol).toBe("https:");
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("169.254.169.254")).toBe(true);
  });
});
