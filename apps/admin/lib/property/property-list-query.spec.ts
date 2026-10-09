import { describe, expect, it, vi } from "vitest";
import {
  buildAttentionListHref,
  buildDashboardPropertyHref,
} from "./property-list-url";
import {
  createPropertySearchDebounce,
  parsePropertyListQuery,
  propertyListApiPath,
  updatePropertyListParams,
} from "./property-list-query";

describe("Property search debounce", () => {
  it("commits only the latest draft after 350 ms and cancels stale drafts on filter/history navigation", () => {
    vi.useFakeTimers();
    try {
      const commit = vi.fn();
      const debounce = createPropertySearchDebounce(commit);
      debounce.schedule("c");
      vi.advanceTimersByTime(200);
      debounce.schedule("  casa  ");
      vi.advanceTimersByTime(349);
      expect(commit).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(commit).toHaveBeenCalledExactlyOnceWith("casa");
      debounce.schedule("obsolete");
      debounce.cancel();
      vi.advanceTimersByTime(350);
      expect(commit).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("Property list URL → read model", () => {
  it("keeps Dashboard links stable while translating to API filters", () => {
    const attentionHref = buildAttentionListHref("without-price");
    const attention = parsePropertyListQuery(
      Object.fromEntries(
        new URL(attentionHref, "http://localhost").searchParams,
      ),
    );
    expect(attentionHref).toBe("/propiedades?atencion=without-price");
    expect(propertyListApiPath(attention)).toContain("attention=without-price");
    expect(propertyListApiPath(attention)).not.toContain("atencion=");
    const statusHref = buildDashboardPropertyHref("commercial-draft");
    const status = parsePropertyListQuery(
      Object.fromEntries(new URL(statusHref, "http://localhost").searchParams),
    );
    expect(propertyListApiPath(status)).toContain(
      "commercialStatus=commercial-draft",
    );
    expect(propertyListApiPath(status)).not.toContain("estado=");
  });

  it("combines filters, search, sorting, pagination and GEO without fetching legacy arrays", () => {
    const filters = parsePropertyListQuery({
      estado: "published",
      atencion: "without-price",
      propertyType: "HOUSE",
      listingType: "RENT",
      provinceId: "p",
      localityId: "l",
      neighborhoodId: "n",
      search: "  Casa %_\\  ",
      sortBy: "location",
      sortOrder: "asc",
      page: "3",
      pageSize: "50",
    });
    const path = propertyListApiPath(filters);
    expect(path).toBe(
      "/properties/list?page=3&pageSize=50&commercialStatus=published&sortBy=location&sortOrder=asc&search=Casa+%25_%5C&propertyType=HOUSE&listingType=RENT&attention=without-price&provinceId=p&localityId=l&neighborhoodId=n",
    );
    expect(parsePropertyListQuery({})).toMatchObject({
      page: 1,
      pageSize: 20,
      sortBy: "updatedAt",
      sortOrder: "desc",
      commercialStatus: "all",
    });
  });

  it("resets page for changed criteria and size but preserves it for pagination and back/forward", () => {
    const current =
      "estado=published&atencion=without-images&search=Casa&page=9&pageSize=20";
    const changed = new URLSearchParams(
      updatePropertyListParams(current, {
        pageSize: 100,
        propertyType: "LAND",
      }),
    );
    expect(changed.get("page")).toBeNull();
    expect(changed.get("atencion")).toBe("without-images");
    expect(changed.get("search")).toBe("Casa");
    const next = new URLSearchParams(
      updatePropertyListParams(changed.toString(), { page: 2 }, false),
    );
    expect(parsePropertyListQuery(Object.fromEntries(next))).toMatchObject({
      page: 2,
      pageSize: 100,
      propertyType: "LAND",
    });
    expect(
      new URLSearchParams(
        updatePropertyListParams(next.toString(), { estado: undefined }),
      ).get("page"),
    ).toBeNull();
  });

  it("normalizes invalid values before they reach the strict API", () => {
    const parsed = parsePropertyListQuery({
      page: "1000001",
      pageSize: "10",
      propertyType: "FAKE",
      listingType: "PAUSED",
      sortBy: "DROP",
      sortOrder: "up",
      estado: "FAKE",
      atencion: "withoutImages",
      search: "x".repeat(161),
    });
    expect(parsed).toMatchObject({
      page: 1,
      pageSize: 20,
      commercialStatus: "all",
      sortBy: "updatedAt",
      sortOrder: "desc",
    });
    expect(parsed.propertyType).toBeUndefined();
    expect(parsed.listingType).toBeUndefined();
    expect(parsed.attention).toBeUndefined();
    expect(parsed.search).toHaveLength(160);
  });
});
