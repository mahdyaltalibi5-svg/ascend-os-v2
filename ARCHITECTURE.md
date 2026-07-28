# Architecture

## Revenue Command Center

Revenue lives behind `/app/revenue` and is served from a dedicated read service in `lib/server/revenue.ts`. Components render derived totals from that service instead of recalculating financial metrics independently.

Financial writes are implemented as server actions in `app/(app)/app/revenue/actions.ts`. Each action resolves the signed-in user and active organization server-side, checks granular permissions, validates linked records by organization, writes audit events, and revalidates `/app` plus `/app/revenue`.

Stored money uses integer cents in Prisma models. Forecasting, pace, MRR, outstanding, overdue, and refund calculations live in `lib/revenue/*`. Stripe is intentionally not connected; provider/external ID/sync fields prepare the boundary for a future integration service.

## Frontend

The app uses the Next.js App Router. Auth pages live under `app/(auth)`, protected application routes under `app/(app)/app`, reusable controls under `components/ui`, and shell components under `components/app`.

The design system is token-based in `app/globals.css`, using CSS variables for background, surface, border, accent, status colors, radius, shadows, and typography.

The first app screen is the Founder Daily Execution Cockpit. `components/app/personal-command-center.tsx` renders database-backed daily plans, priorities, focus blocks, goals, operating notes, notifications, recommendations, and audit activity rather than fake dashboard metrics.

## Backend Boundaries

Server-only logic lives in `lib/server`. API routes and server actions perform validation, authentication, authorization, and audited mutations. UI routes fetch server-verified organization context before rendering protected views.

## Authentication Flow

NextAuth uses a credentials provider. Registration is handled by `/api/auth/register`, which validates input, hashes passwords with bcrypt, writes the user, and records an audit event. Sign-in returns generic errors and writes a sign-in audit event.

Email verification and password reset are modeled as documented stubs until email delivery is configured.

## Multi-Tenant Model

Business-owned data is scoped through `organizationId`. Active organization selection is stored in a cookie but always validated against the signed-in user's active memberships before use.

Personal OS records are scoped to both `organizationId` and `userId`. The client never supplies the active organization for these mutations; server actions resolve it from the signed-in session and validated membership context.

Daily plans use a `dateKey` generated for the active organization's timezone and are unique per organization, user, and date. Focus blocks store real timestamps and future calendar IDs without connecting any external calendar yet.

## Authorization Model

Roles are organization-scoped and map to granular permissions through `RolePermission`. Users receive roles through `MembershipRole`. UI navigation is permission-aware, and server routes use authorization helpers before returning or mutating tenant data.

## Database

Prisma models users, organizations, memberships, roles, permissions, invitations, audit events, notification preferences, branding, auth-compatible session entities, priorities, operating notes, focus blocks, daily plans/reviews, goals, and in-app notifications.

## Audit Logging

`writeAuditEvent` records major account, organization, and Personal OS actions with safe metadata, actor, organization, entity type, entity id, timestamp, user agent, and hashed request IP where available.

## Recommendation Engine

The current recommendation engine is deterministic. It scores open priorities using criticality, due/overdue status, pinned state, revenue impact, goal alignment, estimated duration, timeframe, and carryover count. It returns the top three outcomes, highest-value next action, focus suggestions, deferrals, archive candidates, and plain-language reasoning. It is intentionally labeled as an "Ascend recommendation," not external AI output.

## Command Architecture

The command input uses deterministic parsing in `lib/personal-os/commands.ts`. It supports adding priorities, scheduling focus, saving notes, creating simple goals, carrying work forward, completing exact priority matches, starting the next focus block, and asking what to work on next. Ambiguous destructive commands are ignored rather than guessed.

## Focus State Machine

Focus blocks support `PLANNED`, `ACTIVE`, `PAUSED`, `DONE`, `SKIPPED`, and `CANCELLED`. Starting a focus block uses a database transaction that refuses to start a second active block for the same user and organization.

## PWA Strategy

The manifest and icons support installation. The service worker caches only static install assets and `/offline`; it does not cache authenticated API responses or tenant application data.

## Future Services

- Python/FastAPI worker service for agentic and data-heavy tasks.
- Redis/background jobs for queues, rate limits, scheduled work, and email delivery.
- Mac mini worker for approved local automations.
- Third-party integrations for Stripe, Twilio, Google, ad platforms, and CRM data after explicit connection flows exist.
