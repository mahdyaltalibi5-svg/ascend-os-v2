export type ParsedCommand =
  | { kind: "add_priority"; title: string; priorityLevel: string; timeframe: string }
  | { kind: "schedule_focus"; title: string; plannedMinutes: number; windowLabel: string }
  | { kind: "recommend_next" }
  | { kind: "show_overdue" }
  | { kind: "complete_priority"; query: string }
  | { kind: "create_goal"; title: string; goalType: string; targetValue: number; unit: string }
  | { kind: "save_note"; body: string }
  | { kind: "carry_forward" }
  | { kind: "start_next_focus" }
  | { kind: "end_day" }
  | { kind: "unknown"; message: string };

export function parsePersonalCommand(input: string): ParsedCommand {
  const command = input.trim();
  const lower = command.toLowerCase();

  if (!command) return { kind: "unknown", message: "Enter a command first." };

  if (lower.includes("what should i work") || lower.includes("highest-value")) {
    return { kind: "recommend_next" };
  }

  if (lower.includes("show overdue")) return { kind: "show_overdue" };
  if (lower.includes("move unfinished") || lower.includes("carry forward"))
    return { kind: "carry_forward" };
  if (lower.includes("start my next focus") || lower.includes("start next focus"))
    return { kind: "start_next_focus" };
  if (lower.includes("end my day")) return { kind: "end_day" };

  const noteMatch = command.match(/^save (a )?note (that )?(?<body>.+)$/i);
  if (noteMatch?.groups?.body) return { kind: "save_note", body: noteMatch.groups.body };

  const completeMatch = command.match(/^mark (?<query>.+) complete$/i);
  if (completeMatch?.groups?.query) {
    return { kind: "complete_priority", query: completeMatch.groups.query.trim() };
  }

  const goalMatch = command.match(
    /^create (a )?(?<type>daily|weekly|monthly|quarterly)? ?goal (to )?(?<title>.+?)(?:\$?(?<amount>[0-9][0-9,]*(?:\.\d+)?))?$/i
  );
  if (goalMatch?.groups?.title && lower.includes("goal")) {
    const amount = goalMatch.groups.amount?.replace(/,/g, "");
    return {
      kind: "create_goal",
      title: cleanupTitle(goalMatch.groups.title),
      goalType: goalMatch.groups.type ?? "monthly",
      targetValue: amount ? Number(amount) : 1,
      unit: lower.includes("$") || lower.includes("collect") ? "currency" : "count"
    };
  }

  const focusMatch = command.match(
    /^(schedule|plan) (?<duration>[0-9]+)? ?(?<unit>hour|hours|minute|minutes)?( of)? focused work( for)? (?<title>.+)$/i
  );
  if (focusMatch?.groups?.title) {
    const duration = Number(focusMatch.groups.duration ?? 60);
    const unit = focusMatch.groups.unit ?? "minutes";
    return {
      kind: "schedule_focus",
      title: cleanupTitle(focusMatch.groups.title),
      plannedMinutes: unit.startsWith("hour") ? duration * 60 : duration,
      windowLabel: "Today"
    };
  }

  const addMatch = command.match(
    /^(add|create) (?<title>.+?)( as a (?<level>critical|high|medium|low))?( priority)?( for (?<timeframe>today|tomorrow|this week|later))?\.?$/i
  );
  if (addMatch?.groups?.title) {
    return {
      kind: "add_priority",
      title: cleanupTitle(addMatch.groups.title),
      priorityLevel: addMatch.groups.level ?? inferPriorityLevel(lower),
      timeframe: inferTimeframe(addMatch.groups.timeframe ?? lower)
    };
  }

  return {
    kind: "unknown",
    message:
      "Try: add a priority, schedule focused work, save a note, create a goal, or ask what to work on next."
  };
}

function inferPriorityLevel(value: string) {
  if (value.includes("critical")) return "critical";
  if (value.includes("high")) return "high";
  if (value.includes("low")) return "low";
  return "medium";
}

function inferTimeframe(value: string) {
  if (value.includes("week")) return "week";
  if (value.includes("later")) return "later";
  return "today";
}

function cleanupTitle(value: string) {
  return value
    .replace(/\.$/, "")
    .replace(/\bfor tomorrow\b/i, "")
    .replace(/\bfor today\b/i, "")
    .replace(/\bas a (critical|high|medium|low) priority\b/i, "")
    .trim();
}
