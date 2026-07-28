import type {
  DailyPlan,
  FocusBlock,
  Goal,
  InAppNotification,
  PersonalPriority
} from "@prisma/client";

import { buildRecommendation } from "@/lib/personal-os/recommendations";
import {
  dateKeyForTimeZone,
  daysRemaining,
  progressPercentage
} from "@/lib/personal-os/formatting";
import { generateNotifications } from "@/lib/personal-os/notifications";
import { prisma } from "@/lib/server/db";

export type PersonalCommandData = Awaited<ReturnType<typeof getPersonalCommandData>>;

type PriorityWithFocus = PersonalPriority & {
  focusBlocks: FocusBlock[];
};

export async function getPersonalCommandData(input: {
  userId: string;
  organizationId: string;
  timezone: string;
}) {
  const now = new Date();
  const todayKey = dateKeyForTimeZone(now, input.timezone);
  const todayStart = new Date(`${todayKey}T00:00:00.000`);
  const todayEnd = new Date(`${todayKey}T23:59:59.999`);

  const [
    priorities,
    completedToday,
    notes,
    focusBlocks,
    goals,
    todayPlan,
    recentPlans,
    persistedNotifications,
    recentActivity
  ] = await prisma.$transaction([
    prisma.personalPriority.findMany({
      where: {
        organizationId: input.organizationId,
        userId: input.userId,
        deletedAt: null,
        archivedAt: null,
        status: { in: ["OPEN", "DONE"] }
      },
      include: { focusBlocks: true },
      orderBy: [
        { pinned: "desc" },
        { timeframe: "asc" },
        { sortOrder: "asc" },
        { createdAt: "desc" }
      ],
      take: 60
    }),
    prisma.personalPriority.findMany({
      where: {
        organizationId: input.organizationId,
        userId: input.userId,
        status: "DONE",
        completedAt: { gte: todayStart, lte: todayEnd }
      },
      orderBy: { completedAt: "desc" },
      take: 10
    }),
    prisma.operatingNote.findMany({
      where: {
        organizationId: input.organizationId,
        userId: input.userId,
        archivedAt: null
      },
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
      take: 18
    }),
    prisma.focusBlock.findMany({
      where: {
        organizationId: input.organizationId,
        userId: input.userId,
        archivedAt: null,
        status: { in: ["PLANNED", "ACTIVE", "PAUSED", "DONE"] }
      },
      orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
      take: 30
    }),
    prisma.goal.findMany({
      where: {
        organizationId: input.organizationId,
        userId: input.userId,
        archivedAt: null,
        status: { in: ["active", "complete"] }
      },
      orderBy: [{ goalType: "asc" }, { endDate: "asc" }],
      take: 16
    }),
    prisma.dailyPlan.findUnique({
      where: {
        organizationId_userId_dateKey: {
          organizationId: input.organizationId,
          userId: input.userId,
          dateKey: todayKey
        }
      }
    }),
    prisma.dailyPlan.findMany({
      where: {
        organizationId: input.organizationId,
        userId: input.userId
      },
      orderBy: { dateKey: "desc" },
      take: 7
    }),
    prisma.inAppNotification.findMany({
      where: {
        organizationId: input.organizationId,
        userId: input.userId,
        dismissedAt: null
      },
      orderBy: { createdAt: "desc" },
      take: 12
    }),
    prisma.auditEvent.findMany({
      where: {
        organizationId: input.organizationId,
        actorUserId: input.userId,
        action: {
          in: [
            "personal_priority.created",
            "personal_priority.edited",
            "personal_priority.completed",
            "personal_priority.reopened",
            "personal_priority.archived",
            "focus_block.created",
            "focus_block.started",
            "focus_block.completed",
            "daily_plan.started",
            "daily_review.completed",
            "goal.created",
            "goal.updated",
            "goal.completed",
            "operating_note.created",
            "operating_note.converted",
            "command.executed"
          ]
        }
      },
      orderBy: { createdAt: "desc" },
      take: 12
    })
  ]);

  const openPriorities = priorities.filter((priority) => priority.status === "OPEN");
  const recommendation = buildRecommendation({
    priorities: openPriorities,
    goals,
    remainingFocusMinutes: focusSummary(focusBlocks).remainingFocusMinutes,
    now
  });
  const generatedNotifications = generateNotifications({
    priorities: openPriorities,
    focusBlocks,
    goals,
    hasDailyPlan: Boolean(todayPlan),
    dailyPlanEnded: Boolean(todayPlan?.endedAt),
    now
  });

  return {
    todayKey,
    timezone: input.timezone,
    priorities: {
      today: sortPriorities(openPriorities.filter((priority) => priority.timeframe === "today")),
      week: sortPriorities(openPriorities.filter((priority) => priority.timeframe === "week")),
      later: sortPriorities(openPriorities.filter((priority) => priority.timeframe === "later")),
      completedToday
    },
    allOpenPriorities: sortPriorities(openPriorities),
    overduePriorities: openPriorities.filter(
      (priority) => priority.dueDate && priority.dueDate < todayStart
    ),
    notes: {
      pinned: notes.filter((note) => note.pinned).slice(0, 5),
      recent: notes.slice(0, 8),
      decisions: notes.filter((note) => note.category === "decision").slice(0, 5),
      problems: notes.filter((note) => note.category === "problem").slice(0, 5),
      lessons: notes.filter((note) => note.category === "lesson").slice(0, 5)
    },
    focus: focusSummary(focusBlocks),
    goals: {
      weekly: goals.find((goal) => goal.goalType === "weekly" && goal.status === "active") ?? null,
      monthly:
        goals.find((goal) => goal.goalType === "monthly" && goal.status === "active") ?? null,
      all: goals.map(goalView)
    },
    todayPlan,
    recentPlans,
    recommendation,
    notifications: mergeNotifications(persistedNotifications, generatedNotifications),
    scorecard: buildScorecard({
      completedToday,
      openPriorities,
      focusBlocks,
      goals,
      overdueCount: openPriorities.filter(
        (priority) => priority.dueDate && priority.dueDate < todayStart
      ).length,
      recentPlans
    }),
    recentActivity
  };
}

