import type { PropertyListingType, PropertyType } from "@repo/shared-types";

export type SearchTab = "sale" | "rent" | "developments";

export type PropertySearchParams = {
  tab: SearchTab;
  propertyType?: PropertyType;
  location?: string;
};

export function buildPropertySearchUrl({
  tab,
  propertyType,
  location,
}: PropertySearchParams): string {
  if (tab === "developments") {
    return "/emprendimientos";
  }

  const params = new URLSearchParams();

  params.set("listingType", tab === "rent" ? "RENT" : "SALE");

  if (propertyType) {
    params.set("propertyType", propertyType);
  }

  if (location?.trim()) {
    params.set("city", location.trim());
  }

  const query = params.toString();

  return query ? `/propiedades?${query}` : "/propiedades";
}

export function listingTypeFromTab(tab: SearchTab): PropertyListingType | null {
  if (tab === "rent") {
    return "RENT";
  }

  if (tab === "sale") {
    return "SALE";
  }

  return null;
}
