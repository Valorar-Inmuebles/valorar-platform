import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getLocalitiesByProvince,
  getNeighborhoodsByLocality,
  getProvinces,
} from "./geo-client";

describe("geo-client", () => {
  afterEach(() => vi.restoreAllMocks());

  it("uses same-origin Admin routes for provinces", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([{ id: "province-1", name: "Buenos Aires" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await getProvinces();

    expect(fetchMock).toHaveBeenCalledWith("/api/geo/provinces", {
      headers: { Accept: "application/json" },
    });
  });

  it("keeps Geo query paths same-origin for dependent catalogs", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => new Response("[]", { status: 200 }));

    await getLocalitiesByProvince("province-1", "La Plata");
    await getNeighborhoodsByLocality("locality-1", "Centro");

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/geo/provinces/province-1/localities?q=La+Plata",
      "/api/geo/localities/locality-1/neighborhoods?q=Centro",
    ]);
  });

  it("propagates API failures to the UI error state", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "API unavailable" }), {
        status: 503,
      }),
    );

    await expect(getProvinces()).rejects.toThrow("Geo API request failed: 503");
  });
});
