import {
  hasMinimumCalendarMonth,
  minimumCalendarMonthEnd,
} from './rental-contract-term';

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

describe('rental contract minimum calendar month', () => {
  it.each([
    ['2026-01-15', '2026-02-15'],
    ['2026-01-31', '2026-02-28'],
    ['2028-01-31', '2028-02-29'],
    ['2026-01-30', '2026-02-28'],
    ['2026-03-31', '2026-04-30'],
  ])('adds one calendar month from %s to %s', (start, expected) => {
    expect(minimumCalendarMonthEnd(date(start))).toEqual(date(expected));
  });

  it('accepts the minimum date and rejects the previous day', () => {
    expect(
      hasMinimumCalendarMonth(date('2026-01-31'), date('2026-02-28')),
    ).toBe(true);
    expect(
      hasMinimumCalendarMonth(date('2026-01-31'), date('2026-02-27')),
    ).toBe(false);
  });
});