function sortPriorities(priorities: PriorityWithFocus[]) {
  const levelRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  return [...priorities].sort((left, right) => {
    if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
    if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
    const levelDelta = (levelRank[right.priorityLevel] ?? 0) - (levelRank[left.priorityLevel] ?? 0);
    return levelDelta || right.createdAt.getTime() - left.createdAt.getTime();
  });
}

function focusSummary(focusBlocks: FocusBlock[]) {
  const today = focusBlocks.filter(
    (block) => block.status !== "CANCELLED" && block.status !== "SKIPPED"
  );
  const plannedFocusMinutes = today.reduce(
    (total, block) => total + (block.plannedMinutes ?? 0),
    0
  );
  const completedFocusMinutes = today.reduce(
    (total, block) => total + (block.actualFocusedMinutes ?? 0),
    0
  );
  const activeBlock =
    today.find((block) => block.status === "ACTIVE") ??
    today.find((block) => block.status === "PAUSED") ??
    null;
  const nextBlock = today.find((block) => block.status === "PLANNED") ?? null;
  const remainingFocusMinutes = Math.max(0, plannedFocusMinutes - completedFocusMinutes);

  return {
    all: today,
    activeBlock,
    nextBlock,
    plannedFocusMinutes,
    completedFocusMinutes,
    remainingFocusMinutes,
    focusCompletionPercentage: plannedFocusMinutes
      ? Math.round((completedFocusMinutes / plannedFocusMinutes) * 100)
      : 0
  };
}

function buildScorecard(input: {
  completedToday: PersonalPriority[];
  openPriorities: PersonalPriority[];
  focusBlocks: FocusBlock[];
  goals: Goal[];
  overdueCount: number;
  recentPlans: DailyPlan[];
}) {
  const focus = focusSummary(input.focusBlocks);
  const weekly = input.goals.find((goal) => goal.goalType === "weekly" && goal.status === "active");
  const monthly = input.goals.find(
    (goal) => goal.goalType === "monthly" && goal.status === "active"
  );
  const streak = calculateStreak(input.recentPlans);

  return {
    prioritiesCompletedToday: input.completedToday.length,
    prioritiesRemaining: input.openPriorities.length,
    plannedFocusMinutes: focus.plannedFocusMinutes,
    completedFocusMinutes: focus.completedFocusMinutes,
    overdueItems: input.overdueCount,
    weeklyGoalProgress: weekly
      ? progressPercentage(weekly.currentValue.toNumber(), weekly.targetValue.toNumber())
      : 0,
    monthlyGoalProgress: monthly
      ? progressPercentage(monthly.currentValue.toNumber(), monthly.targetValue.toNumber())
      : 0,
    productivityStreak: streak
  };
}

function goalView(goal: Goal) {
  const current = goal.currentValue.toNumber();
  const target = goal.targetValue.toNumber();
  return {
    ...goal,
    currentNumber: current,
    targetNumber: target,
    progress: progressPercentage(current, target),
    daysRemaining: daysRemaining(goal.endDate)
  };
}

function mergeNotifications(
  persisted: InAppNotification[],
  generated: ReturnType<typeof generateNotifications>
) {
  const persistedKeys = new Set(
    persisted.map((item) => `${item.type}:${item.entityType ?? ""}:${item.entityId ?? ""}`)
  );
  const newGenerated = generated.filter(
    (item) => !persistedKeys.has(`${item.type}:${item.entityType ?? ""}:${item.entityId ?? ""}`)
  );
  return [...newGenerated, ...persisted].slice(0, 12);
}

function calculateStreak(plans: DailyPlan[]) {
  return plans.filter((plan) => plan.endedAt && (plan.founderRating ?? 0) >= 6).length;
}
