import {
  RentalDueMode,
  RentalObligationKind,
} from '../../../../generated/prisma/client';

export const RENTAL_OCCURRENCE_HORIZON_MONTHS = 3;

export type OccurrenceSeed = {
  periodKey: string;
  periodStartsOn: Date | null;
  periodEndsOn: Date | null;
  dueDate: Date | null;
};

export type MaterializationInput = {
  kind: RentalObligationKind;
  recurrenceMonths: number | null;
  dueMode: RentalDueMode;
  dueDay: number | null;
  oneTimeDueDate?: Date | null;
  obligationStartsOn: Date;
  obligationEndsOn: Date | null;
  contractStartsOn: Date;
  contractEndsOn: Date | null;
  localToday: Date;
  horizonMonths?: number;
};

export function parseDateOnly(value: string): Date {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || formatDateOnly(parsed) !== value) {
    throw new RangeError('Invalid date-only value');
  }
  return parsed;
}

export function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function localDateForTimeZone(now: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '';
  return parseDateOnly(`${part('year')}-${part('month')}-${part('day')}`);
}

export function buildOccurrenceSeeds(
  input: MaterializationInput,
): OccurrenceSeed[] {
  const effectiveStart = maxDate(
    input.contractStartsOn,
    input.obligationStartsOn,
  );
  const effectiveEnd = minOptionalDate(
    input.contractEndsOn,
    input.obligationEndsOn,
  );

  if (effectiveEnd && effectiveEnd < effectiveStart) return [];

  if (input.kind === RentalObligationKind.ONE_TIME) {
    const dueDate = input.oneTimeDueDate;
    if (!dueDate) return [];
    if (dueDate < effectiveStart || (effectiveEnd && dueDate > effectiveEnd)) {
      return [];
    }
    return [
      {
        periodKey: 'ONE_TIME',
        periodStartsOn: null,
        periodEndsOn: null,
        dueDate,
      },
    ];
  }

  if (!input.recurrenceMonths) return [];
  if (input.dueMode === RentalDueMode.FIXED_DAY && !input.dueDay) return [];
  const horizonMonths = input.horizonMonths ?? RENTAL_OCCURRENCE_HORIZON_MONTHS;
  const firstHorizonMonth = startOfUtcMonth(input.localToday);
  const anchorMonth = startOfUtcMonth(input.obligationStartsOn);
  const result: OccurrenceSeed[] = [];

  for (let offset = 0; offset < horizonMonths; offset += 1) {
    const periodStartsOn = addUtcMonths(firstHorizonMonth, offset);
    const distance = monthDistance(anchorMonth, periodStartsOn);
    if (distance < 0 || distance % input.recurrenceMonths !== 0) continue;

    const periodEndsOn = new Date(
      Date.UTC(
        periodStartsOn.getUTCFullYear(),
        periodStartsOn.getUTCMonth() + 1,
        0,
      ),
    );
    const dueDate =
      input.dueMode === RentalDueMode.MANUAL_PER_PERIOD
        ? null
        : new Date(
            Date.UTC(
              periodStartsOn.getUTCFullYear(),
              periodStartsOn.getUTCMonth(),
              Math.min(input.dueDay!, periodEndsOn.getUTCDate()),
            ),
          );
    const outsideRange = dueDate
      ? dueDate < effectiveStart || (effectiveEnd && dueDate > effectiveEnd)
      : periodEndsOn < effectiveStart ||
        Boolean(effectiveEnd && periodStartsOn > effectiveEnd);
    if (outsideRange) {
      continue;
    }
    result.push({
      periodKey: formatDateOnly(periodStartsOn).slice(0, 7),
      periodStartsOn,
      periodEndsOn,
      dueDate,
    });
  }

  return result;
}

function startOfUtcMonth(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
}

function addUtcMonths(value: Date, months: number): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, 1),
  );
}

function monthDistance(from: Date, to: Date): number {
  return (
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
    to.getUTCMonth() -
    from.getUTCMonth()
  );
}

function maxDate(first: Date, second: Date): Date {
  return first > second ? first : second;
}

function minOptionalDate(first: Date | null, second: Date | null): Date | null {
  if (!first) return second;
  if (!second) return first;
  return first < second ? first : second;
}
