import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/server/auth";
import { writeAuditEvent } from "@/lib/server/audit";

async function handleSignOut(request: Request) {
  const session = await getCurrentSession();

  if (session?.user?.id) {
    await writeAuditEvent({
      actorUserId: session.user.id,
      action: "user.signed_out",
      entityType: "User",
      entityId: session.user.id
    });
  }

  const response = NextResponse.redirect(new URL("/signin", request.url), { status: 303 });
  for (const cookieName of [
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.callback-url",
    "__Secure-next-auth.callback-url",
    "next-auth.csrf-token",
    "__Host-next-auth.csrf-token"
  ]) {
    response.cookies.set(cookieName, "", { maxAge: 0, path: "/" });
  }
  return response;
}

export async function GET(request: Request) {
  return handleSignOut(request);
}

export async function POST(request: Request) {
  return handleSignOut(request);
}
