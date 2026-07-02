import { buildSearchCoverage } from "@/lib/inventory/build-search-coverage";
import {
  fetchAllPublishedInventory,
  filterInventoryByScope,
  type InventoryScope,
} from "@/lib/inventory/fetch-published-inventory";
import type { SearchCoverage } from "@/lib/inventory/search-coverage.types";

export async function getInventorySearchCoverage(
  scope: InventoryScope,
): Promise<SearchCoverage> {
  const inventory = await fetchAllPublishedInventory();
  const scopedItems = filterInventoryByScope(inventory, scope);
  return buildSearchCoverage(scopedItems);
}
