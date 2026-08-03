import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/server/auth";
import { cancelPendingCall, getCallDeskContext } from "@/lib/server/call-desk";
import { cancelPendingCallSchema } from "@/lib/validation/sales";

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.id)
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    const parsed = cancelPendingCallSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      return NextResponse.json({ message: "Invalid pending call." }, { status: 400 });
    const context = await getCallDeskContext(session.user.id);
    await cancelPendingCall(context, parsed.data);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Unable to cancel the pending call." }, { status: 400 });
  }
}
