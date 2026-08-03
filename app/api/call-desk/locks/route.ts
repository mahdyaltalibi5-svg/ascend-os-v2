import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/server/auth";
import { getCallDeskContext, releaseLeadLock } from "@/lib/server/call-desk";
import { leadLockSchema } from "@/lib/validation/sales";

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.id)
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    const parsed = leadLockSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      return NextResponse.json({ message: "Invalid lock release." }, { status: 400 });
    const context = await getCallDeskContext(session.user.id);
    await releaseLeadLock(context, parsed.data.lockId, parsed.data.reason);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "FORBIDDEN"
        ? "Unauthorized action."
        : "Unable to release the lead lock.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
