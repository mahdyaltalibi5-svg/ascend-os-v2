import {
  cashCollected,
  contractedRevenue,
  expectedCash,
  mrr,
  overdueAmount,
  type RevenueContractInput,
  type RevenueInvoiceInput,
  type RevenuePaymentInput
} from "@/lib/revenue/calculations";

export type RevenueForecastInput = {
  payments: RevenuePaymentInput[];
  invoices: RevenueInvoiceInput[];
  contracts: RevenueContractInput[];
  recurringSchedules: Array<{
    amountCents: number;
    nextExpectedDate: Date;
    status: string;
  }>;
  periodStart: Date;
  periodEnd: Date;
  now: Date;
};

export function buildRevenueForecast(input: RevenueForecastInput) {
  const collected = cashCollected(input.payments, input.periodStart, input.periodEnd);
  const openInvoiceCash = expectedCash(input.invoices, input.periodStart, input.periodEnd);
  const overdue = overdueAmount(input.invoices, input.now);
  const recurringExpected = input.recurringSchedules
    .filter(
      (schedule) =>
        schedule.status === "active" &&
        schedule.nextExpectedDate >= input.periodStart &&
        schedule.nextExpectedDate <= input.periodEnd
    )
    .reduce((total, schedule) => total + schedule.amountCents, 0);
  const signedUninvoiced = input.contracts
    .filter((contract) => ["signed", "active"].includes(contract.status))
    .reduce((total, contract) => total + Math.max(0, contract.contractedAmountCents), 0);

  const worstCaseAmountCents = collected + Math.round(openInvoiceCash * 0.35);
  const expectedAmountCents = collected + Math.round(openInvoiceCash * 0.7) + recurringExpected;
  const bestCaseAmountCents = collected + openInvoiceCash + recurringExpected + signedUninvoiced;

  return {
    worstCaseAmountCents,
    expectedAmountCents,
    bestCaseAmountCents,
    contractedAmountCents: contractedRevenue(input.contracts, input.periodStart, input.periodEnd),
    expectedCashAmountCents: openInvoiceCash + recurringExpected,
    overdueAmountCents: overdue,
    mrrCents: mrr(input.contracts, input.now),
    assumptions: [
      `${collected} cents are already collected in this period.`,
      "Open invoices are weighted conservatively for worst case and at 70% for expected case.",
      `${recurringExpected} cents of active recurring revenue falls inside this period.`,
      "Pipeline opportunities are excluded until a manual contract, invoice, or expectation exists."
    ]
  };
}
