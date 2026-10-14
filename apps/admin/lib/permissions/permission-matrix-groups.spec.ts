import { describe, expect, it } from "vitest";
import { assertMatrixCoversAllPermissions } from "./permission-matrix-groups";

describe("permission matrix", () => {
  it("shows every registered permission exactly once", () => {
    expect(assertMatrixCoversAllPermissions()).toEqual({
      missing: [],
      duplicates: [],
      extra: [],
    });
  });
});
