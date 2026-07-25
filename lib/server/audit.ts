import type { Prisma } from "@prisma/client";
import { headers } from "next/headers";

import { prisma } from "@/lib/server/db";
import { safeRequestHash } from "@/lib/server/crypto";

type AuditInput = {
  organizationId?: string | null;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonObject;
};

export async function writeAuditEvent(input: AuditInput) {
  let ipHash: string | undefined;
  let userAgent: string | undefined;

  try {
    const headerStore = await headers();
    ipHash = safeRequestHash(
      headerStore.get("x-forwarded-for")?.split(",")[0] ?? headerStore.get("x-real-ip")
    );
    userAgent = headerStore.get("user-agent") ?? undefined;
  } catch {
    ipHash = undefined;
    userAgent = undefined;
  }

  return prisma.auditEvent.create({
    data: {
      organizationId: input.organizationId ?? null,
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata,
      ipHash,
      userAgent
    }
  });
}
