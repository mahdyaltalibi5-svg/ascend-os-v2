import { z } from "zod";

export const priorityUrgencies = ["low", "normal", "high", "critical"] as const;

export const createPrioritySchema = z.object({
  title: z.string().trim().min(2).max(120),
  notes: z.string().trim().max(700).optional(),
  urgency: z.enum(priorityUrgencies).default("normal")
});

export const createOperatingNoteSchema = z.object({
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(2).max(1400),
  pinned: z.boolean().default(false)
});

export const createFocusBlockSchema = z.object({
  title: z.string().trim().min(2).max(120),
  windowLabel: z.string().trim().min(2).max(80),
  intention: z.string().trim().max(500).optional()
});

export const commandItemIdSchema = z.object({
  id: z.string().cuid()
});
