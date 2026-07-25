# Ascend OS Milestone 1 Plan

## Milestone 1.1 runtime repair diagnosis

### Current repository state inspected

- Read `README.md`, `PLANS.md`, `ARCHITECTURE.md`, `SECURITY.md`, `prisma/schema.prisma`, `package.json`, auth configuration, signup/onboarding routes, dashboard layouts, and route structure.
- No `middleware.ts` or `proxy.ts` exists. Redirect behavior is currently implemented in pages/layouts.
- The repository uses `pnpm-lock.yaml`, but `README.md` still documents `npm` commands.
- `/` currently redirects to `/app`, then unauthenticated users are redirected to `/signin`; there is no real landing page.
- There is no `setup` command, `/api/health`, development diagnostics page, root error boundary, not-found page, or database-unavailable UI.
- Signup renders and submits, but the registration API throws an unhandled Prisma initialization error when PostgreSQL is unavailable.

### Pre-repair validation results

- Dependency installation: `pnpm install --config.confirm-modules-purge=false` succeeded.
- Formatting check: passed.
- Lint: passed.
- Typecheck: failed because stale duplicate generated files existed under `.next/types`.
- Unit tests: passed, 5 files and 11 tests.
- Production build: passed.
- Dev server: failed in the sandbox without port approval (`listen EPERM 0.0.0.0:3000`), then started successfully with approval.
- Browser open: `http://localhost:3000` redirected to `/signin` instead of rendering a landing page.
- Signup browser test: page rendered, form submitted, then `/api/auth/register` returned 500 because Prisma could not reach PostgreSQL at `localhost:5432`.

### First runtime blocker

The first application-level runtime blocker is database connectivity: the app depends on PostgreSQL at `DATABASE_URL`, but there is no running database, no health check, no setup command, and no helpful database-unavailable state. The owner sees a generic signup failure instead of actionable setup guidance.

### Milestone 1.1 repair plan

1. [x] Standardize the repository on `pnpm`, add `packageManager`, fix scripts, and update documentation.
2. [x] Add setup and database reset scripts that validate `.env`, check database connectivity, generate Prisma Client, run migrations, seed data, and print exact next steps.
3. [x] Add safe environment validation and database connectivity helpers.
4. [x] Add `/api/health` and development-only `/dev/diagnostics`.
5. [x] Replace the `/` redirect with a real landing page.
6. [x] Add root error, not-found, loading, and database-unavailable surfaces.
7. [x] Improve signup, signin, and onboarding API/form errors so database failures are visible and actionable.
8. [x] Improve seed idempotency and production refusal behavior.
9. [x] Repair Playwright startup so it uses `pnpm`.
10. [x] Capture available screenshots under `artifacts/screenshots/`.

### Milestone 1.1 verification after repairs

- Dependency installation: `pnpm install --config.confirm-modules-purge=false` succeeded.
- Formatting: `pnpm run format:check` passed.
- Lint: `pnpm run lint` passed.
- Typecheck: `pnpm run typecheck` passed.
- Unit tests: `pnpm run test` passed, 5 files and 11 tests.
- Production build: `pnpm run build` passed.
- Development server: `pnpm run dev` started successfully with port-binding approval.
- Production server: `pnpm run start` started successfully with port-binding approval.
- Browser verification passed for the landing page, signup page render, improved signup database-unavailable state, diagnostics page, mobile landing page, and production landing page.
- `/api/health` returned HTTP 503 with clear database-unavailable JSON because PostgreSQL is not connected.
- `pnpm run setup` now generates a development `NEXTAUTH_SECRET` when needed, then fails clearly because no PostgreSQL server or hosted `DATABASE_URL` is available in this workspace.
- `pnpm run test:e2e` starts with `pnpm` but fails at the signup happy path because there is still no connected PostgreSQL database.

### Milestone 1.1 remaining blockers

- This workspace has no Docker, `psql`, `postgres`, `initdb`, `gh` CLI, Git repository, Vercel connector, Vercel token, or hosted PostgreSQL `DATABASE_URL`.
- Founder/Salesperson seeded login, onboarding completion, role-specific authenticated navigation, session refresh, and Playwright success still require a real PostgreSQL database.
- GitHub/Vercel deployment still requires a target GitHub repo and Vercel project/account access.

## Existing repository summary

