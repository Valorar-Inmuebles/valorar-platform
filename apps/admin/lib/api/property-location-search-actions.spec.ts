import { beforeEach, describe, expect, it, vi } from "vitest";
import { searchPropertyLocationAction } from "./property-location-search-actions";

const api = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof import("@/lib/api/client")>()),
  apiFetch: api.fetch,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const payload = {
  street: "Belgrano",
  provinceId: "p",
  localityId: "l",
  country: "AR" as const,
};
beforeEach(() => api.fetch.mockReset());
describe("location search Server Action", () => {
  it("uses the create/edit API without changing property data or invalidating paths", async () => {
    api.fetch.mockResolvedValue({ status: "NO_RESULTS", candidates: [] });
    expect(await searchPropertyLocationAction(payload)).toEqual({
      ok: true,
      result: { status: "NO_RESULTS", candidates: [] },
    });
    expect(api.fetch).toHaveBeenCalledWith(
      "/properties/location-search",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        body: JSON.stringify(payload),
      }),
    );
    await searchPropertyLocationAction(payload, "prop/1");
    expect(api.fetch).toHaveBeenLastCalledWith(
      "/properties/prop%2F1/location-search",
      expect.anything(),
    );
  });
});
