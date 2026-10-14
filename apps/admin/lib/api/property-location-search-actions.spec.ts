import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
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

  it("omits empty optional fields without changing the form payload or making extra requests", async () => {
    api.fetch.mockResolvedValue({ status: "NO_RESULTS", candidates: [] });
    const address = {
      street: "Av. Constituyentes",
      streetNumber: "6100",
      provinceId: "capital-federal",
      localityId: "villa-urquiza",
      neighborhoodId: "",
      province: "Capital Federal",
      city: "Villa Urquiza",
      neighborhood: "",
      postalCode: "",
      country: "AR" as const,
    };
    const original = { ...address };

    await searchPropertyLocationAction(address, "property-1");

    expect(api.fetch).toHaveBeenCalledExactlyOnceWith(
      "/properties/property-1/location-search",
      {
        method: "POST",
        body: JSON.stringify({
          street: "Av. Constituyentes",
          streetNumber: "6100",
          provinceId: "capital-federal",
          localityId: "villa-urquiza",
          province: "Capital Federal",
          city: "Villa Urquiza",
          country: "AR",
        }),
        cache: "no-store",
      },
    );
    expect(address).toEqual(original);
  });

  it("preserves all populated optional fields and omits other empty optional fields", async () => {
    api.fetch.mockResolvedValue({ status: "NO_RESULTS", candidates: [] });
    await searchPropertyLocationAction({
      ...payload,
      streetNumber: "",
      provinceId: "",
      localityId: "",
      neighborhoodId: "neighborhood-1",
      province: "",
      city: "",
      neighborhood: "Barrio Norte",
      postalCode: "1427",
    });
    expect(api.fetch).toHaveBeenCalledExactlyOnceWith(
      "/properties/location-search",
      {
        method: "POST",
        body: JSON.stringify({
          street: "Belgrano",
          country: "AR",
          neighborhoodId: "neighborhood-1",
          neighborhood: "Barrio Norte",
          postalCode: "1427",
        }),
        cache: "no-store",
      },
    );
  });

  it("leaves already absent optional fields absent", async () => {
    api.fetch.mockResolvedValue({ status: "NO_RESULTS", candidates: [] });
    await searchPropertyLocationAction(payload);
    expect(api.fetch).toHaveBeenCalledExactlyOnceWith(
      "/properties/location-search",
      { method: "POST", body: JSON.stringify(payload), cache: "no-store" },
    );
  });

  it("returns a structured API 400 without retrying or changing the address", async () => {
    const address = { ...payload, neighborhoodId: "" };
    api.fetch.mockImplementationOnce(async () => {
      throw new ApiError(
        "neighborhoodId must be longer than or equal to 1 characters",
        400,
        {
          message: [
            "neighborhoodId must be longer than or equal to 1 characters",
          ],
          error: "Bad Request",
          statusCode: 400,
        },
      );
    });
    expect(await searchPropertyLocationAction(address)).toEqual({
      ok: false,
      error: "neighborhoodId must be longer than or equal to 1 characters",
    });
    expect(api.fetch).toHaveBeenCalledTimes(1);
    expect(address.neighborhoodId).toBe("");
  });
});
