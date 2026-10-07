import { beforeEach, describe, expect, it, vi } from "vitest";
import { evaluateListingPublishability } from "@repo/property-rules";
import { isValidElement, type ReactNode } from "react";
import type { AdminPropertyListing } from "@/lib/api/types/property-listing";
import { getListingStatusLabel } from "@/lib/format/listing-labels";
import {
  detailProperty,
  detailListings,
  detailPrices,
  detailImages,
  detailFeatures,
} from "./detail-context.fixture";

const request = vi.hoisted(() => ({
  paths: [] as string[],
  caches: [] as Map<string, unknown>[],
  failure: null as Error | null,
}));
const originalProperty = structuredClone(detailProperty);
const originalListings = structuredClone(detailListings);
const originalPrices = structuredClone(detailPrices);
// Compile-time define of the dedicated Vitest config, not a runtime app variable.
// eslint-disable-next-line turbo/no-undeclared-env-vars
const baseline = process.env.PROPERTY_DETAIL_BASELINE === "1";
const regression = it.skipIf(baseline);
// Explicit per-render cache boundary for the node-only harness; never persists across requests.
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: (fn: (...args: string[]) => unknown) => {
    const values = new Map<string, unknown>();
    request.caches.push(values);
    return (...args: string[]) => {
      const key = JSON.stringify(args);
      if (!values.has(key)) values.set(key, fn(...args));
      return values.get(key);
    };
  },
}));
vi.mock("@/lib/api/client", () => ({
  ApiError: class extends Error {},
  apiFetch: async (path: string) => {
    request.paths.push(path);
    if (request.failure) throw request.failure;
    if (path.endsWith("/detail-context"))
      return {
        property: detailProperty,
        operations: detailListings.map((listing) => ({
          listing,
          prices: detailPrices.filter(
            (price) => price.listingId === listing.id,
          ),
          publishability: evaluateListingPublishability({
            propertyIsActive: detailProperty.isActive,
            imageCount: 33,
            hasCoverImage: true,
            listingStatus: listing.status,
            hasPrimaryPrice: detailPrices.some(
              (price) => price.listingId === listing.id && price.isPrimary,
            ),
          }),
        })),
        imageCount: 33,
        hasCoverImage: true,
        featureCount: 5,
      };
    if (path.includes("/publishability?"))
      return evaluateListingPublishability({
        propertyIsActive: true,
        imageCount: 33,
        hasCoverImage: true,
        listingStatus: "ACTIVE",
        hasPrimaryPrice: true,
      });
    if (path.startsWith("/property-listings")) return detailListings;
    if (path.startsWith("/property-prices")) return detailPrices;
    if (path.startsWith("/property-images")) return detailImages;
    if (path.endsWith("/features")) return detailFeatures;
    if (path.startsWith("/property-features")) return [];
    if (path === "/users") return [];
    if (path === `/properties/${detailProperty.id}`) return detailProperty;
    throw new Error(`Unexpected read: ${path}`);
  },
}));

import { loadPropertyExecutiveContext } from "./load-property-executive-context";
import { loadCommercializationContext } from "./load-commercialization-context";
import { getPropertyDetailContext } from "@/lib/api/property-detail-context";
import DataPage from "@/app/(dashboard)/propiedades/[id]/page";
import CommercialPage from "@/app/(dashboard)/propiedades/[id]/publicaciones/page";
import FeaturePage from "@/app/(dashboard)/propiedades/[id]/caracteristicas/page";
import ImagePage from "@/app/(dashboard)/propiedades/[id]/imagenes/page";

function componentProps(node: ReactNode): Record<string, unknown>[] {
  if (Array.isArray(node)) return node.flatMap(componentProps);
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  return [node.props, ...componentProps(node.props.children)];
}

