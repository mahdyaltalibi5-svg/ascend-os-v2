# Workers

Milestone 3 adds a Vercel-compatible background job model and a secure worker endpoint.

## Current Endpoints

`POST /api/sales/jobs`

Required header:

```text
x-ascend-worker-secret: <SALES_WORKER_SECRET or CRON_SECRET>
```

The endpoint processes a small bounded batch of queued sales jobs.

`POST /api/scraper/jobs`

Required header:

```text
x-ascend-worker-secret: <SALES_WORKER_SECRET or CRON_SECRET>
```

The endpoint processes one queued scraper job at a time. It is safe for Vercel cron or a future
external worker because all job input, progress, errors, and results are stored in Postgres.

`GET /api/scraper/jobs` returns only configuration readiness flags, not secrets.

## Job Model

`BackgroundJob` stores:

- Organization scope
- Job type and status
- Safe JSON input
- Progress counters
- Result summary
- Error message
- Attempt count
- Lock, heartbeat, start, and completion timestamps

Milestone 3 uses job type `lead_scraper_discovery`. Its input stores selected cities, trades,
per-search limit, provider key, and a bounded search plan. Results are written as
`ScraperLeadDiscovery` review records instead of directly entering the call queue.

## Mac Mini Preparation

A future Mac mini worker should use a scoped worker API to poll, claim, process, heartbeat, and complete jobs. It should not connect directly to production Postgres unless a separate secure architecture is approved.

## Secrets

Do not commit worker secrets. Use Vercel environment variables or local `.env`.
