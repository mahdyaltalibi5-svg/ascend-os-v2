# Ascend OS

Ascend OS is the Founder Personal OS for Ascend Web Development. It combines secure account access, organization scoping, daily planning, priorities, focus blocks, operating notes, goals, recommendations, notifications, audit-backed activity, and a manual Revenue Command Center in one production app.

## Stack

- Next.js App Router, React, TypeScript strict mode
- PostgreSQL and Prisma ORM
- Auth.js/NextAuth credentials provider
- Tailwind CSS with token-based Ascend design variables
- Zod and React Hook Form
- Vitest and Playwright
- pnpm via Corepack
- GitHub Actions validation
- Vercel-ready deployment config

## Revenue Command Center

Milestone 2 adds `/app/revenue`, a Founder-only manual revenue operating center. It supports revenue goals, clients, service offerings, contracts, invoices, payments, recurring revenue, forecast snapshots, adjustments, CSV export, deterministic recommendations, and Personal OS priority creation from revenue issues.

Manual revenue tracking is active. Stripe is not connected. See `REVENUE_SYSTEM.md` for financial rules, forecast assumptions, and future integration boundaries.

## Sales Operating System

Milestone 1 adds `/app/sales`, the CRM foundation for Mahdy and Logan to work Utah HVAC and plumbing businesses. It supports authentication, dashboard metrics, lead table search/filter/sort, lead detail pages, manual lead creation and editing, CSV import/export, assignment, call history, notes, follow-up tasks, appointments, opportunities, and the requested pipeline board.

Lead integrity is enforced server-side. Duplicate normalized phone numbers are rejected, similar business names are warned in notes, permanent suppression records keep blocked numbers out of the call queue, and a lead can only become call ready when the phone is verified from the official company website or official Google Business Profile. Owner Direct phone type requires an owner evidence URL and is distinct from Official Company Line.

Milestone 2 adds `/app/call-desk`, `/app/callbacks`, `/app/calendar`, `/app/founder`, and `/app/sales-dashboard`. The call desk serves one assigned eligible lead at a time, creates pending call sessions, opens native `tel:` links, restores the active lead after refresh or PWA return, records immutable call attempts with idempotency keys, updates operational state, completes due callbacks, books internal appointments, applies permanent wrong-number/do-not-call suppression, releases lead locks, and loads the next eligible lead without a full page refresh.

The queue is deterministic and server-side. It prioritizes exact due callbacks, overdue callbacks, interested leads, prior owner answers, full pitches, Owner Reach Score, best calling windows, lead/marketing score, fewest attempts, and oldest untouched leads. It excludes suppressed records, wrong numbers, do-not-call records, disqualified/closed leads, another user's assignments, active locks, future callbacks, unverified phones, non-call-ready leads, and active policy hours that are closed.

Milestone 3 adds `/app/scraper`, a Founder-controlled Utah HVAC/plumbing discovery and verification engine. It uses Google Places as the live discovery source when `GOOGLE_PLACES_API_KEY` is configured, stores scraper review records, analyzes official websites with SSRF protections, verifies phones only from official website or Google Business Profile evidence, stores owner evidence without inventing Owner Direct numbers, scores owner reach, marketing need, and data confidence separately, blocks suppressed or duplicate numbers from approval, and requires human approval before a discovery enters the call queue.

Twilio Voice, automated cold SMS, Google Calendar sync, predictive dialing, call recording, multi-line dialing, electricians, and production custom-domain work are intentionally not configured or integrated. See `SALES_SYSTEM.md`, `LEAD_PROVIDERS.md`, and `WORKERS.md` for integration boundaries.

## Quick Start: Docker PostgreSQL

Use this path when Docker is installed locally.

