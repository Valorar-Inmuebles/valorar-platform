export type SearchCoverageLocality = {
  /** Stable React key — localityId when available, otherwise provinceId::normalizedName */
  id: string;
  provinceId: string;
  provinceName: string;
  localityId?: string;
  neighborhoodId?: string;
  name: string;
  propertyCount: number;
};

export type SearchCoverageLocationKind = "province" | "locality" | "neighborhood";

export type SearchCoverageLocation = {
  id: string;
  kind: SearchCoverageLocationKind;
  name: string;
  provinceId: string;
  provinceName: string;
  localityId?: string;
  neighborhoodId?: string;
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
  /** Barrios outside CABA when neighborhood differs from city/locality. */
  neighborhoodsByProvince?: Record<string, SearchCoverageLocation[]>;
  /** Top mixed locations by published inventory count (max 5). */
  topLocationSuggestions: SearchCoverageLocation[];
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

export function getLocationKindLabel(kind: SearchCoverageLocationKind): string {
  switch (kind) {
    case "province":
      return "Provincia";
    case "locality":
      return "Localidad";
    case "neighborhood":
      return "Barrio";
  }
}

export function getLocationKindIcon(kind: SearchCoverageLocationKind): string {
  switch (kind) {
    case "province":
      return "📍";
    case "locality":
      return "🏙";
    case "neighborhood":
      return "📌";
  }
}

export function getAllCoverageLocations(
  coverage: SearchCoverage,
): SearchCoverageLocation[] {
  const locations: SearchCoverageLocation[] = [];

  for (const province of coverage.provinces) {
    const provinceLocalities = coverage.localitiesByProvince[province.id] ?? [];
    const propertyCount = provinceLocalities.reduce(
      (sum, locality) => sum + locality.propertyCount,
      0,
    );

    if (propertyCount > 0) {
      locations.push({
        id: `province:${province.id}`,
        kind: "province",
        name: province.name,
        provinceId: province.id,
        provinceName: province.name,
        propertyCount,
      });
    }
  }

  for (const province of coverage.provinces) {
    const provinceLocalities = coverage.localitiesByProvince[province.id] ?? [];
    const isCaba = isCabaProvince(province);

    for (const locality of provinceLocalities) {
      locations.push({
        id: locality.id,
        kind: isCaba ? "neighborhood" : "locality",
        name: locality.name,
        provinceId: locality.provinceId,
        provinceName: locality.provinceName,
        localityId: locality.localityId,
        neighborhoodId: locality.neighborhoodId,
        propertyCount: locality.propertyCount,
      });
    }
  }

  if (coverage.neighborhoodsByProvince) {
    for (const neighborhoods of Object.values(coverage.neighborhoodsByProvince)) {
      locations.push(...neighborhoods);
    }
  }

  return locations;
}

export function filterCoverageLocations(
  locations: SearchCoverageLocation[],
  query: string,
  limit = 20,
): SearchCoverageLocation[] {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return locations.slice(0, limit);
  }

  return locations
    .filter((location) =>
      normalizeSearchText(location.name).includes(normalizedQuery),
    )
    .slice(0, limit);
}

export function getTopLocationSuggestions(
  coverage: SearchCoverage,
  limit = 5,
): SearchCoverageLocation[] {
  return coverage.topLocationSuggestions.slice(0, limit);
}
