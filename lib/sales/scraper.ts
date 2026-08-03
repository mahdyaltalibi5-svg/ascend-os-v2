import {
  scraperTradeSearchTerms,
  type crmTrades,
  type scraperPhoneVerificationStatuses
} from "@/lib/sales/constants";
import {
  businessNameSimilarity,
  normalizeBusinessName,
  normalizeDomain,
  normalizePhone
} from "@/lib/sales/normalization";

export const SCRAPER_USER_AGENT =
  "AscendOSVerifiedLeadScraper/1.0 (+https://ascend-os-v2-app.vercel.app)";

export type ScraperTrade = (typeof crmTrades)[number];
export type ScraperPhoneVerificationStatus = (typeof scraperPhoneVerificationStatuses)[number];

export type ScraperMarketingWeaknessInput = {
  html?: string | null;
  statusCode?: number | null;
  finalUrl?: string | null;
  sourceUrl?: string | null;
  error?: string | null;
  responseMs?: number | null;
};

export type ScraperWeakness = {
  signal: string;
  evidence: string;
  sourceUrl?: string | null;
  severity: "low" | "medium" | "high";
};

export type VerificationResult = {
  status: ScraperPhoneVerificationStatus;
  source: string | null;
  date: Date | null;
  normalizedPhone: string | null;
  sourcePhones: string[];
};

export type OwnerEvidence = {
  ownerName: string | null;
  ownerVerificationSource: string | null;
  ownerVerificationMethod: string | null;
  ownerConfidence: "verified_owner" | "owner_signal" | "company_line_only" | "unverified";
  reasons: string[];
};

export type ScraperScoreInput = {
  trade?: string | null;
  state?: string | null;
  city?: string | null;
  normalizedPhone?: string | null;
  phoneVerificationStatus?: string | null;
  ownerConfidence?: string | null;
  ownerName?: string | null;
  websiteUrl?: string | null;
  googleBusinessProfileUrl?: string | null;
  reviewCount?: number | null;
  rating?: number | null;
  weaknesses?: ScraperWeakness[];
  duplicateWarnings?: string[];
  suppressed?: boolean;
};

export type ScraperScoringPolicyInput = {
  ownerReachWeight: number;
  marketingNeedWeight: number;
  dataConfidenceWeight: number;
  minimumConfidence: number;
};

export function classifyTrade(...values: Array<string | null | undefined>): ScraperTrade | null {
  const text = values.filter(Boolean).join(" ").toLowerCase();
  if (/\b(electric|electrical|electrician|solar)\b/.test(text)) return null;
  if (/\b(plumb\w*|drain|sewer|water heater|pipe)\b/.test(text)) return "Plumbing";
  if (/\b(hvac|heating|cooling|air conditioning|furnace|ac repair|ventilation)\b/.test(text)) {
    return "HVAC";
  }
  return null;
}

export function isUtahResult(input: { state?: string | null; address?: string | null }) {
  if (input.state?.toUpperCase() === "UT") return true;
  return /\bUT\b|\bUtah\b/i.test(input.address ?? "");
}

