"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { invoiceStatusAfterPayment } from "@/lib/revenue/calculations";
import { defaultServiceOfferings } from "@/lib/revenue/constants";
import { parseMoneyToCents } from "@/lib/revenue/formatting";
import { parseDateInput, periodForGoal } from "@/lib/revenue/periods";
import { safeJson, getRevenueCommandData } from "@/lib/server/revenue";
import { prisma } from "@/lib/server/db";
import { writeAuditEvent } from "@/lib/server/audit";
import { getCurrentSession } from "@/lib/server/auth";
import { requirePermission } from "@/lib/server/organization";
import {
  adjustmentSchema,
  clientSchema,
  contractSchema,
  invoiceSchema,
  paymentSchema,
  recommendationPrioritySchema,
  recurringRevenueSchema,
  revenueGoalSchema,
  serviceOfferingSchema
} from "@/lib/validation/revenue";
import type { PermissionKey } from "@/lib/permissions";

async function revenueContext(permission: PermissionKey) {
  const session = await getCurrentSession();
  if (!session?.user?.id) throw new Error("AUTHENTICATION_REQUIRED");
  const context = await requirePermission(session.user.id, permission);
  return {
    userId: session.user.id,
    organizationId: context.organization.id,
    timezone: context.organization.timezone
  };
}

function requiredCents(value: string) {
  const cents = parseMoneyToCents(value);
  if (!cents || cents <= 0) throw new Error("INVALID_AMOUNT");
  return cents;
}

function optionalCents(value?: string) {
  if (!value) return null;
  const cents = parseMoneyToCents(value);
  if (cents === null || cents < 0) throw new Error("INVALID_AMOUNT");
  return cents;
}

function optionalDate(value?: string) {
  return value ? parseDateInput(value) : null;
}

export async function upsertRevenueGoalAction(formData: FormData) {
  const context = await revenueContext("revenue.goals.manage");
  const parsed = revenueGoalSchema.parse(Object.fromEntries(formData));
  const targetAmountCents = requiredCents(parsed.targetAmount);
  const period = periodForGoal(parsed.goalPeriod, new Date(), context.timezone);

  const goal = await prisma.$transaction(async (tx) => {
    await tx.revenueGoal.updateMany({
      where: {
        organizationId: context.organizationId,
        goalType: parsed.goalType,
        startDate: period.start,
        endDate: period.end,
        primary: true
      },
      data: { primary: false }
    });

    const existing = await tx.revenueGoal.findFirst({
      where: {
        organizationId: context.organizationId,
        goalType: parsed.goalType,
        startDate: period.start,
        endDate: period.end
      }
    });

    return existing
      ? tx.revenueGoal.update({
          where: { id: existing.id },
          data: {
            ownerUserId: context.userId,
            name: parsed.name,
            goalPeriod: parsed.goalPeriod,
            targetAmountCents,
            notes: parsed.notes || null,
            primary: parsed.goalType === "cash_collected"
          }
        })
      : tx.revenueGoal.create({
          data: {
            organizationId: context.organizationId,
            ownerUserId: context.userId,
            name: parsed.name,
            goalPeriod: parsed.goalPeriod,
            goalType: parsed.goalType,
            startDate: period.start,
            endDate: period.end,
            targetAmountCents,
            notes: parsed.notes || null,
            primary: parsed.goalType === "cash_collected"
          }
        });
  });

  await audit(context, "revenue.goal.updated", "RevenueGoal", goal.id, {
    goalType: goal.goalType,
    targetAmountCents
  });
  revalidateRevenue();
}

export async function createClientAction(formData: FormData) {
  const context = await revenueContext("clients.manage");
  const parsed = clientSchema.parse(Object.fromEntries(formData));
  const client = await prisma.client.create({
    data: {
      organizationId: context.organizationId,
      businessName: parsed.businessName,
      contactName: parsed.contactName || null,
      contactEmail: parsed.contactEmail || null,
      contactPhone: parsed.contactPhone || null,
      status: parsed.status,
      source: parsed.source || null,
      notes: parsed.notes || null
    }
  });
  await audit(context, "revenue.client.created", "Client", client.id, {
    businessName: client.businessName
  });
  revalidateRevenue();
}

