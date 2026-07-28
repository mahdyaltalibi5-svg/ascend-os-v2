export const priorityLevels = ["critical", "high", "medium", "low"] as const;

export const priorityCategories = [
  "revenue",
  "sales",
  "fulfillment",
  "operations",
  "finance",
  "personal_brand",
  "product",
  "team",
  "personal",
  "other"
] as const;

export const priorityTimeframes = ["today", "week", "later"] as const;

export const noteCategories = [
  "decision",
  "idea",
  "lesson",
  "problem",
  "client",
  "sales",
  "financial",
  "product",
  "personal_brand",
  "process",
  "other"
] as const;

export const goalTypes = ["daily", "weekly", "monthly", "quarterly"] as const;
export const goalUnits = ["currency", "count", "percentage", "hours", "binary"] as const;
export const goalMetricTypes = [
  "manual",
  "currency",
  "count",
  "percentage",
  "hours",
  "binary"
] as const;

export const focusStatuses = [
  "PLANNED",
  "ACTIVE",
  "PAUSED",
  "DONE",
  "SKIPPED",
  "CANCELLED"
] as const;

export const notificationTypes = [
  "critical_due_today",
  "priority_overdue",
  "focus_starting_soon",
  "weekly_goal_behind",
  "monthly_goal_behind",
  "daily_plan_not_started",
  "daily_review_not_completed",
  "repeated_carryover",
  "long_running_focus"
] as const;

export type PriorityLevel = (typeof priorityLevels)[number];
export type PriorityCategory = (typeof priorityCategories)[number];
export type PriorityTimeframe = (typeof priorityTimeframes)[number];
export type NoteCategory = (typeof noteCategories)[number];
export type GoalType = (typeof goalTypes)[number];
export type GoalUnit = (typeof goalUnits)[number];
export type FocusStatus = (typeof focusStatuses)[number];
export type NotificationType = (typeof notificationTypes)[number];
