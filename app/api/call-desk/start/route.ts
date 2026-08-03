import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/server/auth";
import { getCallDeskContext, startPendingCall } from "@/lib/server/call-desk";
import { pendingCallSessionSchema } from "@/lib/validation/sales";

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.id)
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    const parsed = pendingCallSessionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      return NextResponse.json({ message: "Invalid pending call." }, { status: 400 });
    const context = await getCallDeskContext(session.user.id);
    const pendingSession = await startPendingCall(context, parsed.data);
    return NextResponse.json({ pendingSession });
  } catch (error) {
    return NextResponse.json({ message: safeMessage(error) }, { status: 400 });
  }
}

function safeMessage(error: unknown) {
  if (error instanceof Error && error.message === "LEAD_ALREADY_LOCKED") {
    return "That lead is already being handled by another caller.";
  }
  if (error instanceof Error && error.message === "FORBIDDEN") return "Unauthorized action.";
  return "Unable to start the call session.";
}
