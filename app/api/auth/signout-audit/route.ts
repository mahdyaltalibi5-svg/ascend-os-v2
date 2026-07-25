import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/server/auth";
import { writeAuditEvent } from "@/lib/server/audit";

export async function POST() {
  const session = await getCurrentSession();

  if (session?.user?.id) {
    await writeAuditEvent({
      actorUserId: session.user.id,
      action: "user.signed_out",
      entityType: "User",
      entityId: session.user.id
    });
  }

  return NextResponse.json({ ok: true });
}
