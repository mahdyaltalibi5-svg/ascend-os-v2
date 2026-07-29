import { fetchWithSafety } from "@/lib/sales/url-safety";

export type WebsiteEvidence = {
  reachable: boolean;
  statusCode?: number;
  finalUrl?: string;
  https: boolean;
  hasTitle: boolean;
  hasMetaDescription: boolean;
  headingCount: number;
  hasViewport: boolean;
  hasPhone: boolean;
  hasForm: boolean;
  hasPrimaryCta: boolean;
  outdatedCopyright: boolean;
  errors: string[];
};

export type ScoreInput = {
  rating?: number | null;
  reviewCount?: number | null;
  websiteEvidence?: WebsiteEvidence | null;
  franchiseStatus?: string | null;
  normalizedPhone?: string | null;
  industry?: string | null;
};

export async function analyzeWebsite(url?: string | null): Promise<{
  websiteStatus: string;
  websiteQualityScore: number;
  mobileQualityScore: number;
  conversionQualityScore: number;
  seoWeaknessScore: number;
  primaryWeaknesses: string[];
  evidence: WebsiteEvidence;
}> {
  if (!url) {
    const evidence = emptyEvidence(false, ["No website URL stored."]);
    return websiteScores("missing", evidence, ["No website stored."]);
  }

  try {
    const response = await fetchWithSafety(url);
    const html = response.html.slice(0, 400_000);
    const lower = html.toLowerCase();
    const evidence: WebsiteEvidence = {
      reachable: response.status >= 200 && response.status < 400,
      statusCode: response.status,
      finalUrl: response.finalUrl,
      https: response.finalUrl.startsWith("https://"),
      hasTitle: /<title[^>]*>[^<]{4,}<\/title>/i.test(html),
      hasMetaDescription: /<meta[^>]+name=["']description["'][^>]*content=["'][^"']{20,}/i.test(
        html
      ),
      headingCount: (html.match(/<h[1-3][\s>]/gi) ?? []).length,
      hasViewport: /<meta[^>]+name=["']viewport["']/i.test(html),
      hasPhone: /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(html),
      hasForm: /<form[\s>]/i.test(html),
      hasPrimaryCta:
        /(book|schedule|call now|get estimate|request quote|free quote|contact us)/i.test(html),
      outdatedCopyright: /copyright[^0-9]*(20[0-2][0-4]|19\d{2})/i.test(lower),
      errors: []
    };
    return websiteScores(evidence.reachable ? "reachable" : "unreachable", evidence);
  } catch (error) {
    const evidence = emptyEvidence(false, [
      error instanceof Error ? error.message : "Fetch failed"
    ]);
    return websiteScores("blocked_or_failed", evidence, evidence.errors);
  }
}

export function scoreLead(input: ScoreInput) {
  const evidence = input.websiteEvidence;
  const reviewCount = input.reviewCount ?? 0;
  const rating = input.rating ?? 0;
  const reasons: string[] = [];
  let abilityToPayScore = 35;
  let ownerAccessibilityScore = input.normalizedPhone ? 65 : 25;
  let gbpWeaknessScore = 45;
  let urgencyScore = 35;
  let websiteQualityScore = 0;
  let mobileQualityScore = 0;
  let conversionQualityScore = 0;

  if (reviewCount >= 15 && reviewCount <= 150) {
    abilityToPayScore += 25;
    reasons.push("Review volume suggests an established local business without obvious scale.");
  } else if (reviewCount < 10) {
    abilityToPayScore -= 18;
    reasons.push("Low review volume reduces evidence of ability to pay.");
  } else if (reviewCount > 250) {
    abilityToPayScore += 8;
    ownerAccessibilityScore -= 20;
    reasons.push("High review volume may indicate a harder-to-reach or more mature operation.");
  }

  if (rating > 0 && rating < 4.2) {
    gbpWeaknessScore += 15;
    urgencyScore += 8;
    reasons.push("Rating leaves visible GBP improvement opportunity.");
  }

  if (evidence) {
    const websiteScores = scoreWebsiteEvidence(evidence);
    websiteQualityScore = websiteScores.websiteQualityScore;
    mobileQualityScore = websiteScores.mobileQualityScore;
    conversionQualityScore = websiteScores.conversionQualityScore;
    urgencyScore += websiteScores.urgencyLift;
    reasons.push(...websiteScores.reasons);
  } else {
    reasons.push("Website has not been analyzed yet.");
  }

  if (input.franchiseStatus === "likely_franchise") {
    reasons.push("Likely franchise reduces fit for owner-operated outreach.");
  }

  abilityToPayScore = clamp(abilityToPayScore);
  ownerAccessibilityScore = clamp(ownerAccessibilityScore);
  urgencyScore = clamp(urgencyScore);
  gbpWeaknessScore = clamp(gbpWeaknessScore);
  const overallFitScore = clamp(
    Math.round(
      abilityToPayScore * 0.24 +
        ownerAccessibilityScore * 0.16 +
        urgencyScore * 0.18 +
        gbpWeaknessScore * 0.12 +
        (100 - websiteQualityScore) * 0.14 +
        (100 - conversionQualityScore) * 0.16
    )
  );

  const classification =
    input.franchiseStatus === "likely_franchise"
      ? "bad_fit"
      : reviewCount < 5 && !evidence?.hasPhone
        ? "too_small"
        : overallFitScore >= 72
          ? "hot"
          : overallFitScore >= 54
            ? "warm"
            : overallFitScore >= 36
              ? "cold"
              : "needs_review";

  return {
    abilityToPayScore,
    ownerAccessibilityScore,
    gbpWeaknessScore,
    urgencyScore,
    websiteQualityScore,
    mobileQualityScore,
    conversionQualityScore,
    seoWeaknessScore: evidence ? 100 - websiteQualityScore : 0,
    automationOpportunityScore: clamp(urgencyScore - 10),
    overallFitScore,
    classification,
    recommendedService: recommendedService(input.industry, evidence),
    confidenceLevel: evidence ? "medium" : "low",
    reasons: reasons.slice(0, 6)
  };
}

function scoreWebsiteEvidence(evidence: WebsiteEvidence) {
  let websiteQualityScore = evidence.reachable ? 55 : 0;
  let mobileQualityScore = evidence.hasViewport ? 70 : 25;
  let conversionQualityScore = 45;
  const reasons: string[] = [];
  let urgencyLift = 0;

  if (!evidence.https) {
    websiteQualityScore -= 12;
    reasons.push("Website is not confirmed HTTPS.");
  }
  if (!evidence.hasTitle || !evidence.hasMetaDescription || evidence.headingCount === 0) {
    websiteQualityScore -= 16;
    urgencyLift += 8;
    reasons.push("Basic SEO signals are incomplete.");
  }
  if (!evidence.hasViewport) {
    mobileQualityScore -= 30;
    urgencyLift += 10;
    reasons.push("Mobile viewport signal is missing.");
  }
  if (!evidence.hasPrimaryCta) {
    conversionQualityScore -= 20;
    urgencyLift += 10;
    reasons.push("No clear primary call to action was found in the analyzed HTML.");
  }
  if (!evidence.hasPhone && !evidence.hasForm) {
    conversionQualityScore -= 18;
    urgencyLift += 8;
    reasons.push("The analyzed page did not expose an obvious phone number or form.");
  }
  if (evidence.outdatedCopyright) {
    websiteQualityScore -= 12;
    urgencyLift += 8;
    reasons.push("The page has an outdated copyright clue.");
  }

  return {
    websiteQualityScore: clamp(websiteQualityScore),
    mobileQualityScore: clamp(mobileQualityScore),
    conversionQualityScore: clamp(conversionQualityScore),
    urgencyLift,
    reasons
  };
}

function websiteScores(status: string, evidence: WebsiteEvidence, extraWeaknesses: string[] = []) {
  const scored = scoreWebsiteEvidence(evidence);
  return {
    websiteStatus: status,
    websiteQualityScore: scored.websiteQualityScore,
    mobileQualityScore: scored.mobileQualityScore,
    conversionQualityScore: scored.conversionQualityScore,
    seoWeaknessScore: evidence.reachable ? 100 - scored.websiteQualityScore : 0,
    primaryWeaknesses: [...extraWeaknesses, ...scored.reasons].slice(0, 8),
    evidence
  };
}

function emptyEvidence(https: boolean, errors: string[]): WebsiteEvidence {
  return {
    reachable: false,
    https,
    hasTitle: false,
    hasMetaDescription: false,
    headingCount: 0,
    hasViewport: false,
    hasPhone: false,
    hasForm: false,
    hasPrimaryCta: false,
    outdatedCopyright: false,
    errors
  };
}

function recommendedService(industry?: string | null, evidence?: WebsiteEvidence | null) {
  if (evidence && (!evidence.hasPrimaryCta || !evidence.hasForm))
    return "Website conversion rebuild";
  if (industry?.toLowerCase().includes("roof")) return "Local SEO and GBP growth";
  return "Local growth system";
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
