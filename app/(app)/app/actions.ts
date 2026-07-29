"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parsePersonalCommand } from "@/lib/personal-os/commands";
import { focusedMinutesBetween } from "@/lib/personal-os/focus";
import { parseDateInput } from "@/lib/personal-os/formatting";
import { formatMoney } from "@/lib/revenue/formatting";
import { monthPeriod, periodForGoal as revenuePeriodForGoal } from "@/lib/revenue/periods";
import { writeAuditEvent } from "@/lib/server/audit";
import { getCurrentSession } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { requireOrganizationContext } from "@/lib/server/organization";
import {
  commandItemIdSchema,
  commandSchema,
  completeFocusBlockSchema,
  createFocusBlockSchema,
  createGoalSchema,
  createOperatingNoteSchema,
  createPrioritySchema,
  dailyPlanSchema,
  dailyReviewSchema,
  editFocusBlockSchema,
  editOperatingNoteSchema,
  editPrioritySchema,
  movePrioritySchema,
  updateGoalProgressSchema
} from "@/lib/validation/personal-os";

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function boolValue(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function tagValues(formData: FormData) {
  return textValue(formData, "tags")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);
}

async function requirePersonalCommandContext() {
  const session = await getCurrentSession();
  if (!session?.user?.id) redirect("/signin");
  const context = await requireOrganizationContext(session.user.id);
  return {
    userId: session.user.id,
    organizationId: context.organization.id,
    timezone: context.organization.timezone,
    permissions: context.permissions
  };
}

export async function createPersonalPriorityAction(formData: FormData) {
  const context = await requirePersonalCommandContext();
  const parsed = createPrioritySchema.safeParse(priorityPayload(formData));
  if (!parsed.success) return;

  const priority = await prisma.personalPriority.create({
    data: {
      organizationId: context.organizationId,
      userId: context.userId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      notes: parsed.data.notes ?? null,
      urgency: urgencyFromLevel(parsed.data.priorityLevel),
      priorityLevel: parsed.data.priorityLevel,
      category: parsed.data.category,
      timeframe: parsed.data.timeframe,
      dueDate: parseDateInput(parsed.data.dueDate),
      dueTime: parsed.data.dueTime ?? null,
      estimatedMinutes: parsed.data.estimatedMinutes ?? null,
      estimatedRevenueImpact: parsed.data.estimatedRevenueImpact ?? null,
      pinned: parsed.data.pinned,
      sortOrder: await nextSortOrder(context.userId, context.organizationId, parsed.data.timeframe)
    }
  });

  await audit(context, "personal_priority.created", "PersonalPriority", priority.id, {
    priorityLevel: priority.priorityLevel,
    category: priority.category,
    timeframe: priority.timeframe
  });
  revalidatePath("/app");
}

export async function editPersonalPriorityAction(formData: FormData) {
  const context = await requirePersonalCommandContext();
  const parsed = editPrioritySchema.safeParse({
    id: textValue(formData, "id"),
    ...priorityPayload(formData)
  });
  if (!parsed.success) return;

  const priority = await findOwnedPriority(context, parsed.data.id);
  if (!priority) return;

  await prisma.personalPriority.update({
    where: { id: priority.id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      notes: parsed.data.notes ?? null,
      urgency: urgencyFromLevel(parsed.data.priorityLevel),
      priorityLevel: parsed.data.priorityLevel,
      category: parsed.data.category,
      timeframe: parsed.data.timeframe,
      dueDate: parseDateInput(parsed.data.dueDate),
      dueTime: parsed.data.dueTime ?? null,
      estimatedMinutes: parsed.data.estimatedMinutes ?? null,
      estimatedRevenueImpact: parsed.data.estimatedRevenueImpact ?? null,
      pinned: parsed.data.pinned
    }
  });

  await audit(context, "personal_priority.edited", "PersonalPriority", priority.id);
  revalidatePath("/app");
}

export async function completePersonalPriorityAction(formData: FormData) {
  await updatePriorityStatus(formData, "DONE", "personal_priority.completed", {
    completedAt: new Date()
  });
}

export async function reopenPersonalPriorityAction(formData: FormData) {
  await updatePriorityStatus(formData, "OPEN", "personal_priority.reopened", {
    completedAt: null,
    archivedAt: null
  });
}