```bash
corepack enable
pnpm install
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://ascend:ascend_dev_password@localhost:5432/ascend_os?schema=public"
TEST_DATABASE_URL="postgresql://ascend_test:ascend_test_password@localhost:5433/ascend_os_test?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="use-a-long-random-development-secret"
APP_ENV="development"
GOOGLE_PLACES_API_KEY=""
SALES_WORKER_SECRET="replace-with-a-long-random-worker-secret"
CRON_SECRET=""
```

Start the database and app:

```bash
pnpm run db:start
pnpm run setup
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quick Start: Hosted PostgreSQL

Use this path for Vercel, Neon, Supabase, Railway, or any standard hosted PostgreSQL database.

1. Create a PostgreSQL database with your provider.
2. Copy the pooled or direct PostgreSQL connection string.
3. Put it in `.env` as `DATABASE_URL`.
4. Run:

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm run setup
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## GitHub and Vercel

Push this repository to GitHub, then import it into Vercel as a Next.js project.

Current production domain: `https://ascend-os-v2-app.vercel.app`.

GitHub sync note: this local checkout may be ahead of `origin/main` when shell GitHub credentials are unavailable. Do not claim GitHub is current until `git push origin main` succeeds.

Vercel environment variables:

```env
DATABASE_URL=
NEXTAUTH_URL=https://your-vercel-domain.vercel.app
NEXTAUTH_SECRET=
APP_ENV=production
GOOGLE_PLACES_API_KEY=
SALES_WORKER_SECRET=
CRON_SECRET=
```

Use a real hosted PostgreSQL `DATABASE_URL`. Do not use local Docker URLs in Vercel. Leave `GOOGLE_PLACES_API_KEY` empty to disable live scraper jobs honestly; set it only when Mahdy is ready to run paid Google Places discovery. Set `SALES_WORKER_SECRET` or `CRON_SECRET` before calling worker endpoints. Do not add Twilio, automated SMS, Google Calendar, call recording, predictive dialing, or custom-domain credentials for this milestone. After connecting the database, run migrations from a trusted machine or CI:

```bash
pnpm exec prisma migrate deploy
```

The Vercel build command is configured in `vercel.json` as `pnpm run vercel-build`.

## Development Accounts

The seed command prints these local-only credentials:

- Founder: `founder@ascend.local` / `AscendDev123!`
- Salesperson: `sales@ascend.local` / `AscendDev123!`
- Mahdy: `mahdy@ascend.local` / `AscendDev123!`
- Logan: `logan@ascend.local` / `AscendDev123!`

Never enable these automatically in production.

## Commands

- `pnpm run setup` checks `.env`, verifies database connectivity, generates Prisma Client, applies migrations, seeds, and prints next steps.
- `pnpm run dev` starts local development.
- `pnpm run build` builds production assets.
- `pnpm run start` serves the production build.
- `pnpm run lint` runs ESLint.
- `pnpm run typecheck` runs TypeScript.
- `pnpm run test` runs unit tests.
- `pnpm run test:integration` runs database-backed integration tests against `TEST_DATABASE_URL`.
- `pnpm run test:e2e` verifies `TEST_DATABASE_URL`, resets and seeds that dedicated database, then runs Playwright.
- `pnpm run test:e2e:raw` runs Playwright without resetting or safety-checking the database.
- `pnpm run format` writes Prettier formatting.
- `pnpm run format:check` checks formatting.
- `pnpm run db:start` starts Docker development and test PostgreSQL services.
- `pnpm run db:stop` stops Docker development and test PostgreSQL services.
- `pnpm run db:migrate` creates/applies local development migrations.
- `pnpm run db:migrate:deploy` applies committed migrations.
- `pnpm run db:seed` seeds local development data.
- `pnpm run db:prepare:e2e` resets, migrates, and seeds the dedicated E2E database.
- `pnpm run db:reset` destructively resets a non-production development database.

## How to Use Ascend OS Every Day

