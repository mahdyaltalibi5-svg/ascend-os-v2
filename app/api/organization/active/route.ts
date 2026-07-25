import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/server/auth";
import { setActiveOrganization } from "@/lib/server/organization";
import { activeOrganizationSchema } from "@/lib/validation/organization";

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = activeOrganizationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid organization." }, { status: 400 });
  }

  try {
    await setActiveOrganization(session.user.id, parsed.data.organizationId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Organization access denied." }, { status: 403 });
  }
}
