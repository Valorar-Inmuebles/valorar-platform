import type { PropertyListFilters } from "@/lib/url/search-params";

type PropertyResultsCountProps = {
  total: number;
};

export function PropertyResultsCount({ total }: PropertyResultsCountProps) {
  const label =
    total === 1 ? "1 propiedad encontrada" : `${total} propiedades encontradas`;

  return <p className="text-sm text-muted">{label}</p>;
}

export function buildPropertiesListTitle(filters: PropertyListFilters): string {
  if (filters.city) {
    return `Propiedades en ${filters.city}`;
  }

  return "Propiedades";
}
