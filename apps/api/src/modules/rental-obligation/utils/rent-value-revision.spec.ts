import {
  addCalendarMonthsClamped,
  effectiveRevisionFor,
  nextAdjustmentDate,
} from './rent-value-revision';

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

describe('rent value revision calendar rules', () => {
  it.each([
    [1, '2026-02-28'],
    [3, '2026-04-30'],
    [4, '2026-05-31'],
    [6, '2026-07-31'],
    [12, '2027-01-31'],
  ])('adds %i months with calendar clamp', (months, expected) => {
    expect(addCalendarMonthsClamped(date('2026-01-31'), months)).toEqual(
      date(expected),
    );
  });

  it('handles leap-year clamp and nullable configuration', () => {
    expect(addCalendarMonthsClamped(date('2028-01-31'), 1)).toEqual(
      date('2028-02-29'),
    );
    expect(
      nextAdjustmentDate([{ effectiveFrom: date('2026-01-31') }], null),
    ).toBeNull();
  });

  it('uses the latest applicable revision without crossing a future revision', () => {
    const revisions = [
      { effectiveFrom: date('2026-01-01'), amount: 100 },
      { effectiveFrom: date('2026-04-01'), amount: 150 },
      { effectiveFrom: date('2026-07-01'), amount: 200 },
    ];
    expect(effectiveRevisionFor(revisions, date('2026-06-01'))?.amount).toBe(
      150,
    );
    expect(effectiveRevisionFor(revisions, date('2026-07-01'))?.amount).toBe(
      200,
    );
  });
});
