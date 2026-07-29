# Ascend OS Milestone 1 Plan

## Milestone 3 Lead Engine, CRM, and Sales Pipeline

### Current repository state inspected

- Branch is `main`, tracking `origin/main`, and the working tree was clean before Milestone 3 edits.
- Production is live at `https://ascend-os-v2-app.vercel.app`.
- Latest verified production commit is `c5d7ac4 Build revenue command center`.
- Existing production capabilities include authentication, organization-aware tenancy, Founder/Salesperson roles, Personal OS, Revenue Command Center, audit logging, PWA support, Prisma/PostgreSQL, GitHub, and Vercel deployment.
- The Prisma schema currently contains foundation, Personal OS, and Revenue models only.
- Sales navigation exists but still points to a foundation placeholder at `/app/module/sales`.
- Existing `leads.*`, `calls.*`, and `pipeline.*` permissions are broad Milestone 1 placeholders and need granular sales operations permissions.
- Database-backed tests currently skip when `TEST_DATABASE_URL` is missing, and local Docker Compose only defines the development database.

### Conflicts with the Milestone 3 prompt

- There are no lead campaign, lead business, contact, analysis, prospect, outreach, follow-up, appointment, opportunity, pipeline, sales goal, suppression, import, or background-job models.
- No Google Places provider abstraction or safe disabled production state exists.
- No bounded website-analysis service, SSRF protection, deterministic scoring, deduplication, sales metrics, sales queue, follow-up policy, or revenue handoff exists.
- No real Founder Sales dashboard or Salesperson workspace exists.
- CSV import/export for sales records does not exist.
- CI does not yet run integration tests with an isolated `TEST_DATABASE_URL`.

### Assumptions

- Production must stay functional when `GOOGLE_PLACES_API_KEY` is absent; provider campaigns should show a clear disabled/failure state instead of producing fake leads.
- Manual lead entry and CSV import are first-class paths because they do not depend on external provider credentials.
- Milestone 3 should remain additive: no production reset, no destructive migrations, and no changes that weaken existing Personal OS or Revenue flows.
- Background jobs will be implemented with a secure Vercel-compatible worker endpoint and bounded batch processor; a future Mac mini worker will use a documented scoped API rather than direct public database access.
- The first website analyzer will be deterministic, bounded, and no-JavaScript; optional AI summaries remain deferred unless a key is explicitly configured later.
- Sales money values will use integer cents, matching the Revenue Command Center.

### Implementation sequence

1. [x] Add additive Prisma models, indexes, migration, seed data, default pipeline stages, sales goals, and granular permissions.
2. [x] Add normalization, deduplication, CSV safety, URL/SSRF safety, website analysis, lead scoring, queue ranking, attempt policy, follow-up automation, pipeline metrics, notifications, and deterministic command parsing.
3. [x] Add server-side sales read service, actions, CSV import/export, background-job processor, worker endpoint, and revenue handoff transaction.
4. [x] Build `/app/sales`, `/app/sales/queue`, `/app/sales/follow-ups`, `/app/sales/appointments`, `/app/sales/pipeline`, `/app/sales/performance`, and mobile-friendly working surfaces.
5. [x] Integrate sales recommendations and one-click Personal OS sales priorities.
6. [x] Add unit, integration, and Playwright tests with deterministic/manual provider-safe flows.
7. [x] Update README, architecture, data model, permissions, security, revenue docs, roadmap, agent notes, and add `SALES_SYSTEM.md`, `LEAD_PROVIDERS.md`, and `WORKERS.md`.
8. [x] Update Docker Compose and CI so integration and Playwright tests run against an isolated non-production PostgreSQL database.
9. [ ] Run local validation commands, apply non-production migrations where possible, deploy/migrate production if credentials are available, smoke test, commit, and push.

### Milestone 3 verification results

