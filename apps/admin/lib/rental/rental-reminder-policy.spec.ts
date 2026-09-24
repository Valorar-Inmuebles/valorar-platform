import { describe, expect, it } from "vitest";
import {
  minutesToTime,
  parseReminderOffset,
  timeToMinutes,
} from "./rental-reminder-policy";

describe("rental reminder policy form values", () => {
  it.each([
    [0, "00:00"],
    [600, "10:00"],
    [1439, "23:59"],
  ])("formats %s minutes as %s", (minutes, expected) => {
    expect(minutesToTime(minutes)).toBe(expected);
  });

  it.each([
    ["00:00", 0],
    ["23:59", 1439],
    ["10:30", 630],
  ])("parses %s as %s minutes", (value, expected) => {
    expect(timeToMinutes(value)).toBe(expected);
  });

  it.each(["", "24:00", "12:60", "9:00", "abc"])(
    "rejects invalid time %s",
    (value) => {
      expect(timeToMinutes(value)).toBeNull();
    },
  );

  it.each([
    ["1", 1],
    ["30", 30],
  ])("accepts offset %s", (value, expected) => {
    expect(parseReminderOffset(value)).toBe(expected);
  });

  it.each(["", "0", "31", "1.5", "abc"])("rejects offset %s", (value) => {
    expect(parseReminderOffset(value)).toBeNull();
  });
});