export async function archivePersonalPriorityAction(formData: FormData) {
  await updatePriorityStatus(formData, "ARCHIVED", "personal_priority.archived", {
    archivedAt: new Date()
  });
}

export async function deletePersonalPriorityAction(formData: FormData) {
  const context = await requirePersonalCommandContext();
  const parsed = commandItemIdSchema.safeParse({ id: textValue(formData, "id") });
  if (!parsed.success) return;
  const priority = await findOwnedPriority(context, parsed.data.id);
  if (!priority) return;

  await prisma.personalPriority.update({
    where: { id: priority.id },
    data: { deletedAt: new Date(), archivedAt: new Date(), status: "ARCHIVED" }
  });
  await audit(context, "personal_priority.deleted", "PersonalPriority", priority.id);
  revalidatePath("/app");
}

export async function movePriorityAction(formData: FormData) {
  const context = await requirePersonalCommandContext();
  const parsed = movePrioritySchema.safeParse({
    id: textValue(formData, "id"),
    direction: textValue(formData, "direction"),
    timeframe: textValue(formData, "timeframe") || undefined
  });
  if (!parsed.success) return;
  const priority = await findOwnedPriority(context, parsed.data.id);
  if (!priority) return;
  const timeframe = parsed.data.timeframe ?? priority.timeframe;

  const list = await prisma.personalPriority.findMany({
    where: {
      organizationId: context.organizationId,
      userId: context.userId,
      status: "OPEN",
      deletedAt: null,
      archivedAt: null,
      timeframe
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
  });
  const index = list.findIndex((item) => item.id === priority.id);
  const swapWith = parsed.data.direction === "up" ? list[index - 1] : list[index + 1];
  if (!swapWith) return;

  await prisma.$transaction([
    prisma.personalPriority.update({
      where: { id: priority.id },
      data: { timeframe, sortOrder: swapWith.sortOrder }
    }),
    prisma.personalPriority.update({
      where: { id: swapWith.id },
      data: { sortOrder: priority.sortOrder }
    })
  ]);
  await audit(context, "personal_priority.reordered", "PersonalPriority", priority.id);
  revalidatePath("/app");
}

export async function carryForwardPrioritiesAction(formData: FormData) {
  const context = await requirePersonalCommandContext();
  const ids = formData
    .getAll("priorityId")
    .filter((value): value is string => typeof value === "string");
  if (!ids.length) return;

  await prisma.personalPriority.updateMany({
    where: {
      id: { in: ids },
      organizationId: context.organizationId,
      userId: context.userId,
      status: "OPEN",
      deletedAt: null
    },
    data: {
      timeframe: "today",
      carryoverCount: { increment: 1 }
    }
  });
  await audit(context, "personal_priority.carried_forward", "PersonalPriority", null, {
    count: ids.length
  });
  revalidatePath("/app");
}

export async function createOperatingNoteAction(formData: FormData) {
  const context = await requirePersonalCommandContext();
  const parsed = createOperatingNoteSchema.safeParse(notePayload(formData));
  if (!parsed.success) return;

  const note = await prisma.operatingNote.create({
    data: {
      organizationId: context.organizationId,
      userId: context.userId,
      title: parsed.data.title ?? null,
      body: parsed.data.body,
      pinned: parsed.data.pinned,
      category: parsed.data.category,
      tags: parsed.data.tags
    }
  });
  await audit(context, "operating_note.created", "OperatingNote", note.id, {
    category: note.category,
    pinned: note.pinned
  });
  revalidatePath("/app");
}

export async function editOperatingNoteAction(formData: FormData) {
  const context = await requirePersonalCommandContext();
  const parsed = editOperatingNoteSchema.safeParse({
    id: textValue(formData, "id"),
    ...notePayload(formData)
  });
  if (!parsed.success) return;
  const note = await findOwnedNote(context, parsed.data.id);
  if (!note) return;

  await prisma.operatingNote.update({
    where: { id: note.id },
    data: {
      title: parsed.data.title ?? null,
      body: parsed.data.body,
      pinned: parsed.data.pinned,
      category: parsed.data.category,
      tags: parsed.data.tags
    }
  });
  await audit(context, "operating_note.edited", "OperatingNote", note.id);
  revalidatePath("/app");
}

export async function archiveOperatingNoteAction(formData: FormData) {
  const context = await requirePersonalCommandContext();
  const parsed = commandItemIdSchema.safeParse({ id: textValue(formData, "id") });
  if (!parsed.success) return;
  const note = await findOwnedNote(context, parsed.data.id);
  if (!note) return;
  await prisma.operatingNote.update({ where: { id: note.id }, data: { archivedAt: new Date() } });
  await audit(context, "operating_note.archived", "OperatingNote", note.id);
  revalidatePath("/app");
}

export async function convertNoteToPriorityAction(formData: FormData) {
  const context = await requirePersonalCommandContext();
  const parsed = commandItemIdSchema.safeParse({ id: textValue(formData, "id") });
  if (!parsed.success) return;
  const note = await findOwnedNote(context, parsed.data.id);
  if (!note) return;

  const priority = await prisma.personalPriority.create({
    data: {
      organizationId: context.organizationId,
      userId: context.userId,
      title: note.title || note.body.slice(0, 100),
      description: note.body,
      priorityLevel: "medium",
      urgency: "normal",
      category: categoryToPriorityCategory(note.category),
      timeframe: "today",
      sortOrder: await nextSortOrder(context.userId, context.organizationId, "today")
    }
  });
  await prisma.operatingNote.update({
    where: { id: note.id },
    data: { convertedPriorityId: priority.id }
  });
  await audit(context, "operating_note.converted", "OperatingNote", note.id, {
    priorityId: priority.id
  });
  revalidatePath("/app");
}

export async function createFocusBlockAction(formData: FormData) {
  const context = await requirePersonalCommandContext();
  const parsed = createFocusBlockSchema.safeParse(focusPayload(formData));
  if (!parsed.success) return;
  const priorityId = await ownedPriorityIdOrNull(context, parsed.data.priorityId);

  const focusBlock = await prisma.focusBlock.create({
    data: {
      organizationId: context.organizationId,
      userId: context.userId,
      priorityId,
      title: parsed.data.title,
      windowLabel: parsed.data.windowLabel,
      intention: parsed.data.intention ?? null,
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
      plannedMinutes: parsed.data.plannedMinutes
    }
  });
  await audit(context, "focus_block.created", "FocusBlock", focusBlock.id, {
    plannedMinutes: focusBlock.plannedMinutes
  });
  revalidatePath("/app");
}

export async function editFocusBlockAction(formData: FormData) {
  const context = await requirePersonalCommandContext();
  const parsed = editFocusBlockSchema.safeParse({
    id: textValue(formData, "id"),
    ...focusPayload(formData)
  });
  if (!parsed.success) return;
  const block = await findOwnedFocusBlock(context, parsed.data.id);
  if (!block) return;
  const priorityId = await ownedPriorityIdOrNull(context, parsed.data.priorityId);

  await prisma.focusBlock.update({
    where: { id: block.id },
    data: {
      priorityId,
      title: parsed.data.title,
      windowLabel: parsed.data.windowLabel,
      intention: parsed.data.intention ?? null,
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
      plannedMinutes: parsed.data.plannedMinutes
    }
  });
  await audit(context, "focus_block.edited", "FocusBlock", block.id);
  revalidatePath("/app");
}

export async function startFocusBlockAction(formData: FormData) {
  const context = await requirePersonalCommandContext();
  const parsed = commandItemIdSchema.safeParse({ id: textValue(formData, "id") });
  if (!parsed.success) return;

  const started = await prisma.$transaction(async (tx) => {
    const active = await tx.focusBlock.findFirst({
      where: {
        organizationId: context.organizationId,
        userId: context.userId,
        status: "ACTIVE",
        id: { not: parsed.data.id }
      }
    });
    if (active) return null;

    const block = await tx.focusBlock.findFirst({
      where: { id: parsed.data.id, organizationId: context.organizationId, userId: context.userId }
    });
    if (!block || !["PLANNED", "PAUSED"].includes(block.status)) return null;

    return tx.focusBlock.update({
      where: { id: block.id },
      data: {
        status: "ACTIVE",
        actualStartAt: block.actualStartAt ?? new Date(),
        pausedAt: null
      }
    });
  });
  if (!started) return;
  await audit(context, "focus_block.started", "FocusBlock", started.id);
  revalidatePath("/app");
}

export async function pauseFocusBlockAction(formData: FormData) {
  const context = await requirePersonalCommandContext();
  const parsed = commandItemIdSchema.safeParse({ id: textValue(formData, "id") });
  if (!parsed.success) return;
  const block = await findOwnedFocusBlock(context, parsed.data.id);
  if (!block || block.status !== "ACTIVE") return;
  await prisma.focusBlock.update({
    where: { id: block.id },
    data: { status: "PAUSED", pausedAt: new Date(), interruptionCount: { increment: 1 } }
  });
  await audit(context, "focus_block.paused", "FocusBlock", block.id);
  revalidatePath("/app");
}

export async function completeFocusBlockAction(formData: FormData) {
  const context = await requirePersonalCommandContext();
  const parsed = completeFocusBlockSchema.safeParse({
    id: textValue(formData, "id"),
    completionNote: textValue(formData, "completionNote") || undefined
  });
  if (!parsed.success) return;
  const block = await findOwnedFocusBlock(context, parsed.data.id);
  if (!block) return;
  const now = new Date();
  const minutes = block.actualFocusedMinutes + focusedMinutesBetween(block.actualStartAt, now);

  await prisma.focusBlock.update({
    where: { id: block.id },
    data: {
      status: "DONE",
      actualEndAt: now,
      actualFocusedMinutes: minutes || block.plannedMinutes || 0,
      completionNote: parsed.data.completionNote ?? null
    }
  });
  await audit(context, "focus_block.completed", "FocusBlock", block.id, {
    actualFocusedMinutes: minutes || block.plannedMinutes || 0
  });
  revalidatePath("/app");
}

export async function cancelFocusBlockAction(formData: FormData) {
  const context = await requirePersonalCommandContext();
  const parsed = commandItemIdSchema.safeParse({ id: textValue(formData, "id") });
  if (!parsed.success) return;
  const block = await findOwnedFocusBlock(context, parsed.data.id);
  if (!block) return;
  await prisma.focusBlock.update({ where: { id: block.id }, data: { status: "CANCELLED" } });
  await audit(context, "focus_block.cancelled", "FocusBlock", block.id);
  revalidatePath("/app");
}

export async function duplicateFocusBlockAction(formData: FormData) {
  const context = await requirePersonalCommandContext();
  const parsed = commandItemIdSchema.safeParse({ id: textValue(formData, "id") });
  if (!parsed.success) return;
  const block = await findOwnedFocusBlock(context, parsed.data.id);
  if (!block) return;
  const copy = await prisma.focusBlock.create({
    data: {
      organizationId: context.organizationId,
      userId: context.userId,
      priorityId: block.priorityId,
      title: block.title,
      windowLabel: `${block.windowLabel} copy`,
      intention: block.intention,
      plannedMinutes: block.plannedMinutes,
      startsAt: block.startsAt
    }
  });
  await audit(context, "focus_block.duplicated", "FocusBlock", copy.id, { sourceId: block.id });
  revalidatePath("/app");
}

export async function startDailyPlanAction(formData: FormData) {
  const context = await requirePersonalCommandContext();
  const parsed = dailyPlanSchema.safeParse({
    dailyIntention: textValue(formData, "dailyIntention") || undefined,
    topOutcome1: textValue(formData, "topOutcome1") || undefined,
    topOutcome2: textValue(formData, "topOutcome2") || undefined,
    topOutcome3: textValue(formData, "topOutcome3") || undefined,
    mainRisk: textValue(formData, "mainRisk") || undefined
  });
  if (!parsed.success) return;
  const dateKey = textValue(formData, "dateKey");

  const plan = await prisma.dailyPlan.upsert({
    where: {
      organizationId_userId_dateKey: {
        organizationId: context.organizationId,
        userId: context.userId,
        dateKey
      }
    },
    update: { ...parsed.data, status: "STARTED", startedAt: new Date() },
    create: {
      organizationId: context.organizationId,
      userId: context.userId,
      dateKey,
      timezone: context.timezone,
      ...parsed.data,
      startedAt: new Date()
    }
  });
  await audit(context, "daily_plan.started", "DailyPlan", plan.id);
  revalidatePath("/app");
}

export async function submitDailyReviewAction(formData: FormData) {
  const context = await requirePersonalCommandContext();
  const parsed = dailyReviewSchema.safeParse({
    completionSummary: textValue(formData, "completionSummary") || undefined,
    progressMade: textValue(formData, "progressMade") || undefined,
    timeWasted: textValue(formData, "timeWasted") || undefined,
    blockedBy: textValue(formData, "blockedBy") || undefined,
    carryForward: textValue(formData, "carryForward") || undefined,
    removeTomorrow: textValue(formData, "removeTomorrow") || undefined,
    tomorrowFirstAction: textValue(formData, "tomorrowFirstAction") || undefined,
    founderRating: textValue(formData, "founderRating")
  });
  if (!parsed.success) return;
  const id = textValue(formData, "id");
  const plan = await prisma.dailyPlan.findFirst({
    where: { id, organizationId: context.organizationId, userId: context.userId }
  });
  if (!plan) return;
  await prisma.dailyPlan.update({
    where: { id: plan.id },
    data: { ...parsed.data, status: "COMPLETE", endedAt: new Date() }
  });
  await audit(context, "daily_review.completed", "DailyPlan", plan.id, {
    founderRating: parsed.data.founderRating
  });
  revalidatePath("/app");
}

export async function createGoalAction(formData: FormData) {
  const context = await requirePersonalCommandContext();
  const parsed = createGoalSchema.safeParse({
    title: textValue(formData, "title"),
    description: textValue(formData, "description") || undefined,
    goalType: textValue(formData, "goalType"),
    category: textValue(formData, "category") || "other",
    metricType: textValue(formData, "metricType") || "manual",
    targetValue: textValue(formData, "targetValue"),
    currentValue: textValue(formData, "currentValue") || 0,
    startDate: textValue(formData, "startDate"),
    endDate: textValue(formData, "endDate"),
    unit: textValue(formData, "unit") || "count"
  });
  if (!parsed.success) return;

  const goal = await prisma.goal.create({
    data: {
      organizationId: context.organizationId,
      userId: context.userId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      goalType: parsed.data.goalType,
      category: parsed.data.category,
      metricType: parsed.data.metricType,
      targetValue: parsed.data.targetValue,
      currentValue: parsed.data.currentValue,
      startDate: parseDateInput(parsed.data.startDate) ?? new Date(),
      endDate: parseDateInput(parsed.data.endDate) ?? new Date(),
      unit: parsed.data.unit,
      ownerId: context.userId
    }
  });
  await audit(context, "goal.created", "Goal", goal.id, {
    goalType: goal.goalType,
    unit: goal.unit
  });
  revalidatePath("/app");
}

export async function updateGoalProgressAction(formData: FormData) {
  const context = await requirePersonalCommandContext();
  const parsed = updateGoalProgressSchema.safeParse({
    id: textValue(formData, "id"),
    currentValue: textValue(formData, "currentValue")
  });
  if (!parsed.success) return;
  const goal = await prisma.goal.findFirst({
    where: { id: parsed.data.id, organizationId: context.organizationId, userId: context.userId }
  });
  if (!goal) return;
  const status = parsed.data.currentValue >= goal.targetValue.toNumber() ? "complete" : "active";
  await prisma.goal.update({
    where: { id: goal.id },
    data: {
      currentValue: parsed.data.currentValue,
      status,
      completedAt: status === "complete" ? new Date() : null
    }
  });
  await audit(context, status === "complete" ? "goal.completed" : "goal.updated", "Goal", goal.id);
  revalidatePath("/app");
}

export async function executeCommandAction(formData: FormData) {
  const context = await requirePersonalCommandContext();
  const parsed = commandSchema.safeParse({ command: textValue(formData, "command") });
  if (!parsed.success) return;
  const command = parsePersonalCommand(parsed.data.command);

  await executeParsedCommand(context, command);
  await audit(context, "command.executed", "Command", null, {
    kind: command.kind
  });
  revalidatePath("/app");
}

function priorityPayload(formData: FormData) {
  return {
    title: textValue(formData, "title"),
    description: textValue(formData, "description") || undefined,
    notes: textValue(formData, "notes") || undefined,
    priorityLevel: textValue(formData, "priorityLevel") || "medium",
    urgency: textValue(formData, "urgency") || "normal",
    category: textValue(formData, "category") || "other",
    timeframe: textValue(formData, "timeframe") || "today",
    dueDate: textValue(formData, "dueDate") || undefined,
    dueTime: textValue(formData, "dueTime") || undefined,
    estimatedMinutes: textValue(formData, "estimatedMinutes") || undefined,
    estimatedRevenueImpact: textValue(formData, "estimatedRevenueImpact") || undefined,
    pinned: boolValue(formData, "pinned"),
    sortOrder: textValue(formData, "sortOrder") || 0
  };
}

function notePayload(formData: FormData) {
  return {
    title: textValue(formData, "title") || undefined,
    body: textValue(formData, "body"),
    pinned: boolValue(formData, "pinned"),
    category: textValue(formData, "category") || "idea",
    tags: tagValues(formData)
  };
}

function focusPayload(formData: FormData) {
  return {
    title: textValue(formData, "title"),
    priorityId: textValue(formData, "priorityId") || undefined,
    windowLabel: textValue(formData, "windowLabel"),
    intention: textValue(formData, "intention") || undefined,
    startsAt: textValue(formData, "startsAt") || undefined,
    plannedMinutes: textValue(formData, "plannedMinutes") || 60
  };
}

async function updatePriorityStatus(
  formData: FormData,
  status: "OPEN" | "DONE" | "ARCHIVED",
  action: string,
  data: Record<string, unknown>
) {
  const context = await requirePersonalCommandContext();
  const parsed = commandItemIdSchema.safeParse({ id: textValue(formData, "id") });
  if (!parsed.success) return;
  const priority = await findOwnedPriority(context, parsed.data.id);
  if (!priority) return;
  await prisma.personalPriority.update({ where: { id: priority.id }, data: { status, ...data } });
  await audit(context, action, "PersonalPriority", priority.id);
  revalidatePath("/app");
}

async function executeParsedCommand(
  context: Awaited<ReturnType<typeof requirePersonalCommandContext>>,
  command: ReturnType<typeof parsePersonalCommand>
) {
  if (command.kind === "add_priority") {
    await prisma.personalPriority.create({
      data: {
        organizationId: context.organizationId,
        userId: context.userId,
        title: command.title,
        priorityLevel: command.priorityLevel,
        urgency: urgencyFromLevel(command.priorityLevel),
        timeframe: command.timeframe,
        sortOrder: await nextSortOrder(context.userId, context.organizationId, command.timeframe)
      }
    });
  } else if (command.kind === "save_note") {
    await prisma.operatingNote.create({
      data: {
        organizationId: context.organizationId,
        userId: context.userId,
        body: command.body,
        category: "idea"
      }
    });
  } else if (command.kind === "schedule_focus") {
    await prisma.focusBlock.create({
      data: {
        organizationId: context.organizationId,
        userId: context.userId,
        title: command.title,
        windowLabel: command.windowLabel,
        plannedMinutes: command.plannedMinutes
      }
    });
  } else if (command.kind === "complete_priority") {
    const matches = await prisma.personalPriority.findMany({
      where: {
        organizationId: context.organizationId,
        userId: context.userId,
        status: "OPEN",
        title: { contains: command.query, mode: "insensitive" }
      },
      take: 2
    });
    if (matches.length === 1) {
      await prisma.personalPriority.update({
        where: { id: matches[0].id },
        data: { status: "DONE", completedAt: new Date() }
      });
    }
  } else if (command.kind === "start_next_focus") {
    const next = await prisma.focusBlock.findFirst({
      where: {
        organizationId: context.organizationId,
        userId: context.userId,
        status: "PLANNED"
      },
      orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }]
    });
    if (next) {
      await prisma.$transaction(async (tx) => {
        const active = await tx.focusBlock.findFirst({
          where: {
            organizationId: context.organizationId,
            userId: context.userId,
            status: "ACTIVE"
          }
        });
        if (!active) {
          await tx.focusBlock.update({
            where: { id: next.id },
            data: { status: "ACTIVE", actualStartAt: new Date() }
          });
        }
      });
    }
  } else if (command.kind === "carry_forward") {
    await prisma.personalPriority.updateMany({
      where: {
        organizationId: context.organizationId,
        userId: context.userId,
        status: "OPEN",
        timeframe: { not: "today" }
      },
      data: { timeframe: "today", carryoverCount: { increment: 1 } }
    });
  } else if (command.kind === "create_goal") {
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);
    await prisma.goal.create({
      data: {
        organizationId: context.organizationId,
        userId: context.userId,
        title: command.title,
        goalType: command.goalType,
        unit: command.unit,
        metricType: command.unit,
        targetValue: command.targetValue,
        startDate: now,
        endDate: end,
        ownerId: context.userId
      }
    });
  } else if (command.kind === "revenue") {
    await executeRevenueCommand(context, command.command);
  } else if (command.kind === "sales") {
    await executeSalesCommand(context, command.command);
  }
}