1. Start the day from `/app`.
2. Review unfinished work and carry forward only what still matters.
3. Set the daily intention, top three outcomes, and main risk.
4. Read the Ascend recommendation and adjust the plan.
5. Schedule focus blocks around the highest-value work.
6. Work from the ordered priority list, using complete, reopen, archive, and reorder controls.
7. Capture decisions, lessons, problems, and ideas as operating notes.
8. Convert notes into priorities when they become action items.
9. Update weekly or monthly goal progress manually.
10. Complete the end-of-day review and set tomorrow's first action.

## Personal OS Capabilities

- Priorities: create, edit, complete, reopen, reorder, pin, archive, soft-delete, categorize, assign due dates/times, estimate duration, and estimate revenue impact.
- Daily planning: one plan per user, organization, and calendar date, using the organization's timezone.
- Daily review: fast end-of-day summary, blockers, carryover, removals, tomorrow's first action, and 1-10 founder rating.
- Focus blocks: create, edit, start, pause, resume, complete, cancel, duplicate, relate to priorities, and preserve future calendar fields.
- Goals: daily, weekly, monthly, and quarterly goals with manual progress and integration-ready fields.
- Notes: create, edit, pin, archive, categorize, tag, and convert into priorities.
- Recommendations: deterministic "Ascend recommendation" based on stored goals, priorities, due dates, revenue impact, focus capacity, and carryover count.
- Notifications: in-app reminder candidates for overdue priorities, due critical work, focus timing, goal pace, daily planning/review, repeated carryover, and long-running focus.

## Health and Diagnostics

- Health endpoint: [http://localhost:3000/api/health](http://localhost:3000/api/health)
- Development diagnostics: [http://localhost:3000/dev/diagnostics](http://localhost:3000/dev/diagnostics)

`/api/health` returns HTTP 200 when the app and database are healthy, and HTTP 503 when the app is running but the database is unavailable.

## The App Does Not Open

Run these checks in order:

```bash
node --version
corepack enable
pnpm install
test -f .env || cp .env.example .env
pnpm run setup
pnpm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

If setup fails:

- Confirm `DATABASE_URL` is a reachable PostgreSQL URL.
- If using Docker, run `docker compose up -d`.
- If using Vercel/hosted PostgreSQL, paste the hosted connection string into `.env`.
- Run `pnpm exec prisma migrate deploy`.
- Run `pnpm run db:seed`.
- Check [http://localhost:3000/api/health](http://localhost:3000/api/health).

If the browser shows an old blank page:

1. Open DevTools.
2. Application tab.
3. Service Workers.
4. Unregister old service workers.
5. Clear site data.
6. Restart `pnpm run dev`.

If port 3000 is busy:

```bash
pnpm run dev -- --port 3001
```

Then open `http://localhost:3001`.

## Browser Tests

Use a dedicated non-production test database in `TEST_DATABASE_URL`. The E2E runner refuses to run unless the test database URL is distinct from `DATABASE_URL`, is PostgreSQL, is not marked production, and has a database name containing `test`, `e2e`, or `ci`.

With Docker:

```bash
pnpm run db:start
pnpm run test:e2e
```

With a native or hosted PostgreSQL test database, set `TEST_DATABASE_URL` to that database before running `pnpm run test:e2e`. Playwright artifacts are written to the ignored `test-results` folder by default; override with `PLAYWRIGHT_OUTPUT_DIR` when needed.

Do not run Playwright against production or a shared customer database. `pnpm run test:e2e` intentionally resets the database in `TEST_DATABASE_URL`.

## PWA Notes

The manifest installs as `Ascend Sales OS` and starts at `/app/call-desk`. The service worker is not registered during normal development. It caches only static install assets and `/offline` in production, never authenticated HTML or API responses.

Installed users can see in-app iPhone and Android install guidance from `/app/sales-dashboard`. Pending call state and draft notes are stored only in local browser storage for recovery and are cleared on logout. Optional push subscriptions have database and permission foundations, but delivery credentials are intentionally not configured in Milestone 2.

To test installability:

```bash
pnpm run build
pnpm run start
```

Open the production URL in Chrome and inspect the Application tab.