- `pnpm install --config.confirm-modules-purge=false`: passed, with a registry metadata warning caused by restricted network.
- `pnpm exec prisma generate`: passed.
- `pnpm exec prisma validate`: passed.
- `pnpm run format`: passed.
- `pnpm run format:check`: passed.
- `pnpm run lint`: passed.
- `pnpm run typecheck`: passed.
- `pnpm run test`: passed; local database-backed revenue and sales integration tests skipped because no `TEST_DATABASE_URL` database is running.
- `pnpm run test:integration`: passed structurally; core DB integration tests skipped for the same missing local test database.
- `pnpm run build`: passed.
- `pnpm run test:e2e`: failed locally because PostgreSQL is not connected; the signup pages showed the expected database-unavailable message.
- Docker is not installed in this workspace, so local PostgreSQL/test PostgreSQL containers could not be started here.
- `gh` and `vercel` CLIs are not installed in this workspace.

## Milestone 2 Revenue Command Center

### Current repository state inspected

- Branch is `main` and the working tree was clean before this pass.
- Production is currently served from the existing Vercel project at `https://ascend-os-v2-app.vercel.app`.
- Personal OS models are already organization- and user-scoped: `PersonalPriority`, `OperatingNote`, `FocusBlock`, `DailyPlan`, `Goal`, and `InAppNotification`.
- The current `Goal` model is a general Personal OS/operating goal model and should not be overloaded with financial ledger behavior.
- Navigation still points Revenue to `/app/module/revenue`, which is an honest empty extension point from Milestone 1.
- Existing permissions include `revenue.view`, `clients.view`, and broad goals permissions, but Milestone 2 requires finer financial permissions.

### Conflicts with the Milestone 2 prompt

- There are no revenue ledger models yet: clients, service offerings, contracts, invoices, payments, recurring schedules, forecasts, and adjustments are missing.
- No manual revenue workflows exist.
- Revenue calculations, forecasts, recommendations, CSV export, and revenue notifications do not exist.
- The Founder command center does not yet summarize real revenue status.
- Salesperson permission restrictions need to explicitly deny broad financial access.

### Assumptions

- A dedicated `RevenueGoal` model is cleaner than reusing `Goal` because financial goals need period uniqueness, immutable reporting behavior, goal type semantics, and audit-friendly money handling.
- Stored money will use integer minor units (`amountCents`) to avoid floating-point financial errors.
- Manual workflows ship first; Stripe remains an honest future integration with provider/external-id fields ready.
- CSV import is deferred for this pass if it would destabilize the core revenue workflows; CSV export is in scope.
- Revenue recommendations remain deterministic and are labeled honestly as Ascend revenue recommendations.

### Implementation sequence

1. [x] Add additive Prisma models, indexes, and migration for the revenue ledger.
2. [x] Expand permissions and seed/default organization setup for service offerings.
3. [x] Add revenue validation, money/date utilities, calculations, forecasting, recommendations, notifications, CSV export, and deterministic command parsing.
4. [x] Add server-side revenue actions with active-organization, membership, permission, and ownership checks.
5. [x] Build `/app/revenue` with goal setup, scorecards, forecast, timeline, composition, attention queue, activity feed, CSV export, and manual forms.
6. [x] Add compact Founder dashboard revenue summary and one-click Personal OS priority creation from revenue recommendations.
7. [x] Add unit and integration tests, plus a Playwright revenue workflow test that uses non-production database configuration.
8. [x] Update documentation including `REVENUE_SYSTEM.md`.
9. [x] Run validation, deploy production migration, deploy to Vercel, smoke test production, commit, and push.

### Decisions made during implementation

- Revenue goals use a dedicated `RevenueGoal` model rather than the generic Personal OS `Goal` model.
- Financial amounts are stored as integer cents instead of decimal or floating-point values.
- Manual revenue tracking is complete before Stripe; provider fields and sync metadata prepare future integration boundaries.
- CSV export shipped; CSV import is deferred to avoid destabilizing the core revenue workflow.
- Revenue notifications follow the current Personal OS pattern of deterministic generated notifications plus persisted action/audit history.

