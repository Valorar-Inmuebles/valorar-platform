export type DateOnlyParts = {
  year: number;
  month: number;
  day: number;
};

export type CalendarDay = DateOnlyParts & {
  iso: string;
  inCurrentMonth: boolean;
};

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function toIsoDateOnly(parts: DateOnlyParts): string {
  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}

export function parseIsoDateOnly(value: string): DateOnlyParts | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
  if (
    parts.month < 1 ||
    parts.month > 12 ||
    parts.day < 1 ||
    parts.day > daysInMonth(parts.year, parts.month)
  ) {
    return null;
  }
  return parts;
}

export function formatDateOnly(value: string): string {
  const parts = parseIsoDateOnly(value);
  if (!parts) return value;
  return [
    String(parts.day).padStart(2, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.year).padStart(4, "0"),
  ].join("/");
}

export function parseLocalizedDate(value: string): string | null {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const iso = toIsoDateOnly({
    day: Number(match[1]),
    month: Number(match[2]),
    year: Number(match[3]),
  });
  return parseIsoDateOnly(iso) ? iso : null;
}

export function compareDateOnly(left: string, right: string): number {
  return left.localeCompare(right);
}

export function isDateOnlyInRange(
  value: string,
  min?: string,
  max?: string,
): boolean {
  if (!parseIsoDateOnly(value)) return false;
  return (!min || value >= min) && (!max || value <= max);
}

export function addDays(parts: DateOnlyParts, amount: number): DateOnlyParts {
  const date = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + amount),
  );
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

export function addMonths(parts: DateOnlyParts, amount: number): DateOnlyParts {
  const target = new Date(Date.UTC(parts.year, parts.month - 1 + amount, 1));
  const year = target.getUTCFullYear();
  const month = target.getUTCMonth() + 1;
  return {
    year,
    month,
    day: Math.min(parts.day, daysInMonth(year, month)),
  };
}

export function buildCalendarMonth(year: number, month: number): CalendarDay[] {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const mondayOffset = (firstWeekday + 6) % 7;
  const first = addDays({ year, month, day: 1 }, -mondayOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const parts = addDays(first, index);
    return {
      ...parts,
      iso: toIsoDateOnly(parts),
      inCurrentMonth: parts.year === year && parts.month === month,
    };
  });
}

export function todayDateOnly(): DateOnlyParts {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}
