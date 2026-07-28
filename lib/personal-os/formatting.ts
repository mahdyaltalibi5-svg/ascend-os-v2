export function dateKeyForTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

export function parseDateInput(value?: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatGoalValue(value: number, unit: string) {
  if (unit === "currency") return formatMoney(value);
  if (unit === "percentage") return `${Math.round(value)}%`;
  if (unit === "hours") return `${trimNumber(value)}h`;
  if (unit === "binary") return value >= 1 ? "Done" : "Not done";
  return trimNumber(value);
}

export function progressPercentage(currentValue: number, targetValue: number) {
  if (targetValue <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((currentValue / targetValue) * 100)));
}

export function daysRemaining(endDate: Date, now = new Date()) {
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));
}

export function trimNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}
