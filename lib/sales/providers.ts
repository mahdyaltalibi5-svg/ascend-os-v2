import { normalizeDomain, normalizePhone, normalizeBusinessName } from "@/lib/sales/normalization";

export type LeadProviderSearchInput = {
  query: string;
  location: string;
  limit: number;
};

export type ProviderLeadResult = {
  businessName: string;
  phone?: string | null;
  websiteUrl?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googlePlaceId?: string | null;
  googleMapsUrl?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  businessStatus?: string | null;
  sourceRecordId?: string | null;
};

export interface LeadSourceProvider {
  key: string;
  enabled: boolean;
  search(input: LeadProviderSearchInput): Promise<ProviderLeadResult[]>;
}

export class GooglePlacesLeadSourceProvider implements LeadSourceProvider {
  key = "google_places";
  enabled: boolean;

  constructor(private readonly apiKey = process.env.GOOGLE_PLACES_API_KEY) {
    this.enabled = Boolean(apiKey);
  }

  async search(input: LeadProviderSearchInput) {
    if (!this.apiKey) throw new Error("GOOGLE_PLACES_NOT_CONFIGURED");
    const url = new URL("https://places.googleapis.com/v1/places:searchText");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": this.apiKey,
        "x-goog-fieldmask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.businessStatus,places.googleMapsUri,places.websiteUri,places.nationalPhoneNumber"
      },
      body: JSON.stringify({
        textQuery: `${input.query} in ${input.location}`,
        maxResultCount: Math.min(20, Math.max(1, input.limit))
      })
    });

    if (!response.ok) {
      throw new Error(`GOOGLE_PLACES_ERROR_${response.status}`);
    }

    const payload = (await response.json()) as {
      places?: Array<{
        id?: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        location?: { latitude?: number; longitude?: number };
        rating?: number;
        userRatingCount?: number;
        businessStatus?: string;
        googleMapsUri?: string;
        websiteUri?: string;
        nationalPhoneNumber?: string;
      }>;
    };

    return (payload.places ?? []).map((place) => {
      const address = parseAddress(place.formattedAddress);
      return {
        businessName: place.displayName?.text ?? "Unnamed business",
        phone: place.nationalPhoneNumber ?? null,
        websiteUrl: place.websiteUri ?? null,
        address: place.formattedAddress ?? null,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
        latitude: place.location?.latitude ?? null,
        longitude: place.location?.longitude ?? null,
        googlePlaceId: place.id ?? null,
        googleMapsUrl: place.googleMapsUri ?? null,
        rating: place.rating ?? null,
        reviewCount: place.userRatingCount ?? null,
        businessStatus: place.businessStatus ?? null,
        sourceRecordId: place.id ?? null
      };
    });
  }
}

export class FixtureLeadSourceProvider implements LeadSourceProvider {
  key = "fixture";
  enabled = true;

  async search(input: LeadProviderSearchInput) {
    return [
      {
        businessName: `${input.query.split(" ")[0] || "Apex"} Test Services`,
        phone: "(602) 555-0100",
        websiteUrl: "https://example.com",
        address: "100 Test Ave",
        city: input.location.split(",")[0]?.trim() || "Phoenix",
        state: "AZ",
        postalCode: "85001",
        country: "United States",
        rating: 4.1,
        reviewCount: 42,
        businessStatus: "OPERATIONAL",
        sourceRecordId: `fixture-${normalizeBusinessName(input.query)}`
      }
    ].slice(0, input.limit);
  }
}

export function getLeadSourceProvider(key: string, options?: { fixture?: boolean }) {
  if (options?.fixture) return new FixtureLeadSourceProvider();
  if (key === "google_places") return new GooglePlacesLeadSourceProvider();
  throw new Error("UNKNOWN_LEAD_PROVIDER");
}

export function normalizeProviderResult(result: ProviderLeadResult) {
  return {
    ...result,
    normalizedBusinessName: normalizeBusinessName(result.businessName),
    normalizedPhone: normalizePhone(result.phone),
    normalizedDomain: normalizeDomain(result.websiteUrl)
  };
}

function parseAddress(address?: string) {
  if (!address) return {};
  const parts = address.split(",").map((part) => part.trim());
  const city = parts.at(-3);
  const stateZip = parts.at(-2)?.split(/\s+/) ?? [];
  return {
    city,
    state: stateZip[0],
    postalCode: stateZip[1],
    country: parts.at(-1)
  };
}