export async function createServiceOfferingAction(formData: FormData) {
  const context = await revenueContext("services.manage");
  const parsed = serviceOfferingSchema.parse(Object.fromEntries(formData));
  const defaultPriceCents = optionalCents(parsed.defaultPrice);
  const service = await prisma.serviceOffering.upsert({
    where: { organizationId_name: { organizationId: context.organizationId, name: parsed.name } },
    update: {
      description: parsed.description || null,
      revenueCategory: parsed.revenueCategory,
      defaultPriceCents,
      billingType: parsed.billingType,
      active: parsed.active
    },
    create: {
      organizationId: context.organizationId,
      name: parsed.name,
      description: parsed.description || null,
      revenueCategory: parsed.revenueCategory,
      defaultPriceCents,
      billingType: parsed.billingType,
      active: parsed.active
    }
  });
  await audit(context, "revenue.service.updated", "ServiceOffering", service.id, {
    name: service.name
  });
  revalidateRevenue();
}

export async function createDefaultServicesAction() {
  const context = await revenueContext("services.manage");
  await prisma.$transaction(
    defaultServiceOfferings.map((service) =>
      prisma.serviceOffering.upsert({
        where: {
          organizationId_name: { organizationId: context.organizationId, name: service.name }
        },
        update: { active: true },
        create: {
          organizationId: context.organizationId,
          name: service.name,
          revenueCategory: service.revenueCategory,
          billingType: service.billingType,
          active: true
        }
      })
    )
  );
  await audit(context, "revenue.service.defaults_created", "ServiceOffering", null, {
    count: defaultServiceOfferings.length
  });
  revalidateRevenue();
}

export async function createContractAction(formData: FormData) {
  const context = await revenueContext("revenue.contracts.manage");
  const parsed = contractSchema.parse(Object.fromEntries(formData));
  await assertClient(context.organizationId, parsed.clientId);
  if (parsed.serviceOfferingId)
    await assertService(context.organizationId, parsed.serviceOfferingId);

  const contract = await prisma.revenueContract.create({
    data: {
      organizationId: context.organizationId,
      clientId: parsed.clientId,
      serviceOfferingId: parsed.serviceOfferingId || null,
      name: parsed.name,
      contractedAmountCents: requiredCents(parsed.contractedAmount),
      billingType: parsed.billingType,
      status: parsed.status,
      depositAmountCents: optionalCents(parsed.depositAmount),
      mrrAmountCents: optionalCents(parsed.mrrAmount),
      signedDate: optionalDate(parsed.signedDate),
      startDate: optionalDate(parsed.startDate),
      endDate: optionalDate(parsed.endDate),
      notes: parsed.notes || null
    }
  });
  await audit(context, "revenue.contract.created", "RevenueContract", contract.id, {
    clientId: contract.clientId,
    contractedAmountCents: contract.contractedAmountCents
  });
  revalidateRevenue();
}

export async function createInvoiceAction(formData: FormData) {
  const context = await revenueContext("revenue.invoices.manage");
  const parsed = invoiceSchema.parse(Object.fromEntries(formData));
  await assertClient(context.organizationId, parsed.clientId);
  if (parsed.revenueContractId) {
    await assertContract(context.organizationId, parsed.revenueContractId, parsed.clientId);
  }
  const totalAmountCents = requiredCents(parsed.totalAmount);
  const issueDate = parseDateInput(parsed.issueDate);
  const dueDate = parseDateInput(parsed.dueDate);
  if (!issueDate || !dueDate || dueDate < issueDate) throw new Error("INVALID_DATE_RANGE");

  const invoice = await prisma.invoice.create({
    data: {
      organizationId: context.organizationId,
      clientId: parsed.clientId,
      revenueContractId: parsed.revenueContractId || null,
      invoiceNumber: parsed.invoiceNumber || null,
      issueDate,
      dueDate,
      totalAmountCents,
      amountOutstandingCents: totalAmountCents,
      status: parsed.status,
      notes: parsed.notes || null
    }
  });
  await audit(context, "revenue.invoice.created", "Invoice", invoice.id, {
    clientId: invoice.clientId,
    totalAmountCents
  });
  revalidateRevenue();
}

