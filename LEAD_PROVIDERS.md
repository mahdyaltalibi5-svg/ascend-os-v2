# Lead Providers

## Provider Abstraction

Lead providers implement `LeadSourceProvider` in `lib/sales/providers.ts`.

Current providers:

- `GooglePlacesLeadSourceProvider`
- `FixtureLeadSourceProvider` for deterministic tests

## Google Places

Set this environment variable in Vercel or local `.env`:

```bash
GOOGLE_PLACES_API_KEY=""
```

The key is only read on the server and is never sent to browser bundles.

Milestone 3 uses Google Places as the primary live discovery source for `/app/scraper`.
When the key is absent, production does not fabricate results and the scraper UI shows discovery
as unavailable.

Scraper searches are bounded to selected Utah cities, approved trades (`HVAC` and `Plumbing`),
and a small per-search result cap. Electricians and other trades are rejected by the verification
engine even if a provider returns them.

## Website Verification

Official website analysis uses `fetchWithSafety`:

- HTTP(S) only.
- No URL credentials.
- No localhost, private network, link-local, `.local`, or `.internal` hosts.
- DNS resolution is checked before fetch.
- Redirects are followed manually and each target is revalidated.
- HTML content type, timeout, redirect count, and response size are bounded.

Phone numbers become call-ready only when the normalized provider phone is found on the official
company website or is supported by the official Google Business Profile. Website/Google mismatch
records remain in human review.

Owner evidence is conservative. The scraper can store owner/founder names or owner-operated
signals from official website text, but it does not label a phone as `direct_owner`.

## Usage Safeguards

- Campaign and scraper target counts are capped by validation.
- Jobs process bounded batches and store progress.
- Provider errors are stored on `BackgroundJob.errorMessage`.
- Production never fabricates provider results when a key is missing.
- Normal tests use fixtures or manual records and do not spend Google API usage.
- Domain fetches are recorded in `ScraperDomainRateLimit`.

## Future Providers

Additional providers should normalize results into `ProviderLeadResult`, keep provider secrets server-only, and preserve organization scoping before writing records.
