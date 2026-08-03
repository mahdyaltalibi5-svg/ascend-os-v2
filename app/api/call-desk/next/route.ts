import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/server/auth";
import { acquireNextLead, getCallDeskContext } from "@/lib/server/call-desk";
import { nextLeadSchema } from "@/lib/validation/sales";

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.id)
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    const parsed = nextLeadSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      return NextResponse.json({ message: "Invalid call-desk session." }, { status: 400 });
    const context = await getCallDeskContext(session.user.id);
    if (
      !context.permissions.includes("calls.operate_assigned") &&
      !context.permissions.includes("calls.create")
    ) {
      return NextResponse.json({ message: "Call desk access denied." }, { status: 403 });
    }
    const next = await acquireNextLead(context, parsed.data.sessionKey);
    if (!next) return NextResponse.json({ lead: null, message: "Queue empty." });
    return NextResponse.json(next);
  } catch (error) {
    return NextResponse.json({ message: safeMessage(error) }, { status: 500 });
  }
}

function safeMessage(error: unknown) {
  if (error instanceof Error && ["FORBIDDEN", "LEAD_ALREADY_LOCKED"].includes(error.message)) {
    return error.message;
  }
  return "Unable to load the next lead.";
}
