type DateParts = {
  year: number;
  month: number;
  day: number;
};

function zonedParts(date: Date, timezone: string): DateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value)
  };
}

export function monthPeriod(date: Date, timezone: string) {
  const parts = zonedParts(date, timezone);
  const start = new Date(Date.UTC(parts.year, parts.month - 1, 1));
  const end = new Date(Date.UTC(parts.year, parts.month, 0, 23, 59, 59, 999));

  return { start, end, label: `${parts.year}-${String(parts.month).padStart(2, "0")}` };
}

export function quarterPeriod(date: Date, timezone: string) {
  const parts = zonedParts(date, timezone);
  const quarterStartMonth = Math.floor((parts.month - 1) / 3) * 3;
  const start = new Date(Date.UTC(parts.year, quarterStartMonth, 1));
  const end = new Date(Date.UTC(parts.year, quarterStartMonth + 3, 0, 23, 59, 59, 999));

  return { start, end, label: `${parts.year}-Q${quarterStartMonth / 3 + 1}` };
}

export function yearPeriod(date: Date, timezone: string) {
  const parts = zonedParts(date, timezone);
  return {
    start: new Date(Date.UTC(parts.year, 0, 1)),
    end: new Date(Date.UTC(parts.year, 11, 31, 23, 59, 59, 999)),
    label: String(parts.year)
  };
}

export function periodForGoal(goalPeriod: string, date: Date, timezone: string) {
  if (goalPeriod === "quarterly") return quarterPeriod(date, timezone);
  if (goalPeriod === "annual") return yearPeriod(date, timezone);
  return monthPeriod(date, timezone);
}

export function daysBetweenInclusive(start: Date, end: Date) {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / dayMs) + 1);
}

export function elapsedDays(start: Date, now: Date, end: Date) {
  if (now <= start) return 0;
  return Math.min(daysBetweenInclusive(start, end), daysBetweenInclusive(start, now));
}

export function remainingDays(now: Date, end: Date) {
  if (now > end) return 0;
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / dayMs));
}

export function parseDateInput(value: FormDataEntryValue | string | null | undefined) {
  if (!value) return null;
  const date = new Date(`${String(value)}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}