describe("Property detail read fan-out (layout + actual tab page)", () => {
  beforeEach(() => {
    request.paths.length = 0;
    request.caches.forEach((cache) => cache.clear());
    request.failure = null;
    Object.assign(detailProperty, structuredClone(originalProperty));
    detailListings.splice(
      0,
      detailListings.length,
      ...structuredClone(originalListings),
    );
    detailPrices.splice(
      0,
      detailPrices.length,
      ...structuredClone(originalPrices),
    );
  });

  it.each([
    ["Datos", DataPage, baseline ? 15 : 4],
    ["Comercialización", CommercialPage, baseline ? 10 : 1],
    ["Características", FeaturePage, baseline ? 9 : 3],
    ["Imágenes", ImagePage, baseline ? 8 : 2],
  ] as const)("%s", async (name, Page, budget) => {
    const [header, page] = await Promise.all([
      loadPropertyExecutiveContext(detailProperty.id),
      Page({ params: Promise.resolve({ id: detailProperty.id }) }),
    ]);
    expect(header.snapshot).toEqual({
      shortAddress: "Street 100",
      provinceLabel: "Province",
      localityLabel: "City",
      lifecycleLabel: "Activa",
      commercialLabel: "Publicada",
      activeOperationsCount: 1,
      activeOperationLabels: ["Venta"],
      primaryPrice: {
        amount: 100000,
        currency: "USD",
        listingType: "SALE",
        listingTypeLabel: "Venta",
      },
      imageCount: 33,
      featureCount: 5,
      hasCoverImage: true,
      isFeatured: true,
      seo: { isReady: true, scoreLabel: "Listo", issues: [] },
      updatedAt: detailProperty.updatedAt,
    });
    expect(header.publishability.isAnyPublishable).toBe(true);
    expect(request.paths).toHaveLength(budget);
    if (!baseline) {
      expect(
        request.paths.filter((path) => path.endsWith("/detail-context")),
      ).toHaveLength(1);
      expect(
        request.paths.some((path) =>
          /publishability\?|property-prices|property-listings/.test(path),
        ),
      ).toBe(false);
    }
    const props = componentProps(page);
    if (name === "Datos") {
      expect(props).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            property: detailProperty,
            featureAssignments: detailFeatures,
          }),
        ]),
      );
    } else if (name === "Características") {
      expect(props).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ assignments: detailFeatures, catalog: [] }),
        ]),
      );
    } else if (name === "Imágenes") {
      expect(props).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            images: detailImages,
            propertyIsActive: true,
          }),
        ]),
      );
    } else {
      expect(props).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            listings: detailListings,
            pricesByListingId: { "listing-1": detailPrices },
          }),
        ]),
      );
    }
    console.info(
      JSON.stringify({
        tab: name,
        fetchInvocations: request.paths.length,
        paths: request.paths,
      }),
    );
  });

  regression.each([0, 1, 3])(
    "keeps one context fetch for %i listings and preserves all prices",
    async (count) => {
      const types: AdminPropertyListing["listingType"][] = [
        "SALE",
        "RENT",
        "TEMPORARY_RENT",
      ];
      detailListings.splice(
        0,
        detailListings.length,
        ...types.slice(0, count).map((listingType, i) => ({
          ...originalListings[0]!,
          id: `listing-${i}`,
          listingType,
        })),
      );
      detailPrices.splice(
        0,
        detailPrices.length,
        ...detailListings.flatMap((listing) => [
          {
            ...originalPrices[0]!,
            id: `primary-${listing.id}`,
            listingId: listing.id,
          },
          {
            ...originalPrices[0]!,
            id: `secondary-${listing.id}`,
            listingId: listing.id,
            isPrimary: false,
            amount: 90000,
          },
        ]),
      );
      const [header, commercial] = await Promise.all([
        loadPropertyExecutiveContext(detailProperty.id),
        loadCommercializationContext(detailProperty.id),
      ]);
      expect(request.paths).toEqual([
        `/properties/${detailProperty.id}/detail-context`,
      ]);
      expect(commercial.listings).toEqual(detailListings);
      expect(Object.values(commercial.pricesByListingId).flat()).toEqual(
        detailPrices,
      );
      expect(header.snapshot.activeOperationsCount).toBe(count);
      expect(header.publishability.isAnyPublishable).toBe(count > 0);
    },
  );

  regression(
    "preserves archived lifecycle, closed listing labels and checklist links",
    async () => {
      detailProperty.isActive = false;
      detailListings[0]!.status = "CLOSED";
      const [header, commercial] = await Promise.all([
        loadPropertyExecutiveContext(detailProperty.id),
        loadCommercializationContext(detailProperty.id),
      ]);
      expect(header.snapshot.lifecycleLabel).toBe("Archivada");
      expect(header.snapshot.commercialLabel).toBe("Borrador");
      expect(header.snapshot.primaryPrice?.amount).toBe(100000);
      const operation = commercial.publishabilityByListingId["listing-1"]!;
      expect(operation.publicWebUrl).toBeNull();
      expect(operation.missing).toEqual(
        expect.arrayContaining(["property-active", "listing-active"]),
      );
      expect(
        operation.items
          .filter((item) => !item.passed)
          .every((item) => Boolean(item.href)),
      ).toBe(true);
      expect(getListingStatusLabel("CLOSED", "SALE")).toBe("Vendida");
      expect(getListingStatusLabel("CLOSED", "RENT")).toBe("Alquilada");
    },
  );

  regression(
    "does not share data across render/request boundaries or property ids",
    async () => {
      const first = await getPropertyDetailContext(detailProperty.id);
      request.caches.forEach((cache) => cache.clear());
      detailProperty.tenantId = "tenant-2";
      const second = await getPropertyDetailContext(detailProperty.id);
      expect(first).not.toBe(second);
      expect(request.paths).toHaveLength(2);
      await getPropertyDetailContext("property-2");
      expect(request.paths).toHaveLength(3);
    },
  );

  regression(
    "propagates API failures without falling back to less-scoped endpoints",
    async () => {
      request.failure = new Error("Forbidden");
      await expect(
        loadPropertyExecutiveContext(detailProperty.id),
      ).rejects.toThrow("Forbidden");
      expect(request.paths).toEqual([
        `/properties/${detailProperty.id}/detail-context`,
      ]);
    },
  );
});
