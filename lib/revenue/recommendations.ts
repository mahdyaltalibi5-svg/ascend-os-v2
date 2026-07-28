import { forecastGap } from "@/lib/revenue/calculations";

export type RevenueRecommendation = {
  id: string;
  title: string;
  reason: string;
  urgency: "low" | "medium" | "high";
  estimatedImpactCents: number;
  entityType?: string;
  entityId?: string;
  clientName?: string;
  score: number;
};

export type RecommendationInput = {
  overdueInvoices: Array<{
    id: string;
    amountOutstandingCents: number;
    dueDate: Date;
    client: { businessName: string };
  }>;
  partiallyPaidInvoices: Array<{
    id: string;
    amountOutstandingCents: number;
    client: { businessName: string };
  }>;
  signedContractsWithoutInvoices: Array<{
    id: string;
    name: string;
    contractedAmountCents: number;
    client: { businessName: string };
  }>;
  recurringEndingSoon: Array<{
    id: string;
    amountCents: number;
    nextExpectedDate: Date;
    client: { businessName: string };
  }>;
  goalTargetCents?: number;
  expectedForecastCents: number;
  now: Date;
};

export function buildRevenueRecommendations(input: RecommendationInput): RevenueRecommendation[] {
  const recommendations: RevenueRecommendation[] = [];

  for (const invoice of input.overdueInvoices) {
    const daysOverdue = Math.max(
      1,
      Math.floor((input.now.getTime() - invoice.dueDate.getTime()) / (24 * 60 * 60 * 1000))
    );
    recommendations.push({
      id: `overdue-${invoice.id}`,
      title: `Follow up on ${invoice.client.businessName}'s overdue invoice`,
      reason: `${daysOverdue} days overdue with collectible cash outstanding.`,
      urgency: daysOverdue >= 7 ? "high" : "medium",
      estimatedImpactCents: invoice.amountOutstandingCents,
      entityType: "Invoice",
      entityId: invoice.id,
      clientName: invoice.client.businessName,
      score: invoice.amountOutstandingCents + daysOverdue * 1500
    });
  }

  for (const invoice of input.partiallyPaidInvoices) {
    recommendations.push({
      id: `partial-${invoice.id}`,
      title: `Close the remaining balance for ${invoice.client.businessName}`,
      reason: "Invoice is partially paid and still has an outstanding balance.",
      urgency: "medium",
      estimatedImpactCents: invoice.amountOutstandingCents,
      entityType: "Invoice",
      entityId: invoice.id,
      clientName: invoice.client.businessName,
      score: invoice.amountOutstandingCents + 3000
    });
  }

  for (const contract of input.signedContractsWithoutInvoices) {
    recommendations.push({
      id: `uninvoiced-${contract.id}`,
      title: `Send invoice for ${contract.name}`,
      reason: "Signed contract has no invoice recorded yet.",
      urgency: "high",
      estimatedImpactCents: contract.contractedAmountCents,
      entityType: "RevenueContract",
      entityId: contract.id,
      clientName: contract.client.businessName,
      score: contract.contractedAmountCents + 8000
    });
  }

  for (const schedule of input.recurringEndingSoon) {
    recommendations.push({
      id: `recurring-${schedule.id}`,
      title: `Confirm upcoming recurring payment from ${schedule.client.businessName}`,
      reason: "Recurring revenue is expected soon and should stay on track.",
      urgency: "medium",
      estimatedImpactCents: schedule.amountCents,
      entityType: "RecurringRevenueSchedule",
      entityId: schedule.id,
      clientName: schedule.client.businessName,
      score: schedule.amountCents + 2500
    });
  }

  if (input.goalTargetCents) {
    const gap = forecastGap(input.goalTargetCents, input.expectedForecastCents);
    if (gap > 0) {
      recommendations.push({
        id: "goal-gap",
        title: "Close the monthly revenue gap",
        reason: "Expected revenue is still below the active cash-collected goal.",
        urgency: gap > input.goalTargetCents * 0.25 ? "high" : "medium",
        estimatedImpactCents: gap,
        entityType: "RevenueGoal",
        score: gap + 5000
      });
    }
  }

  return recommendations.sort((a, b) => b.score - a.score).slice(0, 8);
}
