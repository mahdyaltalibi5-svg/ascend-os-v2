import { NextResponse } from "next/server";

import { processScraperJobs } from "@/lib/server/scraper";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    googlePlacesConfigured: Boolean(process.env.GOOGLE_PLACES_API_KEY),
    workerSecretConfigured: Boolean(process.env.SALES_WORKER_SECRET || process.env.CRON_SECRET)
  });
}

export async function POST(request: Request) {
  const expectedSecret = process.env.SALES_WORKER_SECRET || process.env.CRON_SECRET;
  const provided =
    request.headers.get("x-ascend-worker-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expectedSecret || provided !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processScraperJobs(1);
  return NextResponse.json({ ok: true, result, processedAt: new Date().toISOString() });
}