- The workspace starts as a fresh project directory with only `work/` and `outputs/`.
- No application source, package manifest, Git metadata, database schema, tests, or CI configuration currently exists.
- There are no existing implementation conflicts with the milestone specification.

## Assumptions

- This is a new Next.js application and should be created at the workspace root.
- Local development will use PostgreSQL through Docker Compose.
- Authentication will use Auth.js/NextAuth with a credentials provider for email and password sign-in.
- Password reset and email verification will be implemented as safe development-mode architecture stubs because no email provider credentials are configured for this milestone.
- Google sign-in will be left as a documented future optional provider and will not block local development.
- Business modules beyond the foundation will be represented only by permission-aware navigation and honest empty states.
- The Ascend Web Development organization and development users will be created only by the seed script, not hard-coded into production flows.

## Implementation sequence

1. Create the Next.js App Router foundation with TypeScript strict mode, Tailwind, ESLint, Prettier, and shared UI primitives.
2. Add Prisma schema, migration, seed data, Docker Compose, and environment templates.
3. Implement authentication, account creation, sign-in, sign-out, password hashing, generic auth errors, and auth rate limiting.
4. Implement organization onboarding, active organization validation, server authorization helpers, granular permissions, and audit logging.
5. Build the responsive application shell, permission-aware navigation, founder dashboard shell, salesperson dashboard shell, settings, audit log, and module empty states.
6. Add PWA manifest, icons, offline page, and a conservative service worker that avoids caching authenticated data.
7. Add unit/integration tests and Playwright happy-path tests for auth, onboarding, permissions, tenant isolation, audit logging, navigation, and manifest availability.
8. Add repository documentation and GitHub Actions validation.
9. Run formatting, lint, typecheck, tests, migrations/seeding where locally supportable, Playwright where supportable, and production build.

## Acceptance criteria

- [ ] The application opens locally.
- [ ] A user can create an account.
- [ ] A user can create an organization.
- [ ] The organization creator becomes Founder.
- [ ] Founder reaches the Founder dashboard shell.
- [ ] Salesperson reaches the Salesperson dashboard shell.
- [x] Navigation is filtered by server-verified permissions.
- [x] Protected routes redirect unauthenticated users.
- [x] Cross-organization access is rejected server-side.
- [x] Active organization is validated against memberships.
- [x] Important account and organization mutations write audit events.
- [x] PWA manifest, icons, offline fallback, and service worker are present.
- [x] Documentation covers setup, architecture, security, permissions, roadmap, data model, and future-agent guidance.
- [x] Formatting passes.
- [x] Lint passes.
- [x] Type checking passes.
- [x] Unit/integration tests pass.
- [x] Production build passes.
- [ ] Playwright happy path passes or any local blocker is documented.

## Completed items

- [x] Inspected repository.
- [x] Confirmed this is a fresh workspace with no existing application conflicts.
- [x] Recorded assumptions and implementation sequence.
- [x] Added Next.js, TypeScript, Tailwind, ESLint, Prettier, Vitest, Playwright, Docker Compose, and CI configuration.
- [x] Added Prisma schema, initial migration, and local development seed script.
- [x] Added Auth.js/NextAuth credentials authentication, registration, sign-in, sign-out audit route, and rate limiting.
- [x] Added organization onboarding, active organization validation, granular permissions, roles, invitations, and audit logging services.
- [x] Added responsive application shell, permission-aware navigation, Founder and Salesperson dashboard shells, module empty states, settings, and audit screen.
- [x] Added PWA manifest, icons, service worker, and offline fallback.
- [x] Added repository documentation.
- [x] Added unit/integration and Playwright test foundations.

## Remaining items

- Run and report validation commands.

## Risks

- Dependency installation may require network access and may need user approval if the sandbox blocks package downloads.
- Docker is not available in the current environment, which blocks live migration, seed verification, and database-backed manual flow validation here.
- Playwright browser binaries are available, but the happy path cannot pass here without PostgreSQL.

## Decisions made during implementation

- The app will use granular permission keys rather than hard-coded role checks throughout the UI and server logic.
- The active organization will be stored as a cookie but always verified server-side before use.
- The PWA service worker will cache only static shell assets and the offline fallback, not authenticated API responses or tenant data.
- The implementation validates successfully for formatting, lint, typecheck, unit tests, and production build in this environment.
- Docker/PostgreSQL-dependent migration, seed, and Playwright happy-path execution remain to be verified on a machine with Docker available.
