import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/server/auth";
import { acquireNextLead, getCallDeskContext, recordCallOutcome } from "@/lib/server/call-desk";
import { callOutcomeSchema } from "@/lib/validation/sales";

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.id)
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    const body = await request.json().catch(() => null);
    const parsed = callOutcomeSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ message: "Check the call outcome details." }, { status: 400 });
    const context = await getCallDeskContext(session.user.id);
    const attempt = await recordCallOutcome(context, parsed.data);
    const next = await acquireNextLead(context, parsed.data.sessionKey);
    return NextResponse.json({ attempt, next });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record the call outcome.";
    const known: Record<string, string> = {
      INVALID_CALLBACK_TIME: "Callback Requested requires an exact date and time.",
      INVALID_APPOINTMENT_RANGE: "Appointment Booked requires a valid date and time.",
      SUPPRESSED_LEAD: "This lead is suppressed and cannot be called.",
      FORBIDDEN: "Unauthorized action."
    };
    return NextResponse.json(
      { message: known[message] ?? "Unable to record the call outcome." },
      { status: 400 }
    );
  }
}
