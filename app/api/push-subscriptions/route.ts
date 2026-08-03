import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/server/auth";
import { getCallDeskContext, savePushSubscription } from "@/lib/server/call-desk";
import { pushSubscriptionSchema } from "@/lib/validation/sales";

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.id)
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    const parsed = pushSubscriptionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      return NextResponse.json({ message: "Invalid push subscription." }, { status: 400 });
    const context = await getCallDeskContext(session.user.id);
    if (!context.permissions.includes("push.manage_own")) {
      return NextResponse.json({ message: "Push permission denied." }, { status: 403 });
    }
    const subscription = await savePushSubscription(context, parsed.data);
    return NextResponse.json({ subscription });
  } catch {
    return NextResponse.json({ message: "Unable to save push subscription." }, { status: 400 });
  }
}
