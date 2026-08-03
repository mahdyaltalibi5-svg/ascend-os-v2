import type { Prisma, PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  founderPermissions,
  permissionDescriptions,
  salespersonPermissions,
  type PermissionKey
} from "@/lib/permissions";
import {
  isResourceOwnedByOrganization,
  validateActiveOrganizationSelection
} from "@/lib/authorization";
import { prisma } from "@/lib/server/db";
import { writeAuditEvent } from "@/lib/server/audit";
import { hashForStorage, randomToken } from "@/lib/server/crypto";
import { normalizeEmail, slugify } from "@/lib/utils";
import { defaultServiceOfferings } from "@/lib/revenue/constants";
import { defaultPipelineStages, defaultSalesGoals } from "@/lib/sales/constants";

const ACTIVE_ORG_COOKIE = "ascend_active_org";

type Tx = Prisma.TransactionClient | PrismaClient;

export async function ensurePermissions(tx: Tx = prisma) {
  await Promise.all(
    Object.entries(permissionDescriptions).map(([key, description]) =>
      tx.permission.upsert({
        where: { key },
        update: { name: key, description },
        create: { key, name: key, description }
      })
    )
  );
}

export async function ensureDefaultRolesForOrganization(tx: Tx, organizationId: string) {
  await ensurePermissions(tx);

  const founderRole = await tx.role.upsert({
    where: { organizationId_key: { organizationId, key: "founder" } },
    update: {
      name: "Founder",
      description: "Full organization administration and access.",
      system: true
    },
    create: {
      organizationId,
      key: "founder",
      name: "Founder",
      description: "Full organization administration and access.",
      system: true
    }
  });

  const salespersonRole = await tx.role.upsert({
    where: { organizationId_key: { organizationId, key: "salesperson" } },
    update: {
      name: "Salesperson",
      description: "Sales workspace access without sensitive administration.",
      system: true
    },
    create: {
      organizationId,
      key: "salesperson",
      name: "Salesperson",
      description: "Sales workspace access without sensitive administration.",
      system: true
    }
  });

  await assignPermissionsToRole(tx, founderRole.id, founderPermissions);
  await assignPermissionsToRole(tx, salespersonRole.id, salespersonPermissions);

  return { founderRole, salespersonRole };
}

export async function ensureDefaultServiceOfferings(tx: Tx, organizationId: string) {
  await Promise.all(
    defaultServiceOfferings.map((service) =>
      tx.serviceOffering.upsert({
        where: { organizationId_name: { organizationId, name: service.name } },
        update: {
          revenueCategory: service.revenueCategory,
          billingType: service.billingType,
          active: true
        },
        create: {
          organizationId,
          name: service.name,
          revenueCategory: service.revenueCategory,
          billingType: service.billingType,
          active: true
        }
      })
    )
  );
}

export async function ensureDefaultSalesSystem(tx: Tx, organizationId: string) {
  const pipeline = await tx.pipeline.upsert({
    where: { organizationId_name: { organizationId, name: "Ascend Sales Pipeline" } },
    update: {
      isDefault: true,
      archivedAt: null,
      description: "Default Ascend sales pipeline for prospects, appointments, and revenue handoff."
    },
    create: {
      organizationId,
      name: "Ascend Sales Pipeline",
      description:
        "Default Ascend sales pipeline for prospects, appointments, and revenue handoff.",
      isDefault: true
    }
  });

  await Promise.all(
    defaultPipelineStages.map(
      ([name, probability, isWonStage = false, isLostStage = false], index) =>
        tx.pipelineStage.upsert({
          where: { pipelineId_name: { pipelineId: pipeline.id, name } },
          update: {
            organizationId,
            sortOrder: index,
            defaultProbability: probability,
            isWonStage,
            isLostStage
          },
          create: {
            organizationId,
            pipelineId: pipeline.id,
            name,
            sortOrder: index,
            defaultProbability: probability,
            isWonStage,
            isLostStage
          }
        })
    )
  );

  const now = new Date();
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

  for (const goal of defaultSalesGoals) {
    const existingGoal = await tx.salesGoal.findFirst({
      where: {
        organizationId,
        userId: null,
        metric: goal.metric,
        periodType: goal.periodType,
        startDate: dayStart,
        endDate: dayEnd
      }
    });

    if (!existingGoal) {
      await tx.salesGoal.create({
        data: {
          organizationId,
          periodType: goal.periodType,
          metric: goal.metric,
          targetValue: goal.targetValue,
          startDate: dayStart,
          endDate: dayEnd
        }
      });
    }
  }

  await tx.scraperScoringPolicy.upsert({
    where: { id: `default-scraper-policy-${organizationId}` },
    update: {
      name: "Default scraper scoring",
      ownerReachWeight: 40,
      marketingNeedWeight: 40,
      dataConfidenceWeight: 20,
      minimumConfidence: 70,
      active: true
    },
    create: {
      id: `default-scraper-policy-${organizationId}`,
      organizationId,
      name: "Default scraper scoring",
      ownerReachWeight: 40,
      marketingNeedWeight: 40,
      dataConfidenceWeight: 20,
      minimumConfidence: 70,
      active: true
    }
  });

  return pipeline;
}