async function executeRevenueCommand(
  context: Awaited<ReturnType<typeof requirePersonalCommandContext>>,
  command: Extract<ReturnType<typeof parsePersonalCommand>, { kind: "revenue" }>["command"]
) {
  const hasRevenueView = context.permissions.includes("revenue.view");
  if (!hasRevenueView) return;

  if (command.type === "set_goal") {
    if (!context.permissions.includes("revenue.goals.manage")) return;
    const period = revenuePeriodForGoal(command.period, new Date(), context.timezone);
    await prisma.revenueGoal.create({
      data: {
        organizationId: context.organizationId,
        ownerUserId: context.userId,
        name: "Monthly cash collected",
        goalPeriod: command.period,
        goalType: "cash_collected",
        startDate: period.start,
        endDate: period.end,
        targetAmountCents: command.amountCents,
        primary: true
      }
    });
    return;
  }

  if (command.type === "create_priority_largest_overdue") {
    const invoice = await prisma.invoice.findFirst({
      where: {
        organizationId: context.organizationId,
        status: { in: ["open", "partially_paid", "overdue"] },
        amountOutstandingCents: { gt: 0 },
        dueDate: { lt: new Date() },
        archivedAt: null
      },
      include: { client: true },
      orderBy: { amountOutstandingCents: "desc" }
    });
    if (invoice) {
      await prisma.personalPriority.create({
        data: {
          organizationId: context.organizationId,
          userId: context.userId,
          title: `Follow up on overdue invoice from ${invoice.client.businessName}`,
          description: `${formatMoney(invoice.amountOutstandingCents)} outstanding.`,
          category: "revenue",
          priorityLevel: "high",
          urgency: "high",
          timeframe: "today",
          estimatedRevenueImpact: invoice.amountOutstandingCents / 100
        }
      });
    }
    return;
  }

  if (
    command.type === "show_overdue" ||
    command.type === "show_expected" ||
    command.type === "goal_gap"
  ) {
    const period = monthPeriod(new Date(), context.timezone);
    const [invoices, goal, payments] = await Promise.all([
      prisma.invoice.findMany({
        where: { organizationId: context.organizationId, archivedAt: null },
        include: { client: true }
      }),
      prisma.revenueGoal.findFirst({
        where: {
          organizationId: context.organizationId,
          goalType: "cash_collected",
          startDate: { lte: period.end },
          endDate: { gte: period.start },
          status: "active"
        },
        orderBy: [{ primary: "desc" }, { updatedAt: "desc" }]
      }),
      prisma.payment.findMany({
        where: {
          organizationId: context.organizationId,
          status: "succeeded",
          paymentDate: { gte: period.start, lte: period.end }
        }
      })
    ]);
    const overdue = invoices
      .filter((invoice) => invoice.dueDate < new Date() && invoice.amountOutstandingCents > 0)
      .reduce((total, invoice) => total + invoice.amountOutstandingCents, 0);
    const expected = invoices.reduce((total, invoice) => total + invoice.amountOutstandingCents, 0);
    const collected = payments.reduce((total, payment) => total + payment.amountCents, 0);
    const gap = goal ? Math.max(0, goal.targetAmountCents - collected) : 0;
    await prisma.operatingNote.create({
      data: {
        organizationId: context.organizationId,
        userId: context.userId,
        category: "revenue",
        body:
          command.type === "show_overdue"
            ? `Revenue command result: ${formatMoney(overdue)} is overdue.`
            : command.type === "show_expected"
              ? `Revenue command result: ${formatMoney(expected)} is expected from open invoices.`
              : `Revenue command result: ${formatMoney(gap)} remains to the monthly cash goal.`
      }
    });
    return;
  }

  await prisma.operatingNote.create({
    data: {
      organizationId: context.organizationId,
      userId: context.userId,
      category: "revenue",
      body: "Revenue command needs confirmation before writing financial records. Open Revenue Command Center to review and submit the form."
    }
  });
}