export function extractPhoneNumbers(html: string) {
  const phones = new Set<string>();
  const telLinks = html.matchAll(/href=["']tel:([^"']+)["']/gi);
  for (const match of telLinks) addPhone(phones, match[1]);

  const phoneMatches = html.matchAll(
    /(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/g
  );
  for (const match of phoneMatches) addPhone(phones, match[0]);

  return Array.from(phones);
}

export function verifyPhone(input: {
  discoveryPhone?: string | null;
  websitePhones?: string[];
  googlePhone?: string | null;
  websiteUrl?: string | null;
  googleBusinessProfileUrl?: string | null;
}): VerificationResult {
  const normalizedPhone = normalizePhone(input.discoveryPhone ?? input.googlePhone);
  const websitePhones = new Set((input.websitePhones ?? []).map(normalizePhone).filter(isString));
  const googlePhone = normalizePhone(input.googlePhone);
  const now = new Date();

  if (!normalizedPhone) {
    return {
      status: "missing_phone",
      source: null,
      date: null,
      normalizedPhone: null,
      sourcePhones: Array.from(websitePhones)
    };
  }

  if (input.websiteUrl && websitePhones.has(normalizedPhone)) {
    return {
      status: "official_website_verified",
      source: input.websiteUrl,
      date: now,
      normalizedPhone,
      sourcePhones: Array.from(websitePhones)
    };
  }

  if (websitePhones.size > 0 && !websitePhones.has(normalizedPhone)) {
    return {
      status: "source_mismatch",
      source: input.websiteUrl ?? null,
      date: null,
      normalizedPhone,
      sourcePhones: Array.from(websitePhones)
    };
  }

  if (googlePhone && googlePhone === normalizedPhone && input.googleBusinessProfileUrl) {
    return {
      status: "official_google_profile_verified",
      source: input.googleBusinessProfileUrl,
      date: now,
      normalizedPhone,
      sourcePhones: Array.from(websitePhones)
    };
  }

  return {
    status: input.websiteUrl ? "unable_to_verify" : "no_website",
    source: null,
    date: null,
    normalizedPhone,
    sourcePhones: Array.from(websitePhones)
  };
}

export function detectOwnerEvidence(input: {
  html?: string | null;
  sourceUrl?: string | null;
  businessName: string;
}): OwnerEvidence {
  const html = stripHtml(input.html ?? "");
  const reasons: string[] = [];
  const ownerPattern =
    /\b(?:[Oo]wner|[Ff]ounder|[Cc]o-owner|[Pp]resident)\b(?:\s*(?:is|:|-|,|\sof\s))?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/;
  const reversePattern =
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s*,?\s+(?:[Oo]wner|[Ff]ounder|[Cc]o-owner|[Pp]resident)\b/;
  const ownerName = ownerPattern.exec(html)?.[1] ?? reversePattern.exec(html)?.[1] ?? null;
  const familySignal = /\b(owner-operated|locally owned|family owned|family-owned)\b/i.test(html);

  if (ownerName) {
    reasons.push("Website text names a person with owner/founder language.");
    if (familySignal)
      reasons.push("Website also includes owner-operated or family-owned language.");
    return {
      ownerName,
      ownerVerificationSource: input.sourceUrl ?? null,
      ownerVerificationMethod: "official_company_website",
      ownerConfidence: "verified_owner",
      reasons
    };
  }

  if (familySignal) {
    return {
      ownerName: null,
      ownerVerificationSource: input.sourceUrl ?? null,
      ownerVerificationMethod: "official_company_website",
      ownerConfidence: "owner_signal",
      reasons: ["Website contains owner-operated, locally owned, or family-owned language."]
    };
  }

  return {
    ownerName: null,
    ownerVerificationSource: null,
    ownerVerificationMethod: null,
    ownerConfidence: "company_line_only",
    reasons: ["No explicit owner identity evidence was found."]
  };
}

export function detectMarketingWeaknesses(input: ScraperMarketingWeaknessInput) {
  const weaknesses: ScraperWeakness[] = [];
  const html = input.html ?? "";
  const text = stripHtml(html).toLowerCase();
  const sourceUrl = input.finalUrl ?? input.sourceUrl ?? null;

  if (!input.sourceUrl) {
    weaknesses.push({
      signal: "missing_website",
      evidence: "Google Places did not return an official website URL.",
      sourceUrl,
      severity: "high"
    });
    return weaknesses;
  }

  if (input.error) {
    weaknesses.push({
      signal: "website_blocked_or_failed",
      evidence: `Official website analysis failed: ${input.error}.`,
      sourceUrl,
      severity: "medium"
    });
    return weaknesses;
  }

  if (input.statusCode && (input.statusCode < 200 || input.statusCode >= 400)) {
    weaknesses.push({
      signal: "website_status",
      evidence: `Official website returned HTTP ${input.statusCode}.`,
      sourceUrl,
      severity: "high"
    });
  }
  if (sourceUrl?.startsWith("http://")) {
    weaknesses.push({
      signal: "no_https",
      evidence: "Official website was not confirmed on HTTPS.",
      sourceUrl,
      severity: "medium"
    });
  }
  if (!/<title[^>]*>[^<]{4,}<\/title>/i.test(html)) {
    weaknesses.push({
      signal: "missing_title",
      evidence: "Homepage is missing a clear title tag.",
      sourceUrl,
      severity: "medium"
    });
  }
  if (!/<meta[^>]+name=["']description["'][^>]*content=["'][^"']{20,}/i.test(html)) {
    weaknesses.push({
      signal: "missing_meta_description",
      evidence: "Homepage is missing a useful meta description.",
      sourceUrl,
      severity: "medium"
    });
  }
  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) {
    weaknesses.push({
      signal: "mobile_viewport_missing",
      evidence: "Homepage does not expose a mobile viewport tag.",
      sourceUrl,
      severity: "medium"
    });
  }
  if (!/(book|schedule|call now|get estimate|request quote|free quote|contact us)/i.test(html)) {
    weaknesses.push({
      signal: "weak_primary_cta",
      evidence: "Homepage lacks an obvious scheduling, quote, or call CTA.",
      sourceUrl,
      severity: "high"
    });
  }
  if (!/<form[\s>]/i.test(html)) {
    weaknesses.push({
      signal: "missing_form",
      evidence: "Homepage does not expose a lead capture form.",
      sourceUrl,
      severity: "medium"
    });
  }
  if (!/\b(repair|installation|maintenance|service|emergency)\b/i.test(text)) {
    weaknesses.push({
      signal: "thin_service_copy",
      evidence: "Homepage has weak service-offer language for local search intent.",
      sourceUrl,
      severity: "medium"
    });
  }
  if (/\b(lorem ipsum|coming soon|under construction)\b/i.test(html)) {
    weaknesses.push({
      signal: "placeholder_content",
      evidence: "Homepage contains placeholder or unfinished-site language.",
      sourceUrl,
      severity: "high"
    });
  }
  if (/copyright[^0-9]*(20[0-2][0-4]|19\d{2})/i.test(text)) {
    weaknesses.push({
      signal: "outdated_copyright",
      evidence: "Homepage includes an outdated copyright clue.",
      sourceUrl,
      severity: "low"
    });
  }
  if (!/(schema.org\/(?:LocalBusiness|HVACBusiness|Plumber)|application\/ld\+json)/i.test(html)) {
    weaknesses.push({
      signal: "missing_local_schema",
      evidence: "No local business structured-data clue was found in the analyzed HTML.",
      sourceUrl,
      severity: "low"
    });
  }
  if ((input.responseMs ?? 0) > 3500) {
    weaknesses.push({
      signal: "slow_response",
      evidence: `Homepage response took ${input.responseMs}ms during analysis.`,
      sourceUrl,
      severity: "medium"
    });
  }

  return weaknesses.slice(0, 10);
}

export function scoreDiscovery(input: ScraperScoreInput, policy: ScraperScoringPolicyInput) {
  const ownerReachReasons: string[] = [];
  const marketingNeedReasons: string[] = [];
  const dataConfidenceReasons: string[] = [];

  let ownerReachScore = 30;
  if (input.ownerConfidence === "verified_owner") {
    ownerReachScore += 40;
    ownerReachReasons.push("Official site names an owner or founder.");
  } else if (input.ownerConfidence === "owner_signal") {
    ownerReachScore += 22;
    ownerReachReasons.push("Official site suggests owner-operated or family-owned positioning.");
  } else {
    ownerReachReasons.push("No owner-direct evidence found; treat as company line only.");
  }
  if (input.normalizedPhone) ownerReachScore += 15;
  if ((input.reviewCount ?? 0) > 200) {
    ownerReachScore -= 12;
    ownerReachReasons.push("High review volume may indicate a larger operation.");
  }

  let marketingNeedScore = 25;
  for (const weakness of input.weaknesses ?? []) {
    marketingNeedScore +=
      weakness.severity === "high" ? 14 : weakness.severity === "medium" ? 8 : 4;
  }
  if ((input.reviewCount ?? 0) < 15) {
    marketingNeedScore += 10;
    marketingNeedReasons.push("Low review volume suggests GBP growth opportunity.");
  }
  if ((input.rating ?? 5) < 4.2) {
    marketingNeedScore += 8;
    marketingNeedReasons.push("Rating leaves visible reputation improvement opportunity.");
  }
  if (input.weaknesses?.length) {
    marketingNeedReasons.push(...input.weaknesses.slice(0, 4).map((weakness) => weakness.evidence));
  }

  let dataConfidenceScore = 0;
  if (input.trade === "HVAC" || input.trade === "Plumbing") {
    dataConfidenceScore += 20;
    dataConfidenceReasons.push("Trade is inside the approved HVAC/plumbing scope.");
  }
  if (input.state?.toUpperCase() === "UT") {
    dataConfidenceScore += 20;
    dataConfidenceReasons.push("Location is confirmed in Utah.");
  }
  if (isOfficialScraperPhoneVerification(input.phoneVerificationStatus)) {
    dataConfidenceScore += 35;
    dataConfidenceReasons.push("Phone is verified from an official source.");
  }
  if (input.websiteUrl || input.googleBusinessProfileUrl) dataConfidenceScore += 10;
  if (input.duplicateWarnings?.length) {
    dataConfidenceScore -= 20;
    dataConfidenceReasons.push("Duplicate warning requires human review.");
  }
  if (input.suppressed) {
    dataConfidenceScore = 0;
    dataConfidenceReasons.push("Number is permanently suppressed.");
  }
  if (input.phoneVerificationStatus === "source_mismatch") {
    dataConfidenceScore = Math.min(dataConfidenceScore, 35);
    dataConfidenceReasons.push("Phone sources disagree.");
  }

  ownerReachScore = clamp(ownerReachScore);
  marketingNeedScore = clamp(marketingNeedScore);
  dataConfidenceScore = clamp(dataConfidenceScore);
  const totalWeight =
    policy.ownerReachWeight + policy.marketingNeedWeight + policy.dataConfidenceWeight || 100;
  const callPriorityScore = clamp(
    Math.round(
      (ownerReachScore * policy.ownerReachWeight +
        marketingNeedScore * policy.marketingNeedWeight +
        dataConfidenceScore * policy.dataConfidenceWeight) /
        totalWeight
    )
  );
  const callReady =
    callPriorityScore >= policy.minimumConfidence &&
    dataConfidenceScore >= policy.minimumConfidence &&
    (input.trade === "HVAC" || input.trade === "Plumbing") &&
    input.state?.toUpperCase() === "UT" &&
    isOfficialScraperPhoneVerification(input.phoneVerificationStatus) &&
    !input.duplicateWarnings?.length &&
    !input.suppressed;

  return {
    ownerReachScore,
    marketingNeedScore,
    dataConfidenceScore,
    callPriorityScore,
    ownerReachReasons: ownerReachReasons.slice(0, 6),
    marketingNeedReasons: marketingNeedReasons.slice(0, 8),
    dataConfidenceReasons: dataConfidenceReasons.slice(0, 8),
    callReady
  };
}

export function scraperStatusFor(input: {
  trade?: string | null;
  state?: string | null;
  suppressed?: boolean;
  duplicateWarnings?: string[];
  phoneVerificationStatus?: string | null;
  callReady?: boolean;
}) {
  if (input.trade !== "HVAC" && input.trade !== "Plumbing") return "not_target_trade";
  if (input.state?.toUpperCase() !== "UT") return "outside_utah";
  if (input.suppressed) return "suppressed";
  if (input.duplicateWarnings?.some((warning) => warning.includes("phone"))) return "duplicate";
  if (input.phoneVerificationStatus === "source_mismatch") return "source_mismatch";
  if (input.callReady) return "call_ready";
  if (isOfficialScraperPhoneVerification(input.phoneVerificationStatus)) return "verified";
  return "needs_manual_review";
}

export function buildScraperSearchPlan(input: {
  cities: string[];
  trades: ScraperTrade[];
  limitPerSearch: number;
}) {
  return input.cities.flatMap((city) =>
    input.trades.flatMap((trade) =>
      scraperTradeSearchTerms[trade].map((term) => ({
        city,
        trade,
        query: `${term} ${city} Utah`,
        location: `${city}, UT`,
        limit: input.limitPerSearch
      }))
    )
  );
}

export function duplicateWarningsFor(input: {
  businessName: string;
  normalizedPhone?: string | null;
  existingPhones?: string[];
  existingBusinessNames?: string[];
}) {
  const warnings: string[] = [];
  if (input.normalizedPhone && input.existingPhones?.includes(input.normalizedPhone)) {
    warnings.push("Duplicate normalized phone number already exists.");
  }
  const match = input.existingBusinessNames?.find(
    (name) => businessNameSimilarity(name, input.businessName) >= 0.72
  );
  if (match) warnings.push(`Similar normalized business name already exists: ${match}.`);
  return warnings;
}

export function isOfficialScraperPhoneVerification(status?: string | null) {
  return status === "official_website_verified" || status === "official_google_profile_verified";
}

export function phoneMethodForScraperStatus(status?: string | null) {
  if (status === "official_website_verified") return "official_company_website";
  if (status === "official_google_profile_verified") return "official_google_business_profile";
  return "unverified";
}

export function scraperPhoneTypeForOwnerConfidence(ownerConfidence?: string | null) {
  return ownerConfidence === "verified_owner"
    ? "owner_operated_main_line"
    : "official_company_line";
}

export function normalizeScraperDiscovery(input: {
  businessName: string;
  phone?: string | null;
  websiteUrl?: string | null;
}) {
  return {
    normalizedBusinessName: normalizeBusinessName(input.businessName),
    normalizedPhone: normalizePhone(input.phone),
    normalizedDomain: normalizeDomain(input.websiteUrl)
  };
}

function addPhone(phones: Set<string>, value?: string | null) {
  const normalized = normalizePhone(value);
  if (normalized) phones.add(normalized);
}

function isString(value: string | null): value is string {
  return Boolean(value);
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