export async function recordPaymentAction(formData: FormData) {
  const context = await revenueContext("revenue.payments.manage");
  const parsed = paymentSchema.parse(Object.fromEntries(formData));
  const amountCents = requiredCents(parsed.amount);
  const paymentDate = parseDateInput(parsed.paymentDate);
  if (!paymentDate) throw new Error("INVALID_PAYMENT_DATE");
  await assertClient(context.organizationId, parsed.clientId);
  if (parsed.revenueContractId) {
    await assertContract(context.organizationId, parsed.revenueContractId, parsed.clientId);
  }

  const payment = await prisma.$transaction(async (tx) => {
    if (parsed.idempotencyKey) {
      const existing = await tx.payment.findUnique({
        where: {
          organizationId_idempotencyKey: {
            organizationId: context.organizationId,
            idempotencyKey: parsed.idempotencyKey
          }
        }
      });
      if (existing) return existing;
    }

    let invoice = null;
    if (parsed.invoiceId) {
      invoice = await tx.invoice.findFirst({
        where: {
          id: parsed.invoiceId,
          organizationId: context.organizationId,
          clientId: parsed.clientId,
          archivedAt: null
        }
      });
      if (!invoice) throw new Error("INVOICE_NOT_FOUND");
      if (parsed.status === "succeeded" && amountCents > invoice.amountOutstandingCents) {
        throw new Error("OVERPAYMENT_REQUIRES_ADJUSTMENT");
      }
    }

    const created = await tx.payment.create({
      data: {
        organizationId: context.organizationId,
        clientId: parsed.clientId,
        invoiceId: parsed.invoiceId || null,
        revenueContractId: parsed.revenueContractId || null,
        paymentDate,
        amountCents,
        status: parsed.status,
        paymentMethod: parsed.paymentMethod || null,
        idempotencyKey: parsed.idempotencyKey || null,
        notes: parsed.notes || null
      }
    });

    if (invoice && parsed.status === "succeeded") {
      const amountPaidCents = invoice.amountPaidCents + amountCents;
      const amountOutstandingCents = Math.max(0, invoice.totalAmountCents - amountPaidCents);
      const status = invoiceStatusAfterPayment(invoice.totalAmountCents, amountPaidCents);
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaidCents,
          amountOutstandingCents,
          status,
          paidAt: status === "paid" ? new Date() : null
        }
      });
    }

    return created;
  });

  await audit(context, "revenue.payment.recorded", "Payment", payment.id, {
    clientId: payment.clientId,
    invoiceId: payment.invoiceId,
    amountCents: payment.amountCents,
    status: payment.status
  });
  revalidateRevenue();
}

export async function createRecurringRevenueAction(formData: FormData) {
  const context = await revenueContext("revenue.manage");
  const parsed = recurringRevenueSchema.parse(Object.fromEntries(formData));
  await assertClient(context.organizationId, parsed.clientId);
  await assertContract(context.organizationId, parsed.revenueContractId, parsed.clientId);

  const schedule = await prisma.recurringRevenueSchedule.create({
    data: {
      organizationId: context.organizationId,
      clientId: parsed.clientId,
      revenueContractId: parsed.revenueContractId,
      amountCents: requiredCents(parsed.amount),
      frequency: parsed.frequency,
      startDate: parseDateInput(parsed.startDate) ?? new Date(),
      endDate: optionalDate(parsed.endDate),
      nextExpectedDate: parseDateInput(parsed.nextExpectedDate) ?? new Date(),
      status: parsed.status
    }
  });
  await audit(context, "revenue.recurring.created", "RecurringRevenueSchedule", schedule.id, {
    amountCents: schedule.amountCents,
    frequency: schedule.frequency
  });
  revalidateRevenue();
}