### Verification results

- `pnpm install --config.confirm-modules-purge=false`: passed after network access was allowed.
- `pnpm exec prisma generate`: passed.
- `pnpm run format:check`: passed.
- `pnpm run lint`: passed.
- `pnpm run typecheck`: passed.
- `pnpm run test`: passed; revenue DB integration skipped because `TEST_DATABASE_URL` is not configured locally.
- `pnpm run build`: passed.
- `pnpm run test:e2e`: failed locally because the local app database at `localhost:5432` is not connected; production browser smoke covered the deployed revenue workflow.
- Production migration `20260728033000_revenue_command_center`: applied successfully with `prisma migrate deploy`.
- Vercel production deployment succeeded and `https://ascend-os-v2-app.vercel.app` was aliased to the latest deployment.
- Production smoke passed for sign-in, Revenue open, goal, client, contract, invoice, partial payment, final payment, recurring revenue, forecast snapshot, priority creation, refresh persistence, mobile render, sign-out/sign-in persistence, health, and clean recent logs.

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

## Personal OS completion pass

### Current repository state inspected

- Re-read the future-agent instructions, product documentation, architecture notes, Prisma schema, protected dashboard, app shell, and current tests before editing.
- The repository already had a secure Milestone 1 foundation, production Vercel wiring, a public GitHub repository, and a connected production Prisma Postgres database.
- The app still felt too much like a foundation shell for the owner's current need: it had honest empty states, but not enough real day-to-day operating utility.

### Conflicts with the latest product direction

- White-label language was too prominent for the current phase. The product should stay focused on the internal Personal OS for Ascend Web Development.
- The dashboard needed real saved personal operating state instead of only future-module empty states.
- The visual system leaned too much on familiar dark glass patterns and needed a more restrained, denser command-surface treatment.

### Assumptions

- Personal OS data should remain scoped to both the active organization and the signed-in user.
- Founder and Salesperson users can both use personal priorities, notes, and focus blocks, while founder-only financial/admin navigation remains permission-gated.
- White-label architecture can remain possible through tenant boundaries, but white-label product positioning is deferred.

### Implementation sequence

1. [x] Add Prisma models and migration for personal priorities, operating notes, and focus blocks.
2. [x] Add validation schemas for personal OS mutations.
3. [x] Add server actions that resolve the active organization server-side, enforce user/org ownership, and write audit events.
4. [x] Render a real Personal Command Center on Founder and Salesperson dashboards.
5. [x] Improve dashboard copy and shell labels around Personal OS instead of foundation-only language.
6. [x] Update product, architecture, and data-model documentation.
7. [x] Add focused automated tests for the new validation surface.
8. [x] Run validation, migrate production, deploy, and smoke test.

### Verification results

- Prisma Client generation passed.
- Formatting passed.
- Lint passed.
- Typecheck passed.
- Unit tests passed: 5 files, 14 tests.
- Production build passed.
- Production database migration passed.
- Vercel production deployment passed and was aliased to `https://ascend-os-v2-app.vercel.app`.
- Production smoke passed: throwaway account creation, organization onboarding, Founder dashboard load, priority write, focus-block write, operating-note write, and signout.
- Local Playwright failed because local PostgreSQL at `localhost:5432` is not running in this workspace. The failure showed the expected database-unavailable message rather than a code exception.
- GitHub shell push failed because this environment has no GitHub HTTPS credential or SSH key.

## Final Personal OS and Founder Cockpit

### Current repository and production state inspected

