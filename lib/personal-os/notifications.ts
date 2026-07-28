import { daysRemaining, progressPercentage } from "@/lib/personal-os/formatting";

export type NotificationCandidate = {
  type: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
};

type PriorityInput = {
  id: string;
  title: string;
  priorityLevel: string;
  dueDate: Date | null;
  carryoverCount: number;
};

type FocusInput = {
  id: string;
  title: string;
  status: string;
  startsAt: Date | null;
  actualStartAt: Date | null;
};

type GoalInput = {
  id: string;
  title: string;
  goalType: string;
  targetValue: { toNumber: () => number } | number;
  currentValue: { toNumber: () => number } | number;
  endDate: Date;
};

export function generateNotifications(input: {
  priorities: PriorityInput[];
  focusBlocks: FocusInput[];
  goals: GoalInput[];
  hasDailyPlan: boolean;
  dailyPlanEnded: boolean;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const notifications: NotificationCandidate[] = [];

  if (!input.hasDailyPlan) {
    notifications.push({
      type: "daily_plan_not_started",
      title: "Daily plan not started",
      body: "Start the day before adding more work.",
      entityType: "DailyPlan"
    });
  }

  if (input.hasDailyPlan && !input.dailyPlanEnded && now.getHours() >= 16) {
    notifications.push({
      type: "daily_review_not_completed",
      title: "End-of-day review is open",
      body: "Close the loop while the day is still fresh.",
      entityType: "DailyPlan"
    });
  }

  for (const priority of input.priorities) {
    if (!priority.dueDate) continue;
    const days = daysRemaining(priority.dueDate, now);
    if (priority.dueDate.getTime() < startOfDay(now).getTime()) {
      notifications.push({
        type: "priority_overdue",
        title: "Priority overdue",
        body: priority.title,
        entityType: "PersonalPriority",
        entityId: priority.id
      });
    } else if (days === 0 && priority.priorityLevel === "critical") {
      notifications.push({
        type: "critical_due_today",
        title: "Critical priority due today",
        body: priority.title,
        entityType: "PersonalPriority",
        entityId: priority.id
      });
    }

    if (priority.carryoverCount >= 3) {
      notifications.push({
        type: "repeated_carryover",
        title: "Carried forward repeatedly",
        body: priority.title,
        entityType: "PersonalPriority",
        entityId: priority.id
      });
    }
  }

  for (const block of input.focusBlocks) {
    if (
      block.status === "ACTIVE" &&
      block.actualStartAt &&
      minutesBetween(block.actualStartAt, now) > 180
    ) {
      notifications.push({
        type: "long_running_focus",
        title: "Focus block still running",
        body: block.title,
        entityType: "FocusBlock",
        entityId: block.id
      });
    }

    if (block.status === "PLANNED" && block.startsAt) {
      const minutes = minutesBetween(now, block.startsAt);
      if (minutes >= 0 && minutes <= 20) {
        notifications.push({
          type: "focus_starting_soon",
          title: "Focus block starting soon",
          body: block.title,
          entityType: "FocusBlock",
          entityId: block.id
        });
      }
    }
  }

  for (const goal of input.goals) {
    const progress = progressPercentage(
      decimalToNumber(goal.currentValue),
      decimalToNumber(goal.targetValue)
    );
    const elapsedWarning = daysRemaining(goal.endDate, now) <= 7 && progress < 70;
    if ((goal.goalType === "weekly" || goal.goalType === "monthly") && elapsedWarning) {
      notifications.push({
        type: goal.goalType === "weekly" ? "weekly_goal_behind" : "monthly_goal_behind",
        title: `${capitalize(goal.goalType)} goal behind pace`,
        body: goal.title,
        entityType: "Goal",
        entityId: goal.id
      });
    }
  }

  return notifications.slice(0, 12);
}

function decimalToNumber(value: GoalInput["targetValue"]) {
  return typeof value === "number" ? value : value.toNumber();
}

function minutesBetween(left: Date, right: Date) {
  return Math.round((right.getTime() - left.getTime()) / 60_000);
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function capitalize(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
