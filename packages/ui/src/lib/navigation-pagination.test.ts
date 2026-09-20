import { describe, expect, it } from "vitest";
import {
  firstEnabledIndex,
  lastEnabledIndex,
  nextEnabledIndex,
} from "./list-navigation";
import { getPaginationItems } from "./pagination";

describe("keyboard list navigation", () => {
  const disabled = [false, true, false, false];

  it("skips disabled items and wraps", () => {
    expect(firstEnabledIndex(disabled)).toBe(0);
    expect(lastEnabledIndex(disabled)).toBe(3);
    expect(nextEnabledIndex(0, 1, disabled)).toBe(2);
    expect(nextEnabledIndex(3, 1, disabled)).toBe(0);
    expect(nextEnabledIndex(0, -1, disabled)).toBe(3);
  });

  it("reports no target when every item is disabled", () => {
    expect(nextEnabledIndex(-1, 1, [true, true])).toBe(-1);
  });
});

describe("pagination window", () => {
  it("shows boundaries, nearby pages and stable ellipses", () => {
    expect(getPaginationItems(5, 10)).toEqual([
      1,
      "ellipsis-start",
      4,
      5,
      6,
      "ellipsis-end",
      10,
    ]);
    expect(getPaginationItems(1, 3)).toEqual([1, 2, 3]);
  });

  it("clamps pages outside the valid range", () => {
    expect(getPaginationItems(99, 5)).toEqual([1, "ellipsis-start", 4, 5]);
    expect(getPaginationItems(1, 0)).toEqual([]);
  });
});