- Branch: `main`.
- Local `HEAD`: `d91cd35 Add personal command center`.
- Remote `origin/main`: `d48e5ff Ignore local env and pnpm cache files`.
- Local repository is ahead of GitHub by one commit because shell GitHub HTTPS and SSH authentication were unavailable in the previous pass.
- Production URL `https://ascend-os-v2-app.vercel.app` is live.
- Production `/api/health` returned healthy database connectivity before this implementation pass.
- Current Personal OS production migration is `20260728012000_personal_os`.
- Existing Personal OS models are `PersonalPriority`, `OperatingNote`, and `FocusBlock`.

### Conflicts with the final Personal OS specification

- Priority management is create/complete/archive only; it lacks edit, reopen, due date/time, categories, duration, revenue impact, pinning, manual ordering, today/week/later placement, and soft-delete metadata.
- There is no `DailyPlan`, daily review, goals system, notification model, command parser, or recommendation engine.
- Focus blocks do not have real timer state transitions or one-active-block enforcement.
- Notes cannot be edited, archived, searched, categorized, tagged, or converted into priorities.
- `/app` still contains deferred module shells rather than a complete Founder Daily Execution Cockpit.
- Local E2E cannot pass until a non-production PostgreSQL database is available.
- GitHub remains behind unless a secure GitHub credential/connector path succeeds.

### Assumptions

- This pass may safely make additive database changes and nullable backfills to preserve existing production data.
- Deterministic recommendation logic should ship now; no external AI API should be required.
- Accessible reorder controls are acceptable for this milestone; drag-and-drop can remain a later enhancement.
- Soft archive is preferred for operational records; hard delete is allowed only where explicitly implemented as a user-confirmed action and still scoped server-side.
- The Founder cockpit is the primary experience; Salesperson access should remain permission-shaped and not expose founder-only financial/admin surfaces.

### Implementation sequence

1. [x] Add additive Prisma schema/migration for expanded priorities, daily plans, reviews, goals, notifications, focus states, and note metadata.
2. [x] Add validation, formatting, deterministic recommendation, command parsing, notification generation, and focus state helpers with unit tests.
3. [x] Replace Personal OS server actions with scoped CRUD/state-transition actions and audit events.
4. [x] Redesign `/app` as the Founder Daily Execution Cockpit with mobile-friendly sections and forms.
5. [x] Add daily planning, daily review, goals, note conversion, command input, notifications, and accessible priority reorder flows.
6. [x] Update documentation and Founder daily-use guide.
7. [x] Run validation commands and database-backed checks where available.
8. [x] Apply production migration, deploy to existing Vercel project, verify health/auth/persistence/mobile smoke.
9. [x] Commit in logical groups and attempt GitHub sync through secure available methods; otherwise report exact push commands.

### Final verification results

- `pnpm install --config.confirm-modules-purge=false`: passed when pnpm required a non-interactive refresh.
- `pnpm exec prisma generate`: passed.
- `pnpm run format`: passed.
- `pnpm run format:check`: passed.
- `pnpm run lint`: passed.
- `pnpm run typecheck`: passed.
- `pnpm run test`: passed, 7 files, 21 passed, 1 skipped integration guard.
- `pnpm run test:e2e`: failed locally because PostgreSQL at `localhost:5432` is not connected; the app showed the expected database-unavailable message.
- `pnpm run build`: passed.
- `pnpm run start`: attempted; the local production server exited after the dev-server E2E run removed the production build artifact. A production-like build was verified by local `pnpm run build` and Vercel production build.
- Production migration `20260728021000_final_personal_os`: applied successfully with `prisma migrate deploy`.
- Production deploy: succeeded on the existing Vercel project.
- Clean production URL: `https://ascend-os-v2-app.vercel.app`.
- Production health: passed with database connected.
- Production browser smoke: passed with a throwaway Founder account, including signup, onboarding, daily plan, three priorities, priority edit submission, completing a separate priority, focus create/start/complete, monthly goal creation, note creation, note-to-priority conversion, end-day review, refresh persistence, signout/signin persistence, and mobile render.
- Browser console during final smoke: no warnings or errors captured.
