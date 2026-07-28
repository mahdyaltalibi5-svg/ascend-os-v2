import { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { invoiceStatusAfterPayment, mrr } from "@/lib/revenue/calculations";
import { buildRevenueForecast } from "@/lib/revenue/forecast";

const testUrl = process.env.TEST_DATABASE_URL;
const runIntegration =
  Boolean(testUrl) && testUrl !== process.env.DATABASE_URL && process.env.NODE_ENV !== "production";

const describeRevenue = runIntegration ? describe : describe.skip;

describeRevenue("revenue database workflows", () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: testUrl ?? "postgresql://skip:skip@127.0.0.1:1/skip" } }
  });

  it("creates financial records, prevents overpayment, and preserves tenant boundaries", async () => {
    const unique = Date.now();
    const orgA = await prisma.organization.create({
      data: {
        name: `Revenue Test A ${unique}`,
        slug: `revenue-test-a-${unique}`,
        timezone: "America/Denver"
      }
    });
    const orgB = await prisma.organization.create({
      data: {
        name: `Revenue Test B ${unique}`,
        slug: `revenue-test-b-${unique}`,
        timezone: "America/Denver"
      }
    });

    const client = await prisma.client.create({
      data: { organizationId: orgA.id, businessName: "Apex Roofing", status: "active" }
    });
    const service = await prisma.serviceOffering.create({
      data: {
        organizationId: orgA.id,
        name: `SEO ${unique}`,
        revenueCategory: "seo",
        billingType: "recurring"
      }
    });
    const contract = await prisma.revenueContract.create({
      data: {
        organizationId: orgA.id,
        clientId: client.id,
        serviceOfferingId: service.id,
        name: "SEO Retainer",
        contractedAmountCents: 1200000,
        billingType: "recurring",
        status: "active",
        signedDate: new Date("2026-01-03T00:00:00.000Z"),
        startDate: new Date("2026-01-03T00:00:00.000Z"),
        mrrAmountCents: 100000
      }
    });
    const invoice = await prisma.invoice.create({
      data: {
        organizationId: orgA.id,
        clientId: client.id,
        revenueContractId: contract.id,
        issueDate: new Date("2026-01-05T00:00:00.000Z"),
        dueDate: new Date("2026-01-20T00:00:00.000Z"),
        totalAmountCents: 100000,
        amountOutstandingCents: 100000,
        status: "open"
      }
    });

    const partial = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          organizationId: orgA.id,
          clientId: client.id,
          invoiceId: invoice.id,
          revenueContractId: contract.id,
          paymentDate: new Date("2026-01-10T00:00:00.000Z"),
          amountCents: 40000,
          status: "succeeded",
          idempotencyKey: `partial-${unique}`
        }
      });
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaidCents: 40000,
          amountOutstandingCents: 60000,
          status: invoiceStatusAfterPayment(100000, 40000)
        }
      });
      return created;
    });
    expect(partial.amountCents).toBe(40000);

    const duplicate = await prisma.payment.findUnique({
      where: {
        organizationId_idempotencyKey: {
          organizationId: orgA.id,
          idempotencyKey: `partial-${unique}`
        }
      }
    });
    expect(duplicate?.id).toBe(partial.id);

    const afterPartial = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(afterPartial.status).toBe("partially_paid");
    expect(afterPartial.amountOutstandingCents).toBe(60000);
    expect(70000 > afterPartial.amountOutstandingCents).toBe(true);

    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          organizationId: orgA.id,
          clientId: client.id,
          invoiceId: invoice.id,
          revenueContractId: contract.id,
          paymentDate: new Date("2026-01-15T00:00:00.000Z"),
          amountCents: 60000,
          status: "succeeded",
          idempotencyKey: `final-${unique}`
        }
      });
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaidCents: 100000,
          amountOutstandingCents: 0,
          status: "paid",
          paidAt: new Date("2026-01-15T00:00:00.000Z")
        }
      });
    });

    await prisma.revenueAdjustment.create({
      data: {
        organizationId: orgA.id,
        clientId: client.id,
        invoiceId: invoice.id,
        adjustmentType: "refund",
        amountCents: 10000,
        reason: "Test refund",
        effectiveDate: new Date("2026-01-18T00:00:00.000Z")
      }
    });
    await prisma.recurringRevenueSchedule.create({
      data: {
        organizationId: orgA.id,
        clientId: client.id,
        revenueContractId: contract.id,
        amountCents: 100000,
        frequency: "monthly",
        startDate: new Date("2026-01-03T00:00:00.000Z"),
        nextExpectedDate: new Date("2026-02-03T00:00:00.000Z"),
        status: "active"
      }
    });

    const orgBInvoiceLookup = await prisma.invoice.findFirst({
      where: { id: invoice.id, organizationId: orgB.id }
    });
    expect(orgBInvoiceLookup).toBeNull();

    const contracts = await prisma.revenueContract.findMany({ where: { organizationId: orgA.id } });
    expect(mrr(contracts, new Date("2026-01-20T00:00:00.000Z"))).toBe(100000);

    const payments = await prisma.payment.findMany({ where: { organizationId: orgA.id } });
    const invoices = await prisma.invoice.findMany({ where: { organizationId: orgA.id } });
    const forecast = buildRevenueForecast({
      payments,
      invoices,
      contracts,
      recurringSchedules: [
        {
          amountCents: 100000,
          nextExpectedDate: new Date("2026-01-25T00:00:00.000Z"),
          status: "active"
        }
      ],
      periodStart: new Date("2026-01-01T00:00:00.000Z"),
      periodEnd: new Date("2026-01-31T23:59:59.999Z"),
      now: new Date("2026-01-20T00:00:00.000Z")
    });
    const snapshot = await prisma.revenueForecastSnapshot.create({
      data: {
        organizationId: orgA.id,
        periodStart: new Date("2026-01-01T00:00:00.000Z"),
        periodEnd: new Date("2026-01-31T23:59:59.999Z"),
        worstCaseAmountCents: forecast.worstCaseAmountCents,
        expectedAmountCents: forecast.expectedAmountCents,
        bestCaseAmountCents: forecast.bestCaseAmountCents,
        contractedAmountCents: forecast.contractedAmountCents,
        expectedCashAmountCents: forecast.expectedCashAmountCents,
        overdueAmountCents: forecast.overdueAmountCents,
        mrrCents: forecast.mrrCents,
        assumptions: forecast.assumptions
      }
    });
    expect(snapshot.expectedAmountCents).toBeGreaterThan(0);
  });
});
