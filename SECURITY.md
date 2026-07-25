# Security

## Threat Assumptions

Users may belong to multiple organizations. A user may attempt to access another tenant's data by changing route params, cookies, or request bodies.

## Authentication

Passwords are hashed with bcrypt. Auth errors are generic. Auth endpoints use validation and in-memory local rate limiting. Production should move rate limiting to Redis or an edge-compatible store.

## Tenant Isolation

The active organization cookie is not trusted by itself. The server validates the selected organization against active memberships. Organization-owned records must include `organizationId`.

## Secrets

Use `.env` locally and managed secrets in production. Never expose `DATABASE_URL`, `NEXTAUTH_SECRET`, raw tokens, banking credentials, Stripe credentials, or AI provider keys to the client.

## Audit Logs

Audit events store safe metadata only. Passwords, raw tokens, payment details, and secrets must never be placed in audit metadata.

## PWA Caching

The service worker avoids caching `/api/*` and `/app/*` authenticated tenant data. Review this before adding offline features.

## Current Limitations

- Email verification and password reset require a production email provider.
- Rate limiting is process-local for Milestone 1.
- CSP allows inline script/style needed by the current Next.js setup and should be tightened after deployment testing.
- Playwright depends on a running local database and seeded data.

## Production-Hardening Checklist

- Configure managed PostgreSQL backups.
- Set a strong `NEXTAUTH_SECRET`.
- Enforce HTTPS.
- Add production email delivery.
- Move rate limiting to Redis or managed infrastructure.
- Review CSP in the deployed environment.
- Disable development seed users.
- Add observability and error reporting.
