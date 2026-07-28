export const revenueGoalTypes = [
  "cash_collected",
  "contracted_revenue",
  "mrr",
  "new_mrr",
  "recognized_revenue"
] as const;

export const revenueGoalPeriods = ["monthly", "quarterly", "annual"] as const;

export const clientStatuses = [
  "prospect",
  "active",
  "paused",
  "completed",
  "churned",
  "archived"
] as const;

export const billingTypes = [
  "one_time",
  "recurring",
  "payment_plan",
  "usage_based",
  "other"
] as const;

export const contractStatuses = [
  "draft",
  "pending",
  "signed",
  "active",
  "completed",
  "cancelled",
  "lost",
  "archived"
] as const;

export const invoiceStatuses = [
  "draft",
  "open",
  "partially_paid",
  "paid",
  "overdue",
  "void",
  "uncollectible",
  "archived"
] as const;

export const paymentStatuses = [
  "pending",
  "succeeded",
  "failed",
  "refunded",
  "partially_refunded",
  "cancelled"
] as const;

export const paymentMethods = [
  "stripe",
  "ach",
  "card",
  "check",
  "cash",
  "wire",
  "bank_transfer",
  "other"
] as const;

export const recurringFrequencies = ["monthly", "quarterly", "annual", "custom"] as const;

export const recurringStatuses = ["active", "paused", "cancelled", "completed"] as const;

export const adjustmentTypes = [
  "correction",
  "refund",
  "write_off",
  "credit",
  "fee",
  "other"
] as const;

export const serviceCategories = [
  "website",
  "seo",
  "gbp_management",
  "ai_automation",
  "software",
  "consulting",
  "other"
] as const;

export const defaultServiceOfferings = [
  { name: "Website", revenueCategory: "website", billingType: "one_time" },
  { name: "SEO", revenueCategory: "seo", billingType: "recurring" },
  { name: "GBP Management", revenueCategory: "gbp_management", billingType: "recurring" },
  { name: "AI Automation", revenueCategory: "ai_automation", billingType: "one_time" },
  { name: "Software", revenueCategory: "software", billingType: "recurring" },
  { name: "Consulting", revenueCategory: "consulting", billingType: "one_time" },
  { name: "Other", revenueCategory: "other", billingType: "other" }
] as const;

export const labelByValue: Record<string, string> = {
  cash_collected: "Cash collected",
  contracted_revenue: "Contracted revenue",
  mrr: "MRR",
  new_mrr: "New MRR",
  recognized_revenue: "Recognized revenue",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
  prospect: "Prospect",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  churned: "Churned",
  archived: "Archived",
  one_time: "One-time",
  recurring: "Recurring",
  payment_plan: "Payment plan",
  usage_based: "Usage-based",
  other: "Other",
  draft: "Draft",
  pending: "Pending",
  signed: "Signed",
  cancelled: "Cancelled",
  lost: "Lost",
  open: "Open",
  partially_paid: "Partially paid",
  paid: "Paid",
  overdue: "Overdue",
  void: "Void",
  uncollectible: "Uncollectible",
  succeeded: "Succeeded",
  failed: "Failed",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
  stripe: "Stripe",
  ach: "ACH",
  card: "Card",
  check: "Check",
  cash: "Cash",
  wire: "Wire",
  bank_transfer: "Bank transfer",
  custom: "Custom",
  correction: "Correction",
  refund: "Refund",
  write_off: "Write-off",
  credit: "Credit",
  fee: "Fee",
  website: "Website",
  seo: "SEO",
  gbp_management: "GBP Management",
  ai_automation: "AI Automation",
  software: "Software",
  consulting: "Consulting"
};
