// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { screen, within } from "@testing-library/dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  PropertyListItem,
  PropertyListResponse,
} from "@repo/shared-types";
import { ToastProvider } from "@repo/ui/toast";
import { PropertyListView } from "@/components/property/property-list-view";
import { parsePropertyListQuery } from "./property-list-query";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/propiedades",
  useSearchParams: () => new URLSearchParams("pageSize=100"),
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    createElement("a", { href }, children),
}));
let root: Root;
const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockClear();
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe("compact list prices — mounted client", () => {
  it.each([390, 1440])(
    "renders 100 priced rows without requests and preserves responsive table structure at %s",
    async (width) => {
      vi.stubGlobal("innerWidth", width);
      const items: PropertyListItem[] = Array.from({ length: 100 }, (_, i) => ({
        id: `p${i}`,
        slug: `p${i}`,
        title: `Casa ${i}`,
        internalCode: null,
        propertyType: "HOUSE",
        isActive: true,
        location: { localityName: "Rosario", neighborhoodName: null },
        listingTypes: ["SALE", "RENT"],
        publishedOperations: [
          {
            listingType: "SALE",
            primaryPrice: { amount: 150000, currency: "USD" },
          },
          { listingType: "RENT", primaryPrice: null },
        ],
        statusVariant: "published",
        isAnyPublishable: true,
        publicUrl: null,
        activeListingsCount: 1,
        createdBy: null,
        capabilities: { canEdit: false, canArchive: false, canRestore: false },
      }));
      const result: PropertyListResponse = {
        items,
        total: 100,
        page: 1,
        pageSize: 100,
        totalPages: 1,
        commercialCounts: {
          all: 100,
          active: 100,
          published: 100,
          commercialDraft: 0,
          archived: 0,
        },
      };
      await act(async () =>
        root.render(
          createElement(
            ToastProvider,
            null,
            createElement(PropertyListView, {
              result,
              filters: parsePropertyListQuery({ pageSize: "100" }),
              provinceOptions: [],
              canCreate: false,
            }),
          ),
        ),
      );
      const table = screen.getByRole("table");
      expect(within(table).getAllByRole("columnheader")).toHaveLength(7);
      expect(within(table).getAllByText("USD 150.000,00")).toHaveLength(100);
      expect(within(table).getAllByText("Consultar precio")).toHaveLength(100);
      expect(table.closest(".overflow-x-auto")).not.toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
});
