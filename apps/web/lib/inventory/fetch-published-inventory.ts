import type { PublicDevelopmentCard } from "@repo/shared-types";
import { getPublicDevelopments } from "@/lib/api/public-development";
import { getPublicProperties } from "@/lib/api/public-property";
import type { InventoryGeoSource } from "@/lib/inventory/inventory-geo-source";

export type InventoryScope = "properties" | "developments";

function developmentToGeoSource(
  development: PublicDevelopmentCard,
): InventoryGeoSource {
  return {
    provinceId: development.provinceId ?? null,
    provinceName: development.provinceName ?? development.province ?? null,
    localityId: development.localityId ?? null,
    localityName: development.localityName ?? development.city,
    neighborhoodId: development.neighborhoodId ?? null,
    neighborhoodName: development.neighborhoodName ?? development.neighborhood ?? null,
    city: development.city,
    neighborhood: development.neighborhood ?? development.neighborhoodName ?? null,
  };
}

async function fetchAllPublishedProperties(): Promise<InventoryGeoSource[]> {
  const items: InventoryGeoSource[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await getPublicProperties({ page, limit: 100 });

    if (response.unavailable || response.data.length === 0) {
      break;
    }

    items.push(...response.data);
    totalPages = response.meta.totalPages;
    page += 1;
  }

  return items;
}

async function fetchAllPublishedDevelopments(): Promise<InventoryGeoSource[]> {
  const items: InventoryGeoSource[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await getPublicDevelopments({ page, limit: 100 });

    if (response.unavailable || response.data.length === 0) {
      break;
    }

    items.push(...response.data.map(developmentToGeoSource));
    totalPages = response.meta.totalPages;
    page += 1;
  }

  return items;
}

export async function fetchAllPublishedInventory(
  scope: InventoryScope,
): Promise<InventoryGeoSource[]> {
  if (scope === "developments") {
    return fetchAllPublishedDevelopments();
  }

  return fetchAllPublishedProperties();
}
