import { clampCents } from "@/lib/revenue/formatting";
import { daysBetweenInclusive, elapsedDays, remainingDays } from "@/lib/revenue/periods";

export type RevenuePaymentInput = {
  paymentDate: Date;
  amountCents: number;
  status: string;
  isRefunded?: boolean;
  refundedAmountCents?: number;
};

export type RevenueInvoiceInput = {
  dueDate: Date;
  totalAmountCents: number;
  amountPaidCents: number;
  amountOutstandingCents: number;
  status: string;
  archivedAt?: Date | null;
};

export type RevenueContractInput = {
  contractedAmountCents: number;
  mrrAmountCents?: number | null;
  signedDate?: Date | null;
  startDate?: Date | null;
  endDate?: Date | null;
  status: string;
  billingType: string;
  archivedAt?: Date | null;
};

export type RevenueAdjustmentInput = {
  amountCents: number;
  adjustmentType: string;
  effectiveDate: Date;
};

export type GoalProgressInput = {
  targetAmountCents: number;
  actualAmountCents: number;
  periodStart: Date;
  periodEnd: Date;
  now: Date;
};

export function isWithinPeriod(date: Date, start: Date, end: Date) {
  return date >= start && date <= end;
}

export function cashCollected(payments: RevenuePaymentInput[], start: Date, end: Date) {
  return payments
    .filter(
      (payment) => payment.status === "succeeded" && isWithinPeriod(payment.paymentDate, start, end)
    )
    .reduce(
      (total, payment) => total + payment.amountCents - (payment.refundedAmountCents ?? 0),
      0
    );
}

export function refundTotal(adjustments: RevenueAdjustmentInput[], start: Date, end: Date) {
  return adjustments
    .filter(
      (adjustment) =>
        ["refund", "write_off", "credit"].includes(adjustment.adjustmentType) &&
        isWithinPeriod(adjustment.effectiveDate, start, end)
    )
    .reduce((total, adjustment) => total + adjustment.amountCents, 0);
}

export function contractedRevenue(contracts: RevenueContractInput[], start: Date, end: Date) {
  return contracts
    .filter(
      (contract) =>
        !contract.archivedAt &&
        ["signed", "active", "completed"].includes(contract.status) &&
        contract.signedDate &&
        isWithinPeriod(contract.signedDate, start, end)
    )
    .reduce((total, contract) => total + contract.contractedAmountCents, 0);
}

export function outstandingAmount(invoices: RevenueInvoiceInput[]) {
  return invoices
    .filter(
      (invoice) =>
        !invoice.archivedAt &&
        !["paid", "void", "uncollectible", "archived"].includes(invoice.status)
    )
    .reduce((total, invoice) => total + invoice.amountOutstandingCents, 0);
}

export function overdueAmount(invoices: RevenueInvoiceInput[], now: Date) {
  return invoices
    .filter(
      (invoice) =>
        !invoice.archivedAt &&
        invoice.dueDate < now &&
        !["paid", "void", "uncollectible", "archived"].includes(invoice.status)
    )
    .reduce((total, invoice) => total + invoice.amountOutstandingCents, 0);
}

export function expectedCash(invoices: RevenueInvoiceInput[], start: Date, end: Date) {
  return invoices
    .filter(
      (invoice) =>
        !invoice.archivedAt &&
        isWithinPeriod(invoice.dueDate, start, end) &&
        !["paid", "void", "uncollectible", "archived"].includes(invoice.status)
    )
    .reduce((total, invoice) => total + invoice.amountOutstandingCents, 0);
}

export function mrr(contracts: RevenueContractInput[], asOf: Date) {
  return contracts
    .filter(
      (contract) =>
        !contract.archivedAt &&
        contract.billingType === "recurring" &&
        ["signed", "active"].includes(contract.status) &&
        (!contract.startDate || contract.startDate <= asOf) &&
        (!contract.endDate || contract.endDate >= asOf)
    )
    .reduce((total, contract) => total + (contract.mrrAmountCents ?? 0), 0);
}

export function newMrr(contracts: RevenueContractInput[], start: Date, end: Date) {
  return contracts
    .filter(
      (contract) =>
        !contract.archivedAt &&
        contract.billingType === "recurring" &&
        ["signed", "active"].includes(contract.status) &&
        contract.signedDate &&
        isWithinPeriod(contract.signedDate, start, end)
    )
    .reduce((total, contract) => total + (contract.mrrAmountCents ?? 0), 0);
}

export function churnedMrr(contracts: RevenueContractInput[], start: Date, end: Date) {
  return contracts
    .filter(
      (contract) =>
        !contract.archivedAt &&
        contract.billingType === "recurring" &&
        ["cancelled", "lost"].includes(contract.status) &&
        contract.endDate &&
        isWithinPeriod(contract.endDate, start, end)
    )
    .reduce((total, contract) => total + (contract.mrrAmountCents ?? 0), 0);
}

export function averageClientValue(contractedCents: number, activeClientCount: number) {
  if (activeClientCount <= 0) return 0;
  return Math.round(contractedCents / activeClientCount);
}

export function goalProgress(input: GoalProgressInput) {
  const remainingAmountCents = clampCents(input.targetAmountCents - input.actualAmountCents);
  const elapsed = elapsedDays(input.periodStart, input.now, input.periodEnd);
  const remaining = remainingDays(input.now, input.periodEnd);
  const totalDays = daysBetweenInclusive(input.periodStart, input.periodEnd);
  const progressPercent =
    input.targetAmountCents <= 0 ? 0 : (input.actualAmountCents / input.targetAmountCents) * 100;
  const requiredDailyPaceCents =
    remaining <= 0 ? remainingAmountCents : Math.ceil(remainingAmountCents / remaining);
  const currentDailyPaceCents = elapsed <= 0 ? 0 : Math.floor(input.actualAmountCents / elapsed);
  const expectedByTodayCents = Math.floor((input.targetAmountCents / totalDays) * elapsed);
  const paceDeltaCents = input.actualAmountCents - expectedByTodayCents;
  const status = paceDeltaCents >= 0 ? "on_track" : "behind";

  return {
    remainingAmountCents,
    elapsedDays: elapsed,
    remainingDays: remaining,
    totalDays,
    progressPercent,
    requiredDailyPaceCents,
    currentDailyPaceCents,
    paceDeltaCents,
    status
  };
}

export function forecastGap(targetAmountCents: number, expectedAmountCents: number) {
  return clampCents(targetAmountCents - expectedAmountCents);
}

export function invoiceStatusAfterPayment(totalAmountCents: number, paidAmountCents: number) {
  if (paidAmountCents <= 0) return "open";
  if (paidAmountCents >= totalAmountCents) return "paid";
  return "partially_paid";
}
