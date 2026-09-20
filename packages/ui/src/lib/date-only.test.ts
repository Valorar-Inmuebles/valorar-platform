import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  buildCalendarMonth,
  formatDateOnly,
  isDateOnlyInRange,
  parseIsoDateOnly,
  parseLocalizedDate,
  toIsoDateOnly,
} from "./date-only";

describe("date-only utilities", () => {
  it("parses and formats real calendar dates without time zones", () => {
    expect(parseIsoDateOnly("2028-02-29")).toEqual({
      year: 2028,
      month: 2,
      day: 29,
    });
    expect(parseIsoDateOnly("2027-02-29")).toBeNull();
    expect(formatDateOnly("2026-09-19")).toBe("19/09/2026");
    expect(parseLocalizedDate("19/09/2026")).toBe("2026-09-19");
  });

  it("keeps date-only arithmetic deterministic at month boundaries", () => {
    expect(toIsoDateOnly(addDays({ year: 2026, month: 3, day: 1 }, -1))).toBe(
      "2026-02-28",
    );
    expect(toIsoDateOnly(addMonths({ year: 2028, month: 1, day: 31 }, 1))).toBe(
      "2028-02-29",
    );
  });

  it("enforces inclusive min and max", () => {
    expect(isDateOnlyInRange("2026-09-19", "2026-09-19", "2026-09-30")).toBe(
      true,
    );
    expect(isDateOnlyInRange("2026-10-01", "2026-09-19", "2026-09-30")).toBe(
      false,
    );
  });

  it("builds a six-week Monday-first calendar grid", () => {
    const days = buildCalendarMonth(2026, 9);
    expect(days).toHaveLength(42);
    expect(days[0]?.iso).toBe("2026-08-31");
    expect(days.filter((day) => day.inCurrentMonth)).toHaveLength(30);
  });
});
