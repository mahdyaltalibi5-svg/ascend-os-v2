import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/server/auth";
import { createOrganizationForUser } from "@/lib/server/organization";
import { createOrganizationSchema } from "@/lib/validation/organization";
import { databaseUnavailableMessage, isDatabaseUnavailableError } from "@/lib/server/database";

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createOrganizationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Check the organization details and try again." },
      { status: 400 }
    );
  }

  try {
    const organization = await createOrganizationForUser({
      userId: session.user.id,
      name: parsed.data.name,
      website: parsed.data.website,
      timezone: parsed.data.timezone,
      logoUrl: parsed.data.logoUrl || undefined,
      theme: parsed.data.theme,
      primaryColor: parsed.data.primaryColor,
      accentColor: parsed.data.accentColor
    });

    return NextResponse.json({ ok: true, organizationId: organization.id });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json({ message: databaseUnavailableMessage }, { status: 503 });
    }
    console.error("Unexpected organization creation error", error);
    return NextResponse.json(
      { message: "Unable to create the organization right now." },
      { status: 500 }
    );
  }
}
