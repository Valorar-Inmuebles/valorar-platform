import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ReactElement } from "react";
import type { PropertyListResponse } from "@repo/shared-types";

const { fetchList, fetchProvinces, session, activeTenant } = vi.hoisted(() => ({
  fetchList: vi.fn(),
  fetchProvinces: vi.fn(),
  session: vi.fn(),
  activeTenant: vi.fn(),
}));
vi.mock("@/lib/api/property-list", () => ({ getPropertyList: fetchList }));
vi.mock("@/lib/api/geo", () => ({ getProvinces: fetchProvinces }));
vi.mock("@/lib/auth/session", () => ({ getSession: session }));
vi.mock("@/lib/auth/active-tenant", () => ({
  getActiveTenantId: activeTenant,
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect ${path}`);
  }),
}));

import PropertiesPage from "@/app/(dashboard)/propiedades/page";
import { PropertyListView } from "@/components/property/property-list-view";
import { PropertyListError } from "@/components/property/property-list-error";
import { SuperAdminTenantEmptyState } from "@/components/shared/super-admin-tenant-empty-state";

const result: PropertyListResponse = {
  items: [],
  total: 0,
  totalPages: 0,
  page: 1,
  pageSize: 20,
  commercialCounts: {
    all: 0,
    active: 0,
    archived: 0,
    published: 0,
    commercialDraft: 0,
  },
};
function content(
  page: ReactElement<{
    children: ReactElement<{ result?: PropertyListResponse }>;
  }>,
): ReactElement<{ result?: PropertyListResponse }> {
  return page.props.children;
}

describe("Properties route — one compact read", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.mockResolvedValue({
      user: {
        role: "TENANT_ADMIN",
        permissions: ["property.read", "property.create"],
      },
    });
    activeTenant.mockResolvedValue("tenant-a");
    fetchList.mockResolvedValue(result);
    fetchProvinces.mockResolvedValue([]);
  });

  it("loads only the paginated read model and sends combined Dashboard URL filters", async () => {
    const page = (await PropertiesPage({
      searchParams: Promise.resolve({
        estado: "published",
        atencion: "without-price",
        page: "3",
        pageSize: "50",
        search: " Casa ",
        sortBy: "title",
        sortOrder: "asc",
      }),
    })) as ReactElement<{
      children: ReactElement<{ result?: PropertyListResponse }>;
    }>;
    expect(fetchList).toHaveBeenCalledTimes(1);
    expect(fetchList).toHaveBeenCalledWith(
      expect.objectContaining({
        commercialStatus: "published",
        attention: "without-price",
        page: 3,
        pageSize: 50,
        search: "Casa",
        sortBy: "title",
        sortOrder: "asc",
      }),
    );
    expect(content(page).type).toBe(PropertyListView);
    expect(content(page).props.result).toBe(result);
  });

  it("does not fetch if SUPER_ADMIN has not selected a tenant", async () => {
    session.mockResolvedValue({
      user: { role: "SUPER_ADMIN", permissions: ["property.read"] },
    });
    activeTenant.mockResolvedValue(null);
    const page = (await PropertiesPage({
      searchParams: Promise.resolve({}),
    })) as ReactElement<{
      children: ReactElement<{ result?: PropertyListResponse }>;
    }>;
    expect(content(page).type).toBe(SuperAdminTenantEmptyState);
    expect(fetchList).not.toHaveBeenCalled();
  });

  it("renders retryable error instead of an empty list on API failures", async () => {
    fetchList.mockRejectedValue(new Error("unavailable"));
    const page = (await PropertiesPage({
      searchParams: Promise.resolve({}),
    })) as ReactElement<{
      children: ReactElement<{ result?: PropertyListResponse }>;
    }>;
    expect(content(page).type).toBe(PropertyListError);
    expect(fetchList).toHaveBeenCalledTimes(1);
  });
});
