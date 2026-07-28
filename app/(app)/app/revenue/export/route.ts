import { NextResponse } from "next/server";

import { toCsv } from "@/lib/revenue/csv";
import { formatMoney } from "@/lib/revenue/formatting";
import { getCurrentSession } from "@/lib/server/auth";
import { requirePermission } from "@/lib/server/organization";
import { prisma } from "@/lib/server/db";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  const context = await requirePermission(session.user.id, "revenue.view");
  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "payments";
  const organizationId = context.organization.id;

  const csv =
    type === "clients"
      ? await clientsCsv(organizationId)
      : type === "invoices"
        ? await invoicesCsv(organizationId)
        : type === "contracts"
          ? await contractsCsv(organizationId)
          : type === "recurring"
            ? await recurringCsv(organizationId)
            : type === "forecasts"
              ? await forecastsCsv(organizationId)
              : await paymentsCsv(organizationId);

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="ascend-${type}.csv"`
    }
  });
}

async function paymentsCsv(organizationId: string) {
  const rows = await prisma.payment.findMany({
    where: { organizationId },
    include: { client: true, invoice: true },
    orderBy: { paymentDate: "desc" },
    take: 1000
  });
  return toCsv(
    rows.map((row) => ({
      date: row.paymentDate.toISOString().slice(0, 10),
      client: row.client.businessName,
      invoice: row.invoice?.invoiceNumber ?? "",
      amount: formatMoney(row.amountCents, true),
      status: row.status,
      method: row.paymentMethod ?? ""
    }))
  );
}

async function invoicesCsv(organizationId: string) {
  const rows = await prisma.invoice.findMany({
    where: { organizationId },
    include: { client: true },
    orderBy: { dueDate: "desc" },
    take: 1000
  });
  return toCsv(
    rows.map((row) => ({
      invoice: row.invoiceNumber ?? row.id,
      client: row.client.businessName,
      issueDate: row.issueDate.toISOString().slice(0, 10),
      dueDate: row.dueDate.toISOString().slice(0, 10),
      total: formatMoney(row.totalAmountCents, true),
      paid: formatMoney(row.amountPaidCents, true),
      outstanding: formatMoney(row.amountOutstandingCents, true),
      status: row.status
    }))
  );
}

async function clientsCsv(organizationId: string) {
  const rows = await prisma.client.findMany({
    where: { organizationId },
    orderBy: { businessName: "asc" },
    take: 1000
  });
  return toCsv(
    rows.map((row) => ({
      businessName: row.businessName,
      contactName: row.contactName ?? "",
      contactEmail: row.contactEmail ?? "",
      contactPhone: row.contactPhone ?? "",
      status: row.status,
      source: row.source ?? ""
    }))
  );
}

async function contractsCsv(organizationId: string) {
  const rows = await prisma.revenueContract.findMany({
    where: { organizationId },
    include: { client: true, serviceOffering: true },
    orderBy: { updatedAt: "desc" },
    take: 1000
  });
  return toCsv(
    rows.map((row) => ({
      name: row.name,
      client: row.client.businessName,
      service: row.serviceOffering?.name ?? "",
      amount: formatMoney(row.contractedAmountCents, true),
      billingType: row.billingType,
      status: row.status,
      mrr: row.mrrAmountCents ? formatMoney(row.mrrAmountCents, true) : ""
    }))
  );
}

async function recurringCsv(organizationId: string) {
  const rows = await prisma.recurringRevenueSchedule.findMany({
    where: { organizationId },
    include: { client: true, contract: true },
    orderBy: { nextExpectedDate: "asc" },
    take: 1000
  });
  return toCsv(
    rows.map((row) => ({
      client: row.client.businessName,
      contract: row.contract.name,
      amount: formatMoney(row.amountCents, true),
      frequency: row.frequency,
      nextExpectedDate: row.nextExpectedDate.toISOString().slice(0, 10),
      status: row.status
    }))
  );
}

async function forecastsCsv(organizationId: string) {
  const rows = await prisma.revenueForecastSnapshot.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 1000
  });
  return toCsv(
    rows.map((row) => ({
      createdAt: row.createdAt.toISOString(),
      periodStart: row.periodStart.toISOString().slice(0, 10),
      periodEnd: row.periodEnd.toISOString().slice(0, 10),
      worstCase: formatMoney(row.worstCaseAmountCents, true),
      expected: formatMoney(row.expectedAmountCents, true),
      bestCase: formatMoney(row.bestCaseAmountCents, true),
      mrr: formatMoney(row.mrrCents, true)
    }))
  );
}
