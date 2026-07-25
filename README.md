# Ascend OS

Ascend OS is the secure application foundation for Ascend Web Development and future white-label SaaS tenants. Milestone 1.1 focuses on making the foundation actually run: install dependencies, connect PostgreSQL, migrate, seed, open the app, sign in, sign up, and verify the role-aware shell.

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
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="use-a-long-random-development-secret"
APP_ENV="development"
```

Start the database and app:

```bash
docker compose up -d
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

Vercel environment variables:

```env
DATABASE_URL=
NEXTAUTH_URL=https://your-vercel-domain.vercel.app
NEXTAUTH_SECRET=
APP_ENV=production
```

Use a real hosted PostgreSQL `DATABASE_URL`. Do not use local Docker URLs in Vercel. After connecting the database, run migrations from a trusted machine or CI:

```bash
pnpm exec prisma migrate deploy
```

The Vercel build command is configured in `vercel.json` as `pnpm run vercel-build`.

## Development Accounts

The seed command prints these local-only credentials:

- Founder: `founder@ascend.local` / `AscendDev123!`
- Salesperson: `sales@ascend.local` / `AscendDev123!`

Never enable these automatically in production.

## Commands

- `pnpm run setup` checks `.env`, verifies database connectivity, generates Prisma Client, applies migrations, seeds, and prints next steps.
- `pnpm run dev` starts local development.
- `pnpm run build` builds production assets.
- `pnpm run start` serves the production build.
- `pnpm run lint` runs ESLint.
- `pnpm run typecheck` runs TypeScript.
- `pnpm run test` runs unit tests.
- `pnpm run test:e2e` runs Playwright.
- `pnpm run format` writes Prettier formatting.
- `pnpm run format:check` checks formatting.
- `pnpm run db:migrate` creates/applies local development migrations.
- `pnpm run db:migrate:deploy` applies committed migrations.
- `pnpm run db:seed` seeds local development data.
- `pnpm run db:reset` destructively resets a non-production development database.

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

Use a dedicated non-production test database. Set `DATABASE_URL` to that database, then run:

```bash
pnpm run setup
pnpm run test:e2e
```

Do not run Playwright against production or a shared customer database.

## PWA Notes

The service worker is not registered during normal development. It caches only static install assets and `/offline` in production, never authenticated HTML or API responses.

To test installability:

```bash
pnpm run build
pnpm run start
```

Open the production URL in Chrome and inspect the Application tab.