async function assignPermissionsToRole(tx: Tx, roleId: string, permissions: PermissionKey[]) {
  const records = await tx.permission.findMany({
    where: { key: { in: permissions } }
  });

  await Promise.all(
    records.map((permission) =>
      tx.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId: permission.id } },
        update: {},
        create: { roleId, permissionId: permission.id }
      })
    )
  );
}

export async function createOrganizationForUser(input: {
  userId: string;
  name: string;
  website?: string;
  timezone: string;
  logoUrl?: string;
  theme: "dark" | "light";
  primaryColor: string;
  accentColor: string;
}) {
  const baseSlug = slugify(input.name) || "organization";
  const slug = await uniqueOrganizationSlug(baseSlug);

  const organization = await prisma.$transaction(async (tx) => {
    const created = await tx.organization.create({
      data: {
        name: input.name,
        slug,
        website: input.website,
        timezone: input.timezone,
        createdById: input.userId,
        branding: {
          create: {
            logoUrl: input.logoUrl || null,
            theme: input.theme,
            primaryColor: input.primaryColor,
            accentColor: input.accentColor
          }
        }
      }
    });

    const { founderRole } = await ensureDefaultRolesForOrganization(tx, created.id);
    await ensureDefaultServiceOfferings(tx, created.id);
    await ensureDefaultSalesSystem(tx, created.id);

    const membership = await tx.organizationMembership.create({
      data: {
        organizationId: created.id,
        userId: input.userId,
        roles: {
          create: {
            roleId: founderRole.id
          }
        }
      }
    });

    await tx.notificationPreference.create({
      data: {
        organizationId: created.id,
        userId: input.userId
      }
    });

    await tx.auditEvent.create({
      data: {
        organizationId: created.id,
        actorUserId: input.userId,
        action: "organization.created",
        entityType: "Organization",
        entityId: created.id,
        metadata: {
          membershipId: membership.id,
          role: "founder"
        }
      }
    });

    await tx.auditEvent.create({
      data: {
        organizationId: created.id,
        actorUserId: input.userId,
        action: "membership.created",
        entityType: "OrganizationMembership",
        entityId: membership.id,
        metadata: {
          role: "founder"
        }
      }
    });

    await tx.auditEvent.create({
      data: {
        organizationId: created.id,
        actorUserId: input.userId,
        action: "branding.changed",
        entityType: "OrganizationBranding",
        entityId: created.id,
        metadata: {
          theme: input.theme
        }
      }
    });

    return created;
  });

  await setActiveOrganization(input.userId, organization.id);
  return organization;
}

export async function uniqueOrganizationSlug(baseSlug: string) {
  let slug = baseSlug;
  let counter = 2;

  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
}

export async function getMembership(userId: string, organizationId: string) {
  return prisma.organizationMembership.findFirst({
    where: {
      userId,
      organizationId,
      status: "ACTIVE"
    },
    include: {
      organization: { include: { branding: true } },
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true }
              }
            }
          }
        }
      }
    }
  });
}

