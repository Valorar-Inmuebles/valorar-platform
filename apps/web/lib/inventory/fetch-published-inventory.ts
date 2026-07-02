import type { PublicPropertyCard } from "@repo/shared-types";
import { getPublicProperties } from "@/lib/api/public-property";
import { isDevelopmentProperty } from "@/lib/inventory/is-development-property";

export type InventoryScope = "properties" | "developments";

export async function fetchAllPublishedInventory(): Promise<PublicPropertyCard[]> {
  const items: PublicPropertyCard[] = [];
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

export function filterInventoryByScope(
  items: PublicPropertyCard[],
  scope: InventoryScope,
): PublicPropertyCard[] {
  if (scope === "developments") {
    return items.filter(isDevelopmentProperty);
  }

  return items.filter((item) => !isDevelopmentProperty(item));
}
