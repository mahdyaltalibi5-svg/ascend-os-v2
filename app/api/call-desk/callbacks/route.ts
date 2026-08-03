import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/server/auth";
import { createCallback, getCallDeskContext, updateCallback } from "@/lib/server/call-desk";
import { callbackSchema, callbackUpdateSchema } from "@/lib/validation/sales";

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.id)
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    const parsed = callbackSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      return NextResponse.json(
        { message: "Callback requires an exact date and time." },
        { status: 400 }
      );
    const context = await getCallDeskContext(session.user.id);
    const callback = await createCallback(context, parsed.data);
    return NextResponse.json({ callback });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "SUPPRESSED_LEAD"
        ? "Suppressed leads cannot enter callback queues."
        : "Unable to create callback.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.id)
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    const parsed = callbackUpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      return NextResponse.json({ message: "Invalid callback update." }, { status: 400 });
    const context = await getCallDeskContext(session.user.id);
    const callback = await updateCallback(context, parsed.data);
    return NextResponse.json({ callback });
  } catch {
    return NextResponse.json({ message: "Unable to update callback." }, { status: 400 });
  }
}