export async function getUserOrganizations(userId: string) {
  return prisma.organizationMembership.findMany({
    where: { userId, status: "ACTIVE" },
    include: {
      organization: {
        include: { branding: true }
      },
      roles: { include: { role: true } }
    },
    orderBy: { createdAt: "asc" }
  });
}

export function permissionsFromMembership(membership: Awaited<ReturnType<typeof getMembership>>) {
  if (!membership) return [];
  return Array.from(
    new Set(
      membership.roles.flatMap((membershipRole) =>
        membershipRole.role.permissions.map((rolePermission) => rolePermission.permission.key)
      )
    )
  ).sort();
}

export async function getActiveOrganizationId(userId: string) {
  const cookieStore = await cookies();
  const requestedOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  const memberships = await prisma.organizationMembership.findMany({
    where: { userId, status: "ACTIVE" },
    select: { organizationId: true },
    orderBy: { createdAt: "asc" }
  });
  const selectedId = validateActiveOrganizationSelection(
    memberships.map((membership) => membership.organizationId),
    requestedOrgId
  );

  return selectedId;
}

export async function setActiveOrganization(userId: string, organizationId: string) {
  const membership = await getMembership(userId, organizationId);
  if (!membership) {
    throw new Error("ORG_ACCESS_DENIED");
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90
  });

  await writeAuditEvent({
    organizationId,
    actorUserId: userId,
    action: "organization.selected",
    entityType: "Organization",
    entityId: organizationId
  });

  return membership;
}

export async function getOrganizationContext(userId: string) {
  const activeOrganizationId = await getActiveOrganizationId(userId);
  if (!activeOrganizationId) return null;

  await ensureDefaultRolesForOrganization(prisma, activeOrganizationId);
  const serviceCount = await prisma.serviceOffering.count({
    where: { organizationId: activeOrganizationId }
  });
  if (serviceCount === 0) {
    await ensureDefaultServiceOfferings(prisma, activeOrganizationId);
  }
  const pipelineCount = await prisma.pipeline.count({
    where: { organizationId: activeOrganizationId, archivedAt: null }
  });
  if (pipelineCount === 0) {
    await ensureDefaultSalesSystem(prisma, activeOrganizationId);
  }

  const membership = await getMembership(userId, activeOrganizationId);
  if (!membership) return null;

  const permissions = permissionsFromMembership(membership);
  const roleKeys = membership.roles.map((membershipRole) => membershipRole.role.key).sort();

  return {
    membership,
    organization: membership.organization,
    permissions,
    roleKeys
  };
}

export async function requireOrganizationContext(userId: string) {
  const context = await getOrganizationContext(userId);
  if (!context) {
    redirect("/app/onboarding");
  }
  return context;
}

export async function requirePermission(userId: string, permission: PermissionKey) {
  const context = await requireOrganizationContext(userId);
  if (!context.permissions.includes(permission)) {
    throw new Error("FORBIDDEN");
  }
  return context;
}

export async function assertResourceInActiveOrganization(input: {
  userId: string;
  resourceOrganizationId: string;
}) {
  const context = await requireOrganizationContext(input.userId);
  if (!isResourceOwnedByOrganization(input.resourceOrganizationId, context.organization.id)) {
    throw new Error("CROSS_ORG_ACCESS_DENIED");
  }
  return true;
}

export async function createInvitation(input: {
  organizationId: string;
  actorUserId: string;
  email: string;
}) {
  const token = randomToken();
  const invitation = await prisma.invitation.create({
    data: {
      organizationId: input.organizationId,
      invitedById: input.actorUserId,
      email: normalizeEmail(input.email),
      tokenHash: hashForStorage(token),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14)
    }
  });

  await writeAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "invitation.created",
    entityType: "Invitation",
    entityId: invitation.id,
    metadata: {
      emailDomain: input.email.split("@")[1]?.toLowerCase()
    }
  });

  return { invitation, token };
}
