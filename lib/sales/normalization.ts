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
