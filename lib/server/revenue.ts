import { Prisma } from "@prisma/client";

import {
  averageClientValue,
  cashCollected,
  contractedRevenue,
  expectedCash,
  goalProgress,
  mrr,
  newMrr,
  outstandingAmount,
  overdueAmount,
  refundTotal
} from "@/lib/revenue/calculations";
import { labelByValue } from "@/lib/revenue/constants";
import { buildRevenueForecast } from "@/lib/revenue/forecast";
import { buildRevenueNotifications } from "@/lib/revenue/notifications";
import { buildRevenueRecommendations } from "@/lib/revenue/recommendations";
import { monthPeriod } from "@/lib/revenue/periods";
import { prisma } from "@/lib/server/db";

export type RevenueCommandData = Awaited<ReturnType<typeof getRevenueCommandData>>;

export async function getRevenueCommandData(input: {
  organizationId: string;
  userId: string;
  timezone: string;
}) {
  const now = new Date();
  const period = monthPeriod(now, input.timezone);
  const soon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const [
    goals,
    clients,
    serviceOfferings,
    contracts,
    invoices,
    payments,
    recurringSchedules,
    adjustments,
    snapshots,
    persistedNotifications,
    recentActivity
  ] = await prisma.$transaction([
    prisma.revenueGoal.findMany({
      where: {
        organizationId: input.organizationId,
        status: "active",
        startDate: { lte: period.end },
        endDate: { gte: period.start }
      },
      orderBy: [{ primary: "desc" }, { updatedAt: "desc" }],
      take: 8
    }),
    prisma.client.findMany({
      where: { organizationId: input.organizationId, archivedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 100
    }),
    prisma.serviceOffering.findMany({
      where: { organizationId: input.organizationId },
      orderBy: [{ active: "desc" }, { name: "asc" }]
    }),
    prisma.revenueContract.findMany({
      where: { organizationId: input.organizationId, archivedAt: null },
      include: { client: true, serviceOffering: true, invoices: true },
      orderBy: { updatedAt: "desc" },
      take: 100
    }),
    prisma.invoice.findMany({
      where: { organizationId: input.organizationId, archivedAt: null },
      include: { client: true, contract: true },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      take: 150
    }),
    prisma.payment.findMany({
      where: {
        organizationId: input.organizationId,
        paymentDate: { gte: period.start, lte: period.end }
      },
      include: { client: true, invoice: true },
      orderBy: { paymentDate: "desc" },
      take: 150
    }),
    prisma.recurringRevenueSchedule.findMany({
      where: { organizationId: input.organizationId },
      include: { client: true, contract: true },
      orderBy: { nextExpectedDate: "asc" },
      take: 100
    }),
    prisma.revenueAdjustment.findMany({
      where: {
        organizationId: input.organizationId,
        effectiveDate: { gte: period.start, lte: period.end }
      },
      include: { client: true, invoice: true, payment: true, contract: true },
      orderBy: { effectiveDate: "desc" },
      take: 100
    }),
    prisma.revenueForecastSnapshot.findMany({
      where: { organizationId: input.organizationId },
      orderBy: { createdAt: "desc" },
      take: 8
    }),
    prisma.inAppNotification.findMany({
      where: {
        organizationId: input.organizationId,
        userId: input.userId,
        dismissedAt: null,
        type: { startsWith: "revenue." }
      },
      orderBy: { createdAt: "desc" },
      take: 12
    }),
    prisma.auditEvent.findMany({
      where: {
        organizationId: input.organizationId,
        action: { startsWith: "revenue." }
      },
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ]);

  const primaryGoal =
    goals.find((goal) => goal.goalType === "cash_collected" && goal.primary) ??
    goals.find((goal) => goal.goalType === "cash_collected") ??
    null;
  const collectedCents = cashCollected(payments, period.start, period.end);
  const contractedCents = contractedRevenue(contracts, period.start, period.end);
  const outstandingCents = outstandingAmount(invoices);
  const overdueCents = overdueAmount(invoices, now);
  const expectedCents = expectedCash(invoices, period.start, period.end);
  const mrrCents = mrr(contracts, now);
  const newMrrCents = newMrr(contracts, period.start, period.end);
  const refundCents = refundTotal(adjustments, period.start, period.end);
  const activeClients = clients.filter((client) => client.status === "active").length;
  const progress = primaryGoal
    ? goalProgress({
        targetAmountCents: primaryGoal.targetAmountCents,
        actualAmountCents: collectedCents,
        periodStart: primaryGoal.startDate,
        periodEnd: primaryGoal.endDate,
        now
      })
    : null;

  const forecast = buildRevenueForecast({
    payments,
    invoices,
    contracts,
    recurringSchedules,
    periodStart: period.start,
    periodEnd: period.end,
    now
  });

  const overdueInvoices = invoices.filter(
    (invoice) =>
      invoice.dueDate < now &&
      !["paid", "void", "uncollectible", "archived"].includes(invoice.status)
  );
  const partiallyPaidInvoices = invoices.filter((invoice) => invoice.status === "partially_paid");
  const signedContractsWithoutInvoices = contracts.filter(
    (contract) =>
      ["signed", "active"].includes(contract.status) &&
      contract.invoices.length === 0 &&
      contract.contractedAmountCents > 0
  );
  const recurringEndingSoon = recurringSchedules.filter(
    (schedule) =>
      schedule.status === "active" &&
      schedule.nextExpectedDate >= now &&
      schedule.nextExpectedDate <= soon
  );

  const recommendations = buildRevenueRecommendations({
    overdueInvoices,
    partiallyPaidInvoices,
    signedContractsWithoutInvoices,
    recurringEndingSoon,
    goalTargetCents: primaryGoal?.targetAmountCents,
    expectedForecastCents: forecast.expectedAmountCents,
    now
  });
  const generatedNotifications = buildRevenueNotifications({
    existingKeys: persistedNotifications.map(notificationKey),
    invoices,
    recurringSchedules,
    goalBehind: progress?.status === "behind",
    now
  });

  return {
    now,
    period,
    goals,
    primaryGoal,
    clients,
    serviceOfferings,
    contracts,
    invoices,
    payments,
    recurringSchedules,
    adjustments,
    snapshots,
    forecast,
    recommendations,
    notifications: [
      ...persistedNotifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        type: notification.type,
        entityType: notification.entityType,
        entityId: notification.entityId
      })),
      ...generatedNotifications
    ],
    scorecards: {
      collectedCents,
      contractedCents,
      expectedCents,
      mrrCents,
      newMrrCents,
      outstandingCents,
      overdueCents,
      averageClientValueCents: averageClientValue(contractedCents, activeClients),
      activeClients,
      refundCents
    },
    progress,
    attention: {
      overdueInvoices,
      partiallyPaidInvoices,
      signedContractsWithoutInvoices,
      recurringEndingSoon,
      clientsWithUnpaidBalances: clients
        .map((client) => ({
          client,
          amountCents: invoices
            .filter((invoice) => invoice.clientId === client.id)
            .reduce((total, invoice) => total + invoice.amountOutstandingCents, 0)
        }))
        .filter((item) => item.amountCents > 0)
        .slice(0, 10)
    },
    composition: buildComposition({ clients, contracts, invoices, payments }),
    timeline: buildTimeline({
      invoices,
      payments,
      recurringSchedules,
      periodStart: period.start,
      periodEnd: period.end
    }),
    recentActivity
  };
}

