# Workers

Milestone 3 adds a Vercel-compatible background job model and a secure worker endpoint.

## Current Endpoint

`POST /api/sales/jobs`

Required header:

```text
x-ascend-worker-secret: <SALES_WORKER_SECRET or CRON_SECRET>
```

The endpoint processes a small bounded batch of queued sales jobs.

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

## Mac Mini Preparation

A future Mac mini worker should use a scoped worker API to poll, claim, process, heartbeat, and complete jobs. It should not connect directly to production Postgres unless a separate secure architecture is approved.

## Secrets

Do not commit worker secrets. Use Vercel environment variables or local `.env`.
