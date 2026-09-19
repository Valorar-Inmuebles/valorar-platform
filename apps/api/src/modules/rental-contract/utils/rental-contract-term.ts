export function minimumCalendarMonthEnd(startsOn: Date): Date {
  const year = startsOn.getUTCFullYear();
  const month = startsOn.getUTCMonth();
  const day = startsOn.getUTCDate();
  const lastDayOfTargetMonth = new Date(
    Date.UTC(year, month + 2, 0),
  ).getUTCDate();

  return new Date(
    Date.UTC(year, month + 1, Math.min(day, lastDayOfTargetMonth)),
  );
}

export function hasMinimumCalendarMonth(startsOn: Date, endsOn: Date): boolean {
  return endsOn >= minimumCalendarMonthEnd(startsOn);
}
