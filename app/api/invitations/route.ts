import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/server/auth";
import { createInvitation, requirePermission } from "@/lib/server/organization";
import { createInvitationSchema } from "@/lib/validation/organization";

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createInvitationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Enter a valid email address." }, { status: 400 });
  }

  try {
    const context = await requirePermission(session.user.id, "team.manage");
    const result = await createInvitation({
      organizationId: context.organization.id,
      actorUserId: session.user.id,
      email: parsed.data.email
    });

    return NextResponse.json({
      ok: true,
      invitationId: result.invitation.id,
      developmentToken: process.env.APP_ENV === "development" ? result.token : undefined
    });
  } catch {
    return NextResponse.json(
      { message: "You do not have access to invite team members." },
      { status: 403 }
    );
  }
}
