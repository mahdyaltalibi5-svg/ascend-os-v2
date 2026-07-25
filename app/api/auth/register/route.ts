import { NextResponse } from "next/server";

import { normalizeEmail } from "@/lib/utils";
import { registerSchema } from "@/lib/validation/auth";
import { hashPassword } from "@/lib/server/crypto";
import { prisma } from "@/lib/server/db";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { writeAuditEvent } from "@/lib/server/audit";
import { databaseUnavailableMessage, isDatabaseUnavailableError } from "@/lib/server/database";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Check the account details and try again." },
      { status: 400 }
    );
  }

  const normalizedEmail = normalizeEmail(parsed.data.email);
  const rate = checkRateLimit(`register:${normalizedEmail}`, 4, 60_000);
  if (!rate.ok) {
    return NextResponse.json({ message: "Please wait before trying again." }, { status: 429 });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { normalizedEmail } });
    if (existingUser) {
      return NextResponse.json(
        { message: "Unable to create an account with those details." },
        { status: 400 }
      );
    }

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.trim(),
        normalizedEmail,
        passwordHash: await hashPassword(parsed.data.password),
        emailVerified: process.env.APP_ENV === "development" ? new Date() : null
      }
    });

    await writeAuditEvent({
      actorUserId: user.id,
      action: "account.created",
      entityType: "User",
      entityId: user.id,
      metadata: {
        emailVerificationMode:
          process.env.APP_ENV === "development" ? "development-auto" : "pending"
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json({ message: databaseUnavailableMessage }, { status: 503 });
    }
    console.error("Unexpected registration error", error);
    return NextResponse.json(
      { message: "Unable to create an account right now." },
      { status: 500 }
    );
  }
}
