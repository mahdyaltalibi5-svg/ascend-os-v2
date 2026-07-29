import { NextResponse } from "next/server";

import { processSalesJobs } from "@/app/(app)/app/sales/actions";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const expectedSecret = process.env.SALES_WORKER_SECRET || process.env.CRON_SECRET;
  const provided = request.headers.get("x-ascend-worker-secret");
  if (!expectedSecret || provided !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await processSalesJobs(3);
  return NextResponse.json({ ok: true, processedAt: new Date().toISOString() });
}
