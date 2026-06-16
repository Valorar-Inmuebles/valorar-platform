import Link from "next/link";
import type { PropertyListingType } from "@repo/shared-types";
import { getListingTypeLabel } from "@/lib/format/labels";

type ListingTypeSwitcherProps = {
  slug: string;
  currentListingType: PropertyListingType;
  availableListingTypes: PropertyListingType[];
  className?: string;
};

function buildListingTypeHref(
  slug: string,
  listingType: PropertyListingType,
  currentListingType: PropertyListingType,
): string {
  const basePath = `/propiedades/${encodeURIComponent(slug)}`;

  if (listingType === currentListingType) {
    return basePath;
  }

  return `${basePath}?listingType=${listingType}`;
}

export function ListingTypeSwitcher({
  slug,
  currentListingType,
  availableListingTypes,
  className,
}: ListingTypeSwitcherProps) {
  if (availableListingTypes.length <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Tipo de operación"
      className={["flex flex-wrap gap-2", className].filter(Boolean).join(" ")}
    >
      {availableListingTypes.map((listingType) => {
        const isActive = listingType === currentListingType;

        return (
          <Link
            key={listingType}
            href={buildListingTypeHref(slug, listingType, currentListingType)}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              isActive
                ? "bg-primary text-white"
                : "bg-slate-100 text-foreground hover:bg-slate-200"
            }`}
          >
            {getListingTypeLabel(listingType)}
          </Link>
        );
      })}
    </nav>
  );
}