export async function createAdjustmentAction(formData: FormData) {
  const context = await revenueContext("revenue.payments.manage");
  const parsed = adjustmentSchema.parse(Object.fromEntries(formData));
  const amountCents = requiredCents(parsed.amount);
  const effectiveDate = parseDateInput(parsed.effectiveDate);
  if (!effectiveDate) throw new Error("INVALID_EFFECTIVE_DATE");

  const adjustment = await prisma.revenueAdjustment.create({
    data: {
      organizationId: context.organizationId,
      clientId: parsed.clientId || null,
      invoiceId: parsed.invoiceId || null,
      paymentId: parsed.paymentId || null,
      revenueContractId: parsed.revenueContractId || null,
      adjustmentType: parsed.adjustmentType,
      amountCents,
      effectiveDate,
      reason: parsed.reason,
      createdById: context.userId
    }
  });
  await audit(context, "revenue.adjustment.created", "RevenueAdjustment", adjustment.id, {
    adjustmentType: adjustment.adjustmentType,
    amountCents
  });
  revalidateRevenue();
}

export async function createForecastSnapshotAction() {
  const context = await revenueContext("revenue.forecasts.manage");
  const data = await getRevenueCommandData(context);
  const snapshot = await prisma.revenueForecastSnapshot.create({
    data: {
      organizationId: context.organizationId,
      periodStart: data.period.start,
      periodEnd: data.period.end,
      worstCaseAmountCents: data.forecast.worstCaseAmountCents,
      expectedAmountCents: data.forecast.expectedAmountCents,
      bestCaseAmountCents: data.forecast.bestCaseAmountCents,
      contractedAmountCents: data.forecast.contractedAmountCents,
      expectedCashAmountCents: data.forecast.expectedCashAmountCents,
      overdueAmountCents: data.forecast.overdueAmountCents,
      mrrCents: data.forecast.mrrCents,
      assumptions: safeJson(data.forecast.assumptions)
    }
  });
  await audit(context, "revenue.forecast.created", "RevenueForecastSnapshot", snapshot.id, {
    expectedAmountCents: snapshot.expectedAmountCents
  });
  revalidateRevenue();
}

export async function createRevenuePriorityAction(formData: FormData) {
  const context = await revenueContext("revenue.view");
  const parsed = recommendationPrioritySchema.parse(Object.fromEntries(formData));
  const priority = await prisma.personalPriority.create({
    data: {
      organizationId: context.organizationId,
      userId: context.userId,
      title: parsed.title,
      description: parsed.reason,
      category: "revenue",
      priorityLevel: parsed.impactCents > 500000 ? "high" : "medium",
      urgency: "normal",
      timeframe: "today",
      estimatedRevenueImpact: parsed.impactCents
        ? new Prisma.Decimal(parsed.impactCents / 100)
        : null
    }
  });
  await audit(context, "revenue.priority.created", "PersonalPriority", priority.id, {
    entityType: parsed.entityType || null,
    entityId: parsed.entityId || null,
    impactCents: parsed.impactCents
  });
  revalidateRevenue();
}

async function assertClient(organizationId: string, clientId: string) {
  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId, archivedAt: null },
    select: { id: true }
  });
  if (!client) throw new Error("CLIENT_NOT_FOUND");
}

async function assertService(organizationId: string, serviceOfferingId: string) {
  const service = await prisma.serviceOffering.findFirst({
    where: { id: serviceOfferingId, organizationId },
    select: { id: true }
  });
  if (!service) throw new Error("SERVICE_NOT_FOUND");
}

async function assertContract(organizationId: string, contractId: string, clientId?: string) {
  const contract = await prisma.revenueContract.findFirst({
    where: { id: contractId, organizationId, clientId, archivedAt: null },
    select: { id: true }
  });
  if (!contract) throw new Error("CONTRACT_NOT_FOUND");
}

async function audit(
  context: { organizationId: string; userId: string },
  action: string,
  entityType: string,
  entityId: string | null,
  metadata?: Record<string, unknown>
) {
  await writeAuditEvent({
    organizationId: context.organizationId,
    actorUserId: context.userId,
    action,
    entityType,
    entityId,
    metadata: metadata ? (safeJson(metadata) as Prisma.InputJsonObject) : undefined
  });
}

function revalidateRevenue() {
  revalidatePath("/app");
  revalidatePath("/app/revenue");
}
