import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  archiveProperty: vi.fn(),
  updateProperty: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/api/property", () => ({
  archiveProperty: mocks.archiveProperty,
  createProperty: vi.fn(),
  updateProperty: mocks.updateProperty,
}));

vi.mock("@/lib/api/error-map", () => ({
  mapUnknownError: vi.fn(),
}));

import {
  archivePropertyAction,
  restorePropertyAction,
} from "./property-actions";

describe("Property lifecycle actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("archives only through the explicit archive action", async () => {
    mocks.archiveProperty.mockResolvedValue({});

    await expect(archivePropertyAction("property-1")).resolves.toEqual({
      ok: true,
    });
    expect(mocks.archiveProperty).toHaveBeenCalledWith("property-1");
    expect(mocks.updateProperty).not.toHaveBeenCalled();
  });

  it("restores only through the explicit restore action", async () => {
    mocks.updateProperty.mockResolvedValue({});

    await expect(restorePropertyAction("property-1")).resolves.toEqual({
      ok: true,
    });
    expect(mocks.updateProperty).toHaveBeenCalledWith("property-1", {
      isActive: true,
    });
    expect(mocks.archiveProperty).not.toHaveBeenCalled();
  });
});