export async function getRevenueSummary(input: {
  organizationId: string;
  userId: string;
  timezone: string;
}) {
  const data = await getRevenueCommandData(input);
  return {
    primaryGoal: data.primaryGoal,
    scorecards: data.scorecards,
    progress: data.progress,
    topRecommendation: data.recommendations[0] ?? null,
    forecast: data.forecast
  };
}

function notificationKey(notification: { type: string; entityId: string | null; createdAt: Date }) {
  return `${notification.type}.${notification.entityId ?? notification.createdAt.toISOString().slice(0, 10)}`;
}

function buildComposition(input: {
  clients: Array<{ id: string; businessName: string; source: string | null }>;
  contracts: Array<{
    clientId: string;
    serviceOffering: { name: string; revenueCategory: string } | null;
    billingType: string;
    contractedAmountCents: number;
  }>;
  invoices: Array<{ clientId: string; amountOutstandingCents: number }>;
  payments: Array<{
    clientId: string;
    amountCents: number;
    paymentMethod: string | null;
    status: string;
  }>;
}) {
  return {
    byService: sumBy(
      input.contracts,
      (contract) => contract.serviceOffering?.name ?? "Unassigned service",
      (contract) => contract.contractedAmountCents
    ),
    byClient: sumBy(
      input.payments.filter((payment) => payment.status === "succeeded"),
      (payment) =>
        input.clients.find((client) => client.id === payment.clientId)?.businessName ??
        "Unknown client",
      (payment) => payment.amountCents
    ),
    byBillingType: sumBy(
      input.contracts,
      (contract) => labelByValue[contract.billingType] ?? contract.billingType,
      (contract) => contract.contractedAmountCents
    ),
    byPaymentMethod: sumBy(
      input.payments.filter((payment) => payment.status === "succeeded"),
      (payment) => labelByValue[payment.paymentMethod ?? "other"] ?? "Other",
      (payment) => payment.amountCents
    ),
    bySource: sumBy(
      input.clients,
      (client) => client.source || "Unspecified",
      (client) =>
        input.invoices
          .filter((invoice) => invoice.clientId === client.id)
          .reduce((total, invoice) => total + invoice.amountOutstandingCents, 0)
    )
  };
}

