import { describe, expect, it } from "vitest";

import { parsePersonalCommand } from "@/lib/personal-os/commands";
import { canTransitionFocus, focusedMinutesBetween } from "@/lib/personal-os/focus";
import { formatGoalValue, progressPercentage } from "@/lib/personal-os/formatting";
import { generateNotifications } from "@/lib/personal-os/notifications";
import { buildRecommendation } from "@/lib/personal-os/recommendations";

describe("personal os core behavior", () => {
  it("ranks critical overdue revenue work above low-impact work", () => {
    const recommendation = buildRecommendation({
      now: new Date("2026-07-28T12:00:00Z"),
      goals: [{ category: "revenue", goalType: "monthly", status: "active" }],
      priorities: [
        {
          id: "low",
          title: "Clean inbox",
          priorityLevel: "low",
          category: "operations",
          timeframe: "later",
          dueDate: null,
          estimatedMinutes: 15,
          estimatedRevenueImpact: null,
          pinned: false,
          carryoverCount: 0
        },
        {
          id: "critical",
          title: "Send proposal",
          priorityLevel: "critical",
          category: "revenue",
          timeframe: "today",
          dueDate: new Date("2026-07-27T00:00:00Z"),
          estimatedMinutes: 45,
          estimatedRevenueImpact: 15000,
          pinned: true,
          carryoverCount: 1
        }
      ]
    });

    expect(recommendation.highestValue?.id).toBe("critical");
    expect(recommendation.topThree[0].reasons).toContain("overdue");
  });

  it("parses deterministic founder commands", () => {
    expect(
      parsePersonalCommand("Add call Johnson HVAC as a critical priority for today")
    ).toMatchObject({
      kind: "add_priority",
      priorityLevel: "critical",
      timeframe: "today"
    });
    expect(parsePersonalCommand("Schedule 2 hours of focused work for Ascend OS")).toMatchObject({
      kind: "schedule_focus",
      plannedMinutes: 120
    });
    expect(parsePersonalCommand("What should I work on next?")).toMatchObject({
      kind: "recommend_next"
    });
  });

  it("generates notification candidates from real record state", () => {
    const notifications = generateNotifications({
      now: new Date("2026-07-28T23:00:00Z"),
      hasDailyPlan: true,
      dailyPlanEnded: false,
      priorities: [
        {
          id: "priority",
          title: "Overdue proposal",
          priorityLevel: "critical",
          dueDate: new Date("2026-07-27T00:00:00Z"),
          carryoverCount: 3
        }
      ],
      focusBlocks: [
        {
          id: "focus",
          title: "Long focus",
          status: "ACTIVE",
          startsAt: null,
          actualStartAt: new Date("2026-07-28T12:00:00Z")
        }
      ],
      goals: []
    });

    expect(notifications.map((item) => item.type)).toEqual(
      expect.arrayContaining([
        "priority_overdue",
        "repeated_carryover",
        "long_running_focus",
        "daily_review_not_completed"
      ])
    );
  });

  it("enforces focus state transitions in the pure state machine", () => {
    expect(canTransitionFocus("PLANNED", "ACTIVE")).toBe(true);
    expect(canTransitionFocus("ACTIVE", "PAUSED")).toBe(true);
    expect(canTransitionFocus("DONE", "ACTIVE")).toBe(false);
    expect(
      focusedMinutesBetween(new Date("2026-07-28T10:00:00Z"), new Date("2026-07-28T10:45:00Z"))
    ).toBe(45);
  });

  it("formats goal progress and values", () => {
    expect(progressPercentage(25, 100)).toBe(25);
    expect(formatGoalValue(50000, "currency")).toBe("$50,000");
    expect(formatGoalValue(12.5, "hours")).toBe("12.5h");
  });
});
