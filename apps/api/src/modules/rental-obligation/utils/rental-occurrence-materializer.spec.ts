jest.mock('../../../../generated/prisma/client', () => ({
  RentalObligationKind: { RECURRING: 'RECURRING', ONE_TIME: 'ONE_TIME' },
}));

import { RentalObligationKind } from '../../../../generated/prisma/client';
import {
  buildOccurrenceSeeds,
  formatDateOnly,
  localDateForTimeZone,
  parseDateOnly,
} from './rental-occurrence-materializer';

const date = parseDateOnly;

function recurring(overrides: Record<string, unknown> = {}) {
  return buildOccurrenceSeeds({
    kind: RentalObligationKind.RECURRING,
    recurrenceMonths: 1,
    dueDay: 31,
    obligationStartsOn: date('2024-01-01'),
    obligationEndsOn: null,
    contractStartsOn: date('2024-01-01'),
    contractEndsOn: null,
    localToday: date('2024-01-10'),
    horizonMonths: 3,
    ...overrides,
  });
}

describe('rental occurrence materializer', () => {
  it('clamps days 29/30/31 to the calendar month, including leap years', () => {
    expect(
      recurring({ localToday: date('2024-02-01') }).map((item) =>
        formatDateOnly(item.dueDate),
      ),
    ).toEqual(['2024-02-29', '2024-03-31', '2024-04-30']);
    expect(
      recurring({ localToday: date('2025-02-01'), horizonMonths: 1 })[0]
        .dueDate,
    ).toEqual(date('2025-02-28'));
  });

  it.each([
    [28, '2025-02-28'],
    [29, '2025-02-28'],
    [30, '2025-02-28'],
    [31, '2025-02-28'],
  ])('handles due day %i in a non-leap February', (dueDay, expected) => {
    const [seed] = recurring({
      dueDay,
      localToday: date('2025-02-01'),
      horizonMonths: 1,
    });
    expect(formatDateOnly(seed.dueDate)).toBe(expected);
  });

  it('anchors multi-month recurrence and respects contract bounds', () => {
    const seeds = recurring({
      recurrenceMonths: 2,
      dueDay: 10,
      contractStartsOn: date('2024-02-11'),
      contractEndsOn: date('2024-05-09'),
      localToday: date('2024-02-01'),
      horizonMonths: 5,
    });
    expect(seeds.map((item) => item.periodKey)).toEqual(['2024-03']);
  });

  it('materializes one-time only once and only inside effective bounds', () => {
    expect(
      buildOccurrenceSeeds({
        kind: RentalObligationKind.ONE_TIME,
        recurrenceMonths: null,
        dueDay: null,
        oneTimeDueDate: date('2024-03-20'),
        obligationStartsOn: date('2024-03-01'),
        obligationEndsOn: null,
        contractStartsOn: date('2024-01-01'),
        contractEndsOn: date('2024-12-31'),
        localToday: date('2024-01-01'),
      }),
    ).toEqual([
      expect.objectContaining({
        periodKey: 'ONE_TIME',
        dueDate: date('2024-03-20'),
      }),
    ]);
  });

  it('derives the tenant-local current date deterministically', () => {
    expect(
      formatDateOnly(
        localDateForTimeZone(
          new Date('2026-09-10T01:30:00.000Z'),
          'America/Argentina/Buenos_Aires',
        ),
      ),
    ).toBe('2026-09-09');
  });
});
