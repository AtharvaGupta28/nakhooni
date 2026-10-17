// Date and time helpers shared by server and browser code.
// All business dates are Indian calendar dates in YYYY-MM-DD form.

export const TIMEZONE = "Asia/Kolkata";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isValidDate(date: string): boolean {
  if (!DATE_PATTERN.test(date)) {
    return false;
  }

  // Rejects impossible dates such as 2026-02-30.
  const parsed = new Date(`${date}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().startsWith(date)
  );
}

export function isValidMonth(month: string): boolean {
  return MONTH_PATTERN.test(month);
}

export function addDays(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

export function lastDayOfMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  // Day 0 of the following month is the last day of this month.
  return new Date(Date.UTC(year, monthNumber, 0))
    .toISOString()
    .slice(0, 10);
}

export function dayOfWeek(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export function todayInIndia(now = new Date()): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(
    now
  );
}

export function formatTime(isoTime: string): string {
  return new Date(isoTime).toLocaleTimeString("en-IN", {
    timeZone: TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDateTime(isoTime: string): string {
  return new Date(isoTime).toLocaleString("en-IN", {
    timeZone: TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Formats a YYYY-MM-DD date, e.g. "Saturday, 24 October".
export function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatMonth(month: string): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-IN", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} hr`;
  return `${hours} hr ${rest} min`;
}
