export type SalesCommand =
  | { type: "callable_count" }
  | { type: "hot_no_attempts" }
  | { type: "overdue_followups" }
  | { type: "create_priority"; title: string };

export function parseSalesCommand(input: string): SalesCommand | null {
  const lower = input.trim().toLowerCase();
  if (!lower) return null;

  if (lower.includes("callable prospect") || lower.includes("queue size")) {
    return { type: "callable_count" };
  }
  if (
    lower.includes("hot prospect") &&
    (lower.includes("no attempts") || lower.includes("untouched"))
  ) {
    return { type: "hot_no_attempts" };
  }
  if (lower.includes("overdue") && lower.includes("follow")) {
    return { type: "overdue_followups" };
  }
  if (lower.includes("recover") && lower.includes("no-show")) {
    return { type: "create_priority", title: "Recover sales no-shows" };
  }
  if (lower.includes("generate more leads")) {
    return { type: "create_priority", title: "Generate more qualified sales leads" };
  }
  if (lower.includes("assign unowned prospects")) {
    return { type: "create_priority", title: "Assign unowned sales prospects" };
  }
  return null;
}
