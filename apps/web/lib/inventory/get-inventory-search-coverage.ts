import { buildSearchCoverage } from "@/lib/inventory/build-search-coverage";
import {
  fetchAllPublishedInventory,
  type InventoryScope,
} from "@/lib/inventory/fetch-published-inventory";
import type { SearchCoverage } from "@/lib/inventory/search-coverage.types";

export async function getInventorySearchCoverage(
  scope: InventoryScope,
): Promise<SearchCoverage> {
  const inventory = await fetchAllPublishedInventory(scope);
  return buildSearchCoverage(inventory);
}
