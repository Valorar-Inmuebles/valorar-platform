export type EffectiveRevision<TAmount = unknown> = {
  effectiveFrom: Date;
  amount: TAmount;
};

export function addCalendarMonthsClamped(value: Date, months: number): Date {
  const year = value.getUTCFullYear();
  const month = value.getUTCMonth();
  const day = value.getUTCDate();
  const lastTargetDay = new Date(
    Date.UTC(year, month + months + 1, 0),
  ).getUTCDate();
  return new Date(Date.UTC(year, month + months, Math.min(day, lastTargetDay)));
}

export function nextAdjustmentDate(
  revisions: Array<{ effectiveFrom: Date }>,
  intervalMonths: number | null,
): Date | null {
  if (!intervalMonths || revisions.length === 0) return null;
  const latest = revisions.reduce((current, candidate) =>
    candidate.effectiveFrom > current.effectiveFrom ? candidate : current,
  );
  return addCalendarMonthsClamped(latest.effectiveFrom, intervalMonths);
}

export function effectiveRevisionFor<TAmount>(
  revisions: EffectiveRevision<TAmount>[],
  effectiveOn: Date,
): EffectiveRevision<TAmount> | null {
  return revisions.reduce<EffectiveRevision<TAmount> | null>(
    (selected, candidate) =>
      candidate.effectiveFrom <= effectiveOn &&
      (!selected || candidate.effectiveFrom > selected.effectiveFrom)
        ? candidate
        : selected,
    null,
  );
}