async function executeSalesCommand(
  context: Awaited<ReturnType<typeof requirePersonalCommandContext>>,
  command: Extract<ReturnType<typeof parsePersonalCommand>, { kind: "sales" }>["command"]
) {
  if (
    !context.permissions.some((permission) =>
      ["prospects.view_own", "prospects.view_all", "sales.reports.view"].includes(permission)
    )
  ) {
    return;
  }

  const all = context.permissions.includes("prospects.view_all");
  const prospectWhere = {
    organizationId: context.organizationId,
    archivedAt: null,
    ...(all ? {} : { assignedUserId: context.userId })
  };

  if (command.type === "create_priority") {
    await prisma.personalPriority.create({
      data: {
        organizationId: context.organizationId,
        userId: context.userId,
        title: command.title,
        category: "sales",
        priorityLevel: "high",
        urgency: "high",
        timeframe: "today",
        sortOrder: await nextSortOrder(context.userId, context.organizationId, "today")
      }
    });
    return;
  }

  if (command.type === "callable_count") {
    const count = await prisma.prospect.count({
      where: {
        ...prospectWhere,
        status: {
          in: ["ready", "assigned", "attempting_contact", "connected", "qualified", "nurture"]
        }
      }
    });
    await createSalesCommandNote(
      context,
      `Sales command result: ${count} callable prospects are available.`
    );
    return;
  }

  if (command.type === "hot_no_attempts") {
    const count = await prisma.prospect.count({
      where: {
        ...prospectWhere,
        priority: { in: ["critical", "hot"] },
        attemptCount: 0
      }
    });
    await createSalesCommandNote(
      context,
      `Sales command result: ${count} Hot prospects have no attempts.`
    );
    return;
  }

  if (command.type === "overdue_followups") {
    const count = await prisma.followUp.count({
      where: {
        organizationId: context.organizationId,
        status: "open",
        dueAt: { lt: new Date() },
        archivedAt: null,
        ...(all ? {} : { assignedUserId: context.userId })
      }
    });
    await createSalesCommandNote(context, `Sales command result: ${count} follow-ups are overdue.`);
  }
}

