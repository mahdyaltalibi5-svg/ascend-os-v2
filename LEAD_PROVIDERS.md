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

## Usage Safeguards

- Campaign target count is capped by validation.
- Jobs process bounded batches.
- Provider errors are stored on `BackgroundJob.errorMessage`.
- Production never fabricates provider results when a key is missing.
- Normal tests use fixtures or manual records and do not spend Google API usage.

## Future Providers

Additional providers should normalize results into `ProviderLeadResult`, keep provider secrets server-only, and preserve organization scoping before writing records.
