export type SearchCoverageLocality = {
  /** Stable React key — localityId when available, otherwise provinceId::normalizedName */
  id: string;
  provinceId: string;
  provinceName: string;
  localityId?: string;
  name: string;
  propertyCount: number;
};

export type SearchCoverageProvince = {
  id: string;
  name: string;
  slug: string;
  isoCode: string | null;
};

export type SearchCoverage = {
  provinces: SearchCoverageProvince[];
  localitiesByProvince: Record<string, SearchCoverageLocality[]>;
  singleProvince: boolean;
  isCabaOnly: boolean;
  defaultProvinceId?: string;
  /** Top localities by published inventory count (max 5). */
  topLocalitySuggestions: SearchCoverageLocality[];
};

const CABA_ALIASES = new Set([
  "capital federal",
  "ciudad autonoma de buenos aires",
  "ciudad autónoma de buenos aires",
  "caba",
]);

export function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function isCabaProvince(province: {
  name: string;
  slug: string;
  isoCode: string | null;
}): boolean {
  return (
    province.isoCode === "AR-C" ||
    province.slug === "capital-federal" ||
    CABA_ALIASES.has(normalizeSearchText(province.name))
  );
}

export function getLocalitiesForProvince(
  coverage: SearchCoverage,
  provinceId?: string,
): SearchCoverageLocality[] {
  if (!provinceId) {
    return Object.values(coverage.localitiesByProvince).flat();
  }

  return coverage.localitiesByProvince[provinceId] ?? [];
}

export function filterCoverageLocalities(
  localities: SearchCoverageLocality[],
  query: string,
  limit = 20,
): SearchCoverageLocality[] {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return localities.slice(0, limit);
  }

  return localities
    .filter((locality) =>
      normalizeSearchText(locality.name).includes(normalizedQuery),
    )
    .slice(0, limit);
}

export function findCoverageLocality(
  coverage: SearchCoverage,
  query: string,
  provinceId?: string,
): SearchCoverageLocality | undefined {
  const normalizedQuery = normalizeSearchText(query);
  const localities = getLocalitiesForProvince(coverage, provinceId);

  return localities.find(
    (locality) => normalizeSearchText(locality.name) === normalizedQuery,
  );
}

export function getLocalityFieldLabel(coverage: SearchCoverage): string {
  return coverage.isCabaOnly ? "Barrio" : "Localidad";
}

export function getTopLocalitySuggestions(
  coverage: SearchCoverage,
  limit = 5,
): SearchCoverageLocality[] {
  return coverage.topLocalitySuggestions.slice(0, limit);
}
