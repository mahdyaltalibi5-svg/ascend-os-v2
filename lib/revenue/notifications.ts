export type RevenueNotificationInput = {
  existingKeys: string[];
  invoices: Array<{
    id: string;
    dueDate: Date;
    amountOutstandingCents: number;
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
  goalBehind: boolean;
  now: Date;
};

export type RevenueNotification = {
  dedupeKey: string;
  type: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
};

export function buildRevenueNotifications(input: RevenueNotificationInput) {
  const seen = new Set(input.existingKeys);
  const notifications: RevenueNotification[] = [];
  const dayMs = 24 * 60 * 60 * 1000;

  function add(notification: RevenueNotification) {
    if (seen.has(notification.dedupeKey)) return;
    seen.add(notification.dedupeKey);
    notifications.push(notification);
  }

  for (const invoice of input.invoices) {
    if (["paid", "void", "uncollectible", "archived"].includes(invoice.status)) continue;
    const daysUntilDue = Math.ceil((invoice.dueDate.getTime() - input.now.getTime()) / dayMs);
    if (daysUntilDue < 0) {
      add({
        dedupeKey: `revenue.invoice.overdue.${invoice.id}`,
        type: "revenue.invoice.overdue",
        title: "Invoice overdue",
        body: `${invoice.client.businessName} has an overdue invoice balance.`,
        entityType: "Invoice",
        entityId: invoice.id
      });
    } else if (daysUntilDue <= 3) {
      add({
        dedupeKey: `revenue.invoice.due-soon.${invoice.id}`,
        type: "revenue.invoice.due_soon",
        title: "Invoice due soon",
        body: `${invoice.client.businessName} has an invoice due within ${daysUntilDue} days.`,
        entityType: "Invoice",
        entityId: invoice.id
      });
    }
  }

  for (const schedule of input.recurringSchedules) {
    const daysUntilExpected = Math.ceil(
      (schedule.nextExpectedDate.getTime() - input.now.getTime()) / dayMs
    );
    if (schedule.status === "active" && daysUntilExpected >= 0 && daysUntilExpected <= 3) {
      add({
        dedupeKey: `revenue.recurring.expected.${schedule.id}.${schedule.nextExpectedDate.toISOString().slice(0, 10)}`,
        type: "revenue.recurring.expected",
        title: "Expected recurring payment",
        body: `${schedule.client.businessName} has recurring revenue expected soon.`,
        entityType: "RecurringRevenueSchedule",
        entityId: schedule.id
      });
    }
  }

  if (input.goalBehind) {
    add({
      dedupeKey: `revenue.goal.behind.${input.now.toISOString().slice(0, 10)}`,
      type: "revenue.goal.behind",
      title: "Revenue pace behind",
      body: "The active revenue goal is behind pace for the current period.",
      entityType: "RevenueGoal"
    });
  }

  return notifications;
}
