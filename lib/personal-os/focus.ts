import type { FocusBlockStatus } from "@prisma/client";

export function canTransitionFocus(from: FocusBlockStatus, to: FocusBlockStatus) {
  const transitions: Record<FocusBlockStatus, FocusBlockStatus[]> = {
    PLANNED: ["ACTIVE", "DONE", "SKIPPED", "CANCELLED"],
    ACTIVE: ["PAUSED", "DONE", "CANCELLED"],
    PAUSED: ["ACTIVE", "DONE", "CANCELLED"],
    DONE: [],
    SKIPPED: ["PLANNED"],
    CANCELLED: ["PLANNED"]
  };

  return transitions[from].includes(to);
}

export function focusedMinutesBetween(start: Date | null, end: Date | null) {
  if (!start || !end) return 0;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}
