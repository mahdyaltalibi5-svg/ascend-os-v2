import { PrismaClient } from "@prisma/client";

import {
  founderPermissions,
  permissionDescriptions,
  salespersonPermissions,
  type PermissionKey
} from "../lib/permissions";
import { hashPassword } from "../lib/server/crypto";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run development seed in production.");
  }

  const passwordHash = await hashPassword("AscendDev123!");

  const founder = await prisma.user.upsert({
    where: { normalizedEmail: "founder@ascend.local" },
    update: { name: "Ascend Founder", passwordHash },
    create: {
      name: "Ascend Founder",
      email: "founder@ascend.local",
      normalizedEmail: "founder@ascend.local",
      passwordHash,
      emailVerified: new Date()
    }
  });

  const salesperson = await prisma.user.upsert({
    where: { normalizedEmail: "sales@ascend.local" },
    update: { name: "Ascend Salesperson", passwordHash },
    create: {
      name: "Ascend Salesperson",
      email: "sales@ascend.local",
      normalizedEmail: "sales@ascend.local",
      passwordHash,
      emailVerified: new Date()
    }
  });

  for (const [key, description] of Object.entries(permissionDescriptions)) {
    await prisma.permission.upsert({
      where: { key },
      update: { name: key, description },
      create: { key, name: key, description }
    });
  }

  const organization = await prisma.organization.upsert({
    where: { slug: "ascend-web-development" },
    update: {
      name: "Ascend Web Development",
      website: "https://ascendwebdevelopment.com",
      timezone: "America/Denver",
      createdById: founder.id
    },
    create: {
      name: "Ascend Web Development",
      slug: "ascend-web-development",
      website: "https://ascendwebdevelopment.com",
      timezone: "America/Denver",
      createdById: founder.id
    }
  });

  await prisma.organizationBranding.upsert({
    where: { organizationId: organization.id },
    update: {
      theme: "dark",
      primaryColor: "#3B82F6",
      accentColor: "#38BDF8",
      surfaceColor: "#0F172A",
      radius: "8px"
    },
    create: {
      organizationId: organization.id,
      theme: "dark",
      primaryColor: "#3B82F6",
      accentColor: "#38BDF8",
      surfaceColor: "#0F172A",
      radius: "8px"
    }
  });

  const founderRole = await prisma.role.upsert({
    where: { organizationId_key: { organizationId: organization.id, key: "founder" } },
    update: {
      name: "Founder",
      description: "Full organization administration and access.",
      system: true
    },
    create: {
      organizationId: organization.id,
      key: "founder",
      name: "Founder",
      description: "Full organization administration and access.",
      system: true
    }
  });

  const salespersonRole = await prisma.role.upsert({
    where: { organizationId_key: { organizationId: organization.id, key: "salesperson" } },
    update: {
      name: "Salesperson",
      description: "Sales workspace access without sensitive administration.",
      system: true
    },
    create: {
      organizationId: organization.id,
      key: "salesperson",
      name: "Salesperson",
      description: "Sales workspace access without sensitive administration.",
      system: true
    }
  });

  await assignPermissions(founderRole.id, founderPermissions);
  await assignPermissions(salespersonRole.id, salespersonPermissions);

  const founderMembership = await prisma.organizationMembership.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: founder.id } },
    update: { status: "ACTIVE" },
    create: { organizationId: organization.id, userId: founder.id, status: "ACTIVE" }
  });

  const salespersonMembership = await prisma.organizationMembership.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: salesperson.id } },
    update: { status: "ACTIVE" },
    create: { organizationId: organization.id, userId: salesperson.id, status: "ACTIVE" }
  });

  await prisma.membershipRole.upsert({
    where: { membershipId_roleId: { membershipId: founderMembership.id, roleId: founderRole.id } },
    update: {},
    create: { membershipId: founderMembership.id, roleId: founderRole.id }
  });

  await prisma.membershipRole.upsert({
    where: {
      membershipId_roleId: { membershipId: salespersonMembership.id, roleId: salespersonRole.id }
    },
    update: {},
    create: { membershipId: salespersonMembership.id, roleId: salespersonRole.id }
  });

  for (const user of [founder, salesperson]) {
    await prisma.notificationPreference.upsert({
      where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
      update: {},
      create: { organizationId: organization.id, userId: user.id }
    });
  }

  const existingSeedAudit = await prisma.auditEvent.findFirst({
    where: {
      organizationId: organization.id,
      action: "seed.organization.ready",
      entityId: organization.id
    }
  });

  if (!existingSeedAudit) {
    await prisma.auditEvent.createMany({
      data: [
        {
          organizationId: organization.id,
          actorUserId: founder.id,
          action: "seed.organization.ready",
          entityType: "Organization",
          entityId: organization.id,
          metadata: { seed: true }
        },
        {
          organizationId: organization.id,
          actorUserId: founder.id,
          action: "membership.created",
          entityType: "OrganizationMembership",
          entityId: founderMembership.id,
          metadata: { role: "founder", seed: true }
        },
        {
          organizationId: organization.id,
          actorUserId: founder.id,
          action: "membership.created",
          entityType: "OrganizationMembership",
          entityId: salespersonMembership.id,
          metadata: { role: "salesperson", seed: true }
        }
      ]
    });
  }

  console.log("Seeded Ascend OS development data.");
  console.log("Founder: founder@ascend.local / AscendDev123!");
  console.log("Salesperson: sales@ascend.local / AscendDev123!");
}

async function assignPermissions(roleId: string, permissions: PermissionKey[]) {
  const records = await prisma.permission.findMany({
    where: { key: { in: permissions } }
  });

  for (const permission of records) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId: permission.id } },
      update: {},
      create: { roleId, permissionId: permission.id }
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
