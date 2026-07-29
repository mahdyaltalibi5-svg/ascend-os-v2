# Security

## Revenue Data

Revenue records are sensitive organization-owned data. Server reads and mutations must never trust an organization ID supplied by the browser. The active organization is resolved from the signed-in session and validated membership before accessing clients, services, contracts, invoices, payments, recurring schedules, goals, forecasts, or adjustments.

Financial mutations validate amount, currency, date, status, and linked-record ownership. Payment recording uses a transaction when updating invoice totals and rejects accidental overpayment without an explicit adjustment workflow. Refunds and write-offs should be represented through `RevenueAdjustment` records instead of silent historical rewrites.

Salesperson does not receive broad revenue permissions by default and should not see cash totals, MRR, invoice totals, forecasts, refunds, or revenue goals.

## Threat Assumptions

Users may belong to multiple organizations. A user may attempt to access another tenant's data by changing route params, cookies, or request bodies.

## Authentication

Passwords are hashed with bcrypt. Auth errors are generic. Auth endpoints use validation and in-memory local rate limiting. Production should move rate limiting to Redis or an edge-compatible store.

## Tenant Isolation

The active organization cookie is not trusted by itself. The server validates the selected organization against active memberships. Organization-owned records must include `organizationId`.

Personal OS writes also include `userId` and are resolved from the signed-in session. The browser does not get to choose the active organization for priorities, goals, notes, focus blocks, daily plans, reviews, commands, or notifications.

## Secrets

Use `.env` locally and managed secrets in production. Never expose `DATABASE_URL`, `NEXTAUTH_SECRET`, raw tokens, banking credentials, Stripe credentials, or AI provider keys to the client.

## Audit Logs

Audit events store safe metadata only. Passwords, raw tokens, payment details, and secrets must never be placed in audit metadata.

Personal OS audit events cover priority create/edit/complete/reopen/archive/delete, focus create/start/pause/complete/cancel/duplicate, daily plan start, daily review completion, goal create/update/complete, note create/edit/archive/convert, and command execution. Metadata is limited to safe operational labels such as category, status, and counts.

## Destructive Actions

Operational records prefer archive or soft-delete timestamps over hard deletion. Server actions verify ownership and organization membership before mutating any record. Ambiguous command actions are ignored instead of guessed.

## PWA Caching

The service worker avoids caching `/api/*` and `/app/*` authenticated tenant data. Review this before adding offline features.

## Lead Research Security

Website analysis validates HTTP(S) URLs, blocks private networks and localhost, checks DNS resolution, enforces strict timeouts, limits response size, validates HTML content type, and does not execute arbitrary JavaScript. Provider keys and worker secrets are server-only. CSV exports escape formula-leading cells. Suppression records are checked before outreach attempts.

## Current Limitations

- Email verification and password reset require a production email provider.
- Rate limiting is process-local for Milestone 1.
- CSP allows inline script/style needed by the current Next.js setup and should be tightened after deployment testing.
- Playwright depends on a running local database and seeded data.
- Database-backed integration tests require `TEST_DATABASE_URL` and must not target production.
- Deterministic recommendations are not external AI output.
- Google Places lead generation is disabled honestly when `GOOGLE_PLACES_API_KEY` is absent.

## Production-Hardening Checklist

- Configure managed PostgreSQL backups.
- Set a strong `NEXTAUTH_SECRET`.
- Enforce HTTPS.
- Add production email delivery.
- Move rate limiting to Redis or managed infrastructure.
- Review CSP in the deployed environment.
- Disable development seed users.
- Add observability and error reporting.
- Add row-level database policies if the deployment later introduces direct database access outside trusted server code.