async function createSalesCommandNote(
  context: Awaited<ReturnType<typeof requirePersonalCommandContext>>,
  body: string
) {
  await prisma.operatingNote.create({
    data: {
      organizationId: context.organizationId,
      userId: context.userId,
      category: "sales",
      body
    }
  });
}

async function nextSortOrder(userId: string, organizationId: string, timeframe: string) {
  const last = await prisma.personalPriority.findFirst({
    where: { userId, organizationId, timeframe, deletedAt: null },
    orderBy: { sortOrder: "desc" }
  });
  return (last?.sortOrder ?? 0) + 10;
}

function urgencyFromLevel(level: string) {
  if (level === "critical") return "critical";
  if (level === "high") return "high";
  if (level === "low") return "low";
  return "normal";
}

async function findOwnedPriority(
  context: Awaited<ReturnType<typeof requirePersonalCommandContext>>,
  id: string
) {
  return prisma.personalPriority.findFirst({
    where: { id, organizationId: context.organizationId, userId: context.userId, deletedAt: null }
  });
}

async function findOwnedNote(
  context: Awaited<ReturnType<typeof requirePersonalCommandContext>>,
  id: string
) {
  return prisma.operatingNote.findFirst({
    where: { id, organizationId: context.organizationId, userId: context.userId, archivedAt: null }
  });
}

async function findOwnedFocusBlock(
  context: Awaited<ReturnType<typeof requirePersonalCommandContext>>,
  id: string
) {
  return prisma.focusBlock.findFirst({
    where: { id, organizationId: context.organizationId, userId: context.userId, archivedAt: null }
  });
}

async function ownedPriorityIdOrNull(
  context: Awaited<ReturnType<typeof requirePersonalCommandContext>>,
  id?: string
) {
  if (!id) return null;
  const priority = await findOwnedPriority(context, id);
  return priority?.id ?? null;
}

function categoryToPriorityCategory(category: string) {
  if (category === "client") return "fulfillment";
  if (category === "financial") return "finance";
  if (category === "process") return "operations";
  if (category === "idea") return "other";
  return category;
}

async function audit(
  context: Awaited<ReturnType<typeof requirePersonalCommandContext>>,
  action: string,
  entityType: string,
  entityId?: string | null,
  metadata?: Record<string, string | number | boolean | null>
) {
  await writeAuditEvent({
    organizationId: context.organizationId,
    actorUserId: context.userId,
    action,
    entityType,
    entityId,
    metadata
  });
}
