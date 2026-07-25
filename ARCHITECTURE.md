# Architecture

## Frontend

The app uses the Next.js App Router. Auth pages live under `app/(auth)`, protected application routes under `app/(app)/app`, reusable controls under `components/ui`, and shell components under `components/app`.

The design system is token-based in `app/globals.css`, using CSS variables for background, surface, border, accent, status colors, radius, shadows, and typography.

## Backend Boundaries

Server-only logic lives in `lib/server`. API routes perform validation, authentication, authorization, and audited mutations. UI routes fetch server-verified organization context before rendering protected views.

## Authentication Flow

NextAuth uses a credentials provider. Registration is handled by `/api/auth/register`, which validates input, hashes passwords with bcrypt, writes the user, and records an audit event. Sign-in returns generic errors and writes a sign-in audit event.

Email verification and password reset are modeled as documented stubs until email delivery is configured.

## Multi-Tenant Model

Business-owned data is scoped through `organizationId`. Active organization selection is stored in a cookie but always validated against the signed-in user's active memberships before use.

## Authorization Model

Roles are organization-scoped and map to granular permissions through `RolePermission`. Users receive roles through `MembershipRole`. UI navigation is permission-aware, and server routes use authorization helpers before returning or mutating tenant data.

## Database

Prisma models users, organizations, memberships, roles, permissions, invitations, audit events, notification preferences, branding, and auth-compatible session entities.

## Audit Logging

`writeAuditEvent` records major account and organization actions with safe metadata, actor, organization, entity type, entity id, timestamp, user agent, and hashed request IP where available.

## PWA Strategy

The manifest and icons support installation. The service worker caches only static install assets and `/offline`; it does not cache authenticated API responses or tenant application data.

## Future Services

- Python/FastAPI worker service for agentic and data-heavy tasks.
- Redis/background jobs for queues, rate limits, scheduled work, and email delivery.
- Mac mini worker for approved local automations.
- Third-party integrations for Stripe, Twilio, Google, ad platforms, and CRM data after explicit connection flows exist.
