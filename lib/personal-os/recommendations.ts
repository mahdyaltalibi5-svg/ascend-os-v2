import { daysRemaining } from "@/lib/personal-os/formatting";

export type RecommendationPriority = {
  id: string;
  title: string;
  priorityLevel: string;
  category: string;
  timeframe: string;
  dueDate: Date | null;
  estimatedMinutes: number | null;
  estimatedRevenueImpact: { toNumber: () => number } | number | null;
  pinned: boolean;
  carryoverCount: number;
};

export type RecommendationGoal = {
  category: string;
  goalType: string;
  status: string;
};

export type ScoredPriority = RecommendationPriority & {
  score: number;
  reasons: string[];
};

const levelScore: Record<string, number> = {
  critical: 80,
  high: 55,
  medium: 30,
  low: 10
};

export function scorePriority(
  priority: RecommendationPriority,
  goals: RecommendationGoal[] = [],
  now = new Date()
): ScoredPriority {
  const reasons: string[] = [];
  let score = levelScore[priority.priorityLevel] ?? 20;

  if (priority.pinned) {
    score += 18;
    reasons.push("pinned");
  }

  const revenueImpact = decimalToNumber(priority.estimatedRevenueImpact);
  if (revenueImpact >= 10_000) {
    score += 28;
    reasons.push("high revenue impact");
  } else if (revenueImpact > 0) {
    score += Math.min(18, revenueImpact / 1000);
    reasons.push("revenue impact");
  }

  if (priority.dueDate) {
    const days = daysRemaining(priority.dueDate, now);
    if (priority.dueDate.getTime() < startOfDay(now).getTime()) {
      score += 45;
      reasons.push("overdue");
    } else if (days === 0) {
      score += 30;
      reasons.push("due today");
    } else if (days <= 2) {
      score += 16;
      reasons.push("due soon");
    }
  }

  if (priority.timeframe === "today") score += 14;
  if (priority.carryoverCount >= 3) {
    score -= 14;
    reasons.push("carried repeatedly");
  } else if (priority.carryoverCount > 0) {
    score += priority.carryoverCount * 4;
    reasons.push("carryover");
  }

  if (priority.estimatedMinutes && priority.estimatedMinutes <= 30) score += 8;
  if (
    goals.some(
      (goal) =>
        goal.status === "active" &&
        (goal.category === priority.category ||
          goal.goalType === "daily" ||
          goal.goalType === "weekly")
    )
  ) {
    score += 18;
    reasons.push("goal aligned");
  }

  return { ...priority, score: Math.round(score), reasons };
}

export function buildRecommendation(input: {
  priorities: RecommendationPriority[];
  goals?: RecommendationGoal[];
  remainingFocusMinutes?: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const scored = input.priorities
    .map((priority) => scorePriority(priority, input.goals ?? [], now))
    .sort((left, right) => right.score - left.score);

  const topThree = scored.slice(0, 3);
  const highestValue = topThree[0] ?? null;
  const deferrals = scored
    .filter((priority) => priority.timeframe !== "today" || priority.score < 30)
    .slice(0, 3);
  const archiveCandidates = scored
    .filter((priority) => priority.carryoverCount >= 4 && priority.score < 45)
    .slice(0, 3);

  return {
    label: "Ascend recommendation",
    generatedFrom: "current goals, priorities, focus capacity, carryovers, and pinned work",
    topThree,
    highestValue,
    suggestedFocusBlocks: topThree
      .filter((priority) => (priority.estimatedMinutes ?? 45) > 0)
      .slice(0, 2)
      .map((priority) => ({
        title: priority.title,
        minutes: Math.min(priority.estimatedMinutes ?? 60, input.remainingFocusMinutes ?? 120)
      })),
    deferrals,
    archiveCandidates,
    reasoning: highestValue
      ? `${highestValue.title} is ranked first because ${highestValue.reasons.join(", ") || "it has the strongest current execution score"}.`
      : "No open priorities are available yet. Start by capturing the work that matters today."
  };
}

function decimalToNumber(value: RecommendationPriority["estimatedRevenueImpact"]) {
  if (!value) return 0;
  return typeof value === "number" ? value : value.toNumber();
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}
