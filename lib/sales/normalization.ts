export function normalizeBusinessName(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(inc|llc|ltd|co|company|corp|corporation)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizePhone(value?: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  if (digits.length === 10) return digits;
  return digits.length >= 7 ? digits : null;
}

export function normalizeDomain(value?: string | null) {
  if (!value) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const host = new URL(withProtocol).hostname.toLowerCase();
    return host.replace(/^www\./, "");
  } catch {
    return (
      value
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .split("/")[0]
        ?.trim() || null
    );
  }
}

export function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() || null;
}

export function normalizeSourceUrls(value?: string | string[] | null) {
  const raw = Array.isArray(value) ? value : String(value ?? "").split(/\n|,/);
  return Array.from(
    new Set(
      raw
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 12)
    )
  );
}

export function isOfficialPhoneVerification(method?: string | null) {
  return method === "official_company_website" || method === "official_google_business_profile";
}

export function canMarkCallReady(input: {
  normalizedPhone?: string | null;
  phoneVerificationMethod?: string | null;
  phoneVerificationSource?: string | null;
}) {
  return Boolean(
    input.normalizedPhone &&
    input.phoneVerificationSource?.trim() &&
    isOfficialPhoneVerification(input.phoneVerificationMethod)
  );
}

export function crmLeadScore(input: {
  trade?: string | null;
  state?: string | null;
  normalizedPhone?: string | null;
  phoneVerificationMethod?: string | null;
  phoneVerificationSource?: string | null;
  phoneType?: string | null;
  ownerName?: string | null;
  websiteUrl?: string | null;
  googleBusinessProfileUrl?: string | null;
}) {
  let score = 0;
  if (input.trade === "HVAC" || input.trade === "Plumbing") score += 20;
  if (input.state?.toUpperCase() === "UT") score += 15;
  if (canMarkCallReady(input)) score += 30;
  if (input.phoneType === "direct_owner") score += 10;
  if (input.phoneType === "official_company_line") score += 6;
  if (input.ownerName) score += 8;
  if (input.websiteUrl) score += 7;
  if (input.googleBusinessProfileUrl) score += 5;
  return Math.min(100, score);
}

export function businessNameSimilarity(a: string, b: string) {
  const left = new Set(normalizeBusinessName(a).split(" ").filter(Boolean));
  const right = new Set(normalizeBusinessName(b).split(" ").filter(Boolean));
  const union = new Set([...left, ...right]);
  if (!union.size) return 0;
  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection += 1;
  }
  return intersection / union.size;
}

export function normalizedAddressKey(input: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
}) {
  return [input.address, input.city, input.state, input.postalCode]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function dedupeCandidateKeys(input: {
  googlePlaceId?: string | null;
  normalizedPhone?: string | null;
  normalizedDomain?: string | null;
  normalizedBusinessName: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
}) {
  const keys: string[] = [];
  if (input.googlePlaceId) keys.push(`place:${input.googlePlaceId}`);
  if (input.normalizedPhone) keys.push(`phone:${input.normalizedPhone}`);
  if (input.normalizedDomain) keys.push(`domain:${input.normalizedDomain}`);
  const addressKey = normalizedAddressKey(input);
  if (input.normalizedBusinessName && addressKey) {
    keys.push(`name-address:${input.normalizedBusinessName}:${addressKey}`);
  }
  return keys;
}

export function escapeCsvFormula(value: string) {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}
