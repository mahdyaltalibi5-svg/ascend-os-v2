import { describe, expect, it } from "vitest";

import {
  cashCollected,
  expectedCash,
  goalProgress,
  invoiceStatusAfterPayment,
  mrr,
  newMrr,
  outstandingAmount,
  overdueAmount,
  refundTotal
} from "@/lib/revenue/calculations";
import { parseRevenueCommand } from "@/lib/revenue/commands";
import { toCsv } from "@/lib/revenue/csv";
import { buildRevenueForecast } from "@/lib/revenue/forecast";
import { parseMoneyToCents } from "@/lib/revenue/formatting";
import { buildRevenueNotifications } from "@/lib/revenue/notifications";
import { monthPeriod } from "@/lib/revenue/periods";
import { buildRevenueRecommendations } from "@/lib/revenue/recommendations";
import {
  clientSchema,
  invoiceSchema,
  paymentSchema,
  revenueGoalSchema
} from "@/lib/validation/revenue";

const jan1 = new Date("2026-01-01T00:00:00.000Z");
const jan10 = new Date("2026-01-10T00:00:00.000Z");
const jan15 = new Date("2026-01-15T00:00:00.000Z");
const jan31 = new Date("2026-01-31T23:59:59.999Z");

describe("revenue core", () => {
  it("parses and preserves money as minor units", () => {
    expect(parseMoneyToCents("$2,500.25")).toBe(250025);
    expect(parseMoneyToCents("1200")).toBe(120000);
    expect(parseMoneyToCents("12.999")).toBeNull();
  });

  it("calculates cash, outstanding, overdue, partial payment state, and refunds", () => {
    const payments = [
      { paymentDate: jan10, amountCents: 50000, status: "succeeded" },
      { paymentDate: jan10, amountCents: 25000, status: "failed" },
      { paymentDate: jan10, amountCents: 30000, status: "succeeded", refundedAmountCents: 10000 }
    ];
    const invoices = [
      {
        dueDate: jan1,
        totalAmountCents: 100000,
        amountPaidCents: 40000,
        amountOutstandingCents: 60000,
        status: "partially_paid"
      },
      {
        dueDate: jan31,
        totalAmountCents: 50000,
        amountPaidCents: 0,
        amountOutstandingCents: 50000,
        status: "open"
      }
    ];

    expect(cashCollected(payments, jan1, jan31)).toBe(70000);
    expect(outstandingAmount(invoices)).toBe(110000);
    expect(overdueAmount(invoices, jan15)).toBe(60000);
    expect(expectedCash(invoices, jan1, jan31)).toBe(110000);
    expect(invoiceStatusAfterPayment(100000, 40000)).toBe("partially_paid");
    expect(invoiceStatusAfterPayment(100000, 100000)).toBe("paid");
    expect(
      refundTotal(
        [{ amountCents: 15000, adjustmentType: "refund", effectiveDate: jan10 }],
        jan1,
        jan31
      )
    ).toBe(15000);
  });

  it("calculates MRR, new MRR, goal progress, and pace", () => {
    const contracts = [
      {
        contractedAmountCents: 1200000,
        mrrAmountCents: 100000,
        signedDate: jan10,
        startDate: jan1,
        endDate: null,
        status: "active",
        billingType: "recurring"
      },
      {
        contractedAmountCents: 500000,
        mrrAmountCents: null,
        signedDate: jan10,
        startDate: jan1,
        endDate: null,
        status: "signed",
        billingType: "one_time"
      }
    ];

    expect(mrr(contracts, jan15)).toBe(100000);
    expect(newMrr(contracts, jan1, jan31)).toBe(100000);
    const progress = goalProgress({
      targetAmountCents: 1000000,
      actualAmountCents: 250000,
      periodStart: jan1,
      periodEnd: jan31,
      now: jan10
    });
    expect(progress.remainingAmountCents).toBe(750000);
    expect(progress.progressPercent).toBe(25);
    expect(progress.requiredDailyPaceCents).toBeGreaterThan(0);
  });

  it("builds forecast cases and assumptions from stored inputs", () => {
    const forecast = buildRevenueForecast({
      payments: [{ paymentDate: jan10, amountCents: 100000, status: "succeeded" }],
      invoices: [
        {
          dueDate: jan15,
          totalAmountCents: 100000,
          amountPaidCents: 0,
          amountOutstandingCents: 100000,
          status: "open"
        }
      ],
      contracts: [
        {
          contractedAmountCents: 200000,
          mrrAmountCents: 50000,
          signedDate: jan10,
          startDate: jan1,
          endDate: null,
          status: "signed",
          billingType: "recurring"
        }
      ],
      recurringSchedules: [{ amountCents: 50000, nextExpectedDate: jan15, status: "active" }],
      periodStart: jan1,
      periodEnd: jan31,
      now: jan10
    });

    expect(forecast.worstCaseAmountCents).toBeLessThan(forecast.expectedAmountCents);
    expect(forecast.bestCaseAmountCents).toBeGreaterThan(forecast.expectedAmountCents);
    expect(forecast.assumptions.length).toBeGreaterThan(2);
  });

  it("ranks recommendations and deduplicates notifications", () => {
    const recommendations = buildRevenueRecommendations({
      overdueInvoices: [
        {
          id: "inv-1",
          amountOutstandingCents: 200000,
          dueDate: jan1,
          client: { businessName: "Apex" }
        }
      ],
      partiallyPaidInvoices: [],
      signedContractsWithoutInvoices: [
        {
          id: "contract-1",
          name: "Website",
          contractedAmountCents: 500000,
          client: { businessName: "Beta" }
        }
      ],
      recurringEndingSoon: [],
      goalTargetCents: 1000000,
      expectedForecastCents: 400000,
      now: jan15
    });
    expect(recommendations[0].estimatedImpactCents).toBeGreaterThanOrEqual(500000);

    const notifications = buildRevenueNotifications({
      existingKeys: ["revenue.invoice.overdue.inv-1"],
      invoices: [
        {
          id: "inv-1",
          dueDate: jan1,
          amountOutstandingCents: 200000,
          status: "open",
          client: { businessName: "Apex" }
        }
      ],
      recurringSchedules: [],
      goalBehind: true,
      now: jan15
    });
    expect(notifications.some((notification) => notification.type === "revenue.goal.behind")).toBe(
      true
    );
    expect(notifications.some((notification) => notification.entityId === "inv-1")).toBe(false);
  });

  it("handles timezone month boundaries, CSV, commands, and validation", () => {
    expect(monthPeriod(new Date("2026-01-31T23:30:00.000Z"), "America/Denver").label).toBe(
      "2026-01"
    );
    expect(toCsv([{ client: "Apex, Inc.", amount: "$1,000" }])).toContain('"Apex, Inc."');
    expect(parseRevenueCommand("Set this month's cash goal to $50,000")).toMatchObject({
      type: "set_goal",
      amountCents: 5000000
    });
    expect(parseRevenueCommand("Show overdue invoices")).toMatchObject({ type: "show_overdue" });
    expect(revenueGoalSchema.safeParse({ name: "", targetAmount: "100" }).success).toBe(false);
    expect(clientSchema.safeParse({ businessName: "Apex" }).success).toBe(true);
    expect(
      invoiceSchema.safeParse({
        clientId: "client",
        totalAmount: "1000",
        issueDate: "2026-01-01",
        dueDate: "2026-01-15",
        status: "open"
      }).success
    ).toBe(true);
    expect(
      paymentSchema.safeParse({
        clientId: "client",
        amount: "1000",
        paymentDate: "2026-01-15",
        status: "succeeded"
      }).success
    ).toBe(true);
  });
});
