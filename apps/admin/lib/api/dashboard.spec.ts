import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardSummaryResponse } from "./types/dashboard";

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("./client", () => ({ apiFetch }));

import { getDashboardSummary } from "./dashboard";
import { matchesAttentionFilter } from "@/lib/property/property-list";
import {
  buildAttentionListHref,
  parseAttentionFilter,
} from "@/lib/property/property-list-url";

const wire: DashboardSummaryResponse = {
  kpis: { totalProperties: 7, published: 0, drafts: 6, archived: 1 },
  catalogHealth: {
    withoutImages: 1,
    withoutCommercialization: 1,
    withoutDescription: 1,
    withoutFeatures: 1,
    pendingPublication: 1,
  },
  attentionAlerts: {
    withoutImages: 1,
    withoutPrice: 1,
    withoutDescription: 1,
    withoutCommercialization: 1,
    recentlyArchived: 1,
  },
  recentActivity: [],
  filterSets: {
    withoutImages: ["p1"],
    withoutCommercialization: ["p2"],
    withoutDescription: ["p3"],
    withoutFeatures: ["p4"],
    pendingPublication: ["p5"],
    withoutPrice: ["p6"],
    recentlyArchived: ["p7"],
  },
};

describe("Dashboard attention wire adapter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("adapts all seven wire keys to existing URLs and list predicates", async () => {
    const original = structuredClone(wire);
    apiFetch.mockResolvedValue(wire);
    const result = await getDashboardSummary();
    for (const [filter, id] of [
      ["without-images", "p1"],
      ["without-commercialization", "p2"],
      ["without-description", "p3"],
      ["without-features", "p4"],
      ["pending-publication", "p5"],
      ["without-price", "p6"],
      ["recently-archived", "p7"],
    ] as const) {
      const url = new URL(
        buildAttentionListHref(filter),
        "https://admin.example",
      );
      expect(parseAttentionFilter(url.searchParams.get("atencion"))).toBe(
        filter,
      );
      expect(matchesAttentionFilter(id, filter, result.filterSets)).toBe(true);
      expect(matchesAttentionFilter("other", filter, result.filterSets)).toBe(
        false,
      );
    }
    expect(result.kpis).toEqual(wire.kpis);
    expect(result.catalogHealth).toEqual(wire.catalogHealth);
    expect(result.attentionAlerts).toEqual(wire.attentionAlerts);
    expect(result.recentActivity).toEqual(wire.recentActivity);
    expect(wire).toEqual(original);
    expect(apiFetch).toHaveBeenCalledExactlyOnceWith(
      "/admin/dashboard/summary",
      { cache: "no-store" },
    );
  });

  it("preserves empty filter sets", async () => {
    apiFetch.mockResolvedValue({
      ...wire,
      filterSets: Object.fromEntries(
        Object.keys(wire.filterSets).map((key) => [key, []]),
      ),
    });
    const result = await getDashboardSummary();
    expect(Object.values(result.filterSets)).toEqual([
      [],
      [],
      [],
      [],
      [],
      [],
      [],
    ]);
  });

  it("propagates API failures instead of fabricating empty counts", async () => {
    const failure = new Error("API unavailable");
    apiFetch.mockRejectedValue(failure);
    await expect(getDashboardSummary()).rejects.toBe(failure);
  });
});
