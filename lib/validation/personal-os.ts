import { z } from "zod";

import {
  goalMetricTypes,
  goalTypes,
  goalUnits,
  noteCategories,
  priorityCategories,
  priorityLevels,
  priorityTimeframes
} from "@/lib/personal-os/constants";

export const priorityUrgencies = ["low", "normal", "high", "critical"] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);

const optionalNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  return Number(value);
}, z.number().nonnegative().optional());

export const createPrioritySchema = z.object({
  title: z.string().trim().min(2).max(140),
  description: optionalText(1600),
  notes: optionalText(700),
  priorityLevel: z.enum(priorityLevels).default("medium"),
  urgency: z.enum(priorityUrgencies).default("normal"),
  category: z.enum(priorityCategories).default("other"),
  timeframe: z.enum(priorityTimeframes).default("today"),
  dueDate: optionalText(20),
  dueTime: optionalText(20),
  estimatedMinutes: optionalNumber,
  estimatedRevenueImpact: optionalNumber,
  pinned: z.boolean().default(false),
  sortOrder: z.coerce.number().int().default(0)
});

export const editPrioritySchema = createPrioritySchema.extend({
  id: z.string().cuid()
});

export const movePrioritySchema = z.object({
  id: z.string().cuid(),
  direction: z.enum(["up", "down"]),
  timeframe: z.enum(priorityTimeframes).optional()
});

export const createOperatingNoteSchema = z.object({
  title: optionalText(140),
  body: z.string().trim().min(2).max(2200),
  pinned: z.boolean().default(false),
  category: z.enum(noteCategories).default("idea"),
  tags: z.array(z.string().trim().min(1).max(32)).max(8).default([])
});

export const editOperatingNoteSchema = createOperatingNoteSchema.extend({
  id: z.string().cuid()
});

export const createFocusBlockSchema = z.object({
  title: z.string().trim().min(2).max(140),
  priorityId: optionalText(64),
  windowLabel: z.string().trim().min(2).max(100),
  intention: optionalText(700),
  startsAt: optionalText(40),
  plannedMinutes: z.coerce.number().int().min(5).max(720).default(60)
});

export const editFocusBlockSchema = createFocusBlockSchema.extend({
  id: z.string().cuid()
});

export const completeFocusBlockSchema = z.object({
  id: z.string().cuid(),
  completionNote: optionalText(700)
});

export const dailyPlanSchema = z.object({
  dailyIntention: optionalText(500),
  topOutcome1: optionalText(220),
  topOutcome2: optionalText(220),
  topOutcome3: optionalText(220),
  mainRisk: optionalText(500)
});

export const dailyReviewSchema = z.object({
  completionSummary: optionalText(900),
  progressMade: optionalText(700),
  timeWasted: optionalText(700),
  blockedBy: optionalText(700),
  carryForward: optionalText(700),
  removeTomorrow: optionalText(700),
  tomorrowFirstAction: optionalText(220),
  founderRating: z.coerce.number().int().min(1).max(10)
});

export const createGoalSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: optionalText(900),
  goalType: z.enum(goalTypes),
  category: z.enum(priorityCategories).default("other"),
  metricType: z.enum(goalMetricTypes).default("manual"),
  targetValue: z.coerce.number().positive(),
  currentValue: z.coerce.number().nonnegative().default(0),
  startDate: z.string().trim().min(8).max(20),
  endDate: z.string().trim().min(8).max(20),
  unit: z.enum(goalUnits).default("count")
});

export const updateGoalProgressSchema = z.object({
  id: z.string().cuid(),
  currentValue: z.coerce.number().nonnegative()
});

export const commandSchema = z.object({
  command: z.string().trim().min(2).max(500)
});

export const commandItemIdSchema = z.object({
  id: z.string().cuid()
});