function buildTimeline(input: {
  invoices: Array<{
    id: string;
    dueDate: Date;
    amountOutstandingCents: number;
    status: string;
    client: { businessName: string };
  }>;
  payments: Array<{
    id: string;
    paymentDate: Date;
    amountCents: number;
    status: string;
    client: { businessName: string };
  }>;
  recurringSchedules: Array<{
    id: string;
    nextExpectedDate: Date;
    amountCents: number;
    status: string;
    client: { businessName: string };
  }>;
  periodStart: Date;
  periodEnd: Date;
}) {
  const rows = [
    ...input.payments
      .filter((payment) => payment.status === "succeeded")
      .map((payment) => ({
        id: `payment-${payment.id}`,
        date: payment.paymentDate,
        label: `Payment from ${payment.client.businessName}`,
        amountCents: payment.amountCents,
        kind: "collected"
      })),
    ...input.invoices
      .filter((invoice) => !["paid", "void", "uncollectible", "archived"].includes(invoice.status))
      .map((invoice) => ({
        id: `invoice-${invoice.id}`,
        date: invoice.dueDate,
        label: `Invoice due from ${invoice.client.businessName}`,
        amountCents: invoice.amountOutstandingCents,
        kind: "invoice_due"
      })),
    ...input.recurringSchedules
      .filter((schedule) => schedule.status === "active")
      .map((schedule) => ({
        id: `recurring-${schedule.id}`,
        date: schedule.nextExpectedDate,
        label: `Recurring revenue from ${schedule.client.businessName}`,
        amountCents: schedule.amountCents,
        kind: "recurring"
      }))
  ];

  return rows
    .filter((row) => row.date >= input.periodStart && row.date <= input.periodEnd)
    .sort((left, right) => left.date.getTime() - right.date.getTime())
    .slice(0, 30);
}

function sumBy<T>(rows: T[], label: (row: T) => string, value: (row: T) => number) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const key = label(row);
    totals.set(key, (totals.get(key) ?? 0) + value(row));
  }
  return Array.from(totals.entries())
    .map(([name, amountCents]) => ({ name, amountCents }))
    .filter((row) => row.amountCents > 0)
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, 8);
}

export function safeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
