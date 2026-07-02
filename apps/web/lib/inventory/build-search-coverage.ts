import type { GeoProvince } from "@repo/shared-types";
import { getProvinces } from "@/lib/api/geo";
import type { InventoryGeoSource } from "@/lib/inventory/inventory-geo-source";
import {
  isCabaProvince,
  normalizeSearchText,
  type SearchCoverage,
  type SearchCoverageLocality,
  type SearchCoverageProvince,
} from "@/lib/inventory/search-coverage.types";

const EMPTY_COVERAGE: SearchCoverage = {
  provinces: [],
  localitiesByProvince: {},
  singleProvince: false,
  isCabaOnly: false,
  topLocalitySuggestions: [],
};

const CABA_LEGACY_ALIASES = [
  "capital federal",
  "ciudad autonoma de buenos aires",
  "ciudad autónoma de buenos aires",
  "caba",
];

function resolveProvinceFromItem(
  item: InventoryGeoSource,
  provinceById: Map<string, GeoProvince>,
  provinceByName: Map<string, GeoProvince>,
): GeoProvince | null {
  if (item.provinceId) {
    return provinceById.get(item.provinceId) ?? null;
  }

  const provinceName = item.provinceName?.trim();
  if (!provinceName) {
    return null;
  }

  return provinceByName.get(normalizeSearchText(provinceName)) ?? null;
}

function resolveLocalityName(
  item: InventoryGeoSource,
  province: GeoProvince | null,
): string | null {
  if (item.localityName?.trim()) {
    return item.localityName.trim();
  }

  if (province && isCabaProvince(province)) {
    return item.neighborhood?.trim() || item.city?.trim() || null;
  }

  return item.city?.trim() || item.neighborhood?.trim() || null;
}

function buildProvinceNameIndex(
  geoProvinces: GeoProvince[],
): Map<string, GeoProvince> {
  const provinceByName = new Map<string, GeoProvince>();

  for (const province of geoProvinces) {
    provinceByName.set(normalizeSearchText(province.name), province);

    if (isCabaProvince(province)) {
      for (const alias of CABA_LEGACY_ALIASES) {
        provinceByName.set(alias, province);
      }
    }
  }

  return provinceByName;
}

export async function buildSearchCoverage(
  items: InventoryGeoSource[],
): Promise<SearchCoverage> {
  if (items.length === 0) {
    return EMPTY_COVERAGE;
  }

  let geoProvinces: GeoProvince[] = [];

  try {
    geoProvinces = await getProvinces();
  } catch {
    geoProvinces = [];
  }

  const provinceById = new Map(geoProvinces.map((province) => [province.id, province]));
  const provinceByName = buildProvinceNameIndex(geoProvinces);
  const provinceMap = new Map<string, SearchCoverageProvince>();
  const localityMap = new Map<string, SearchCoverageLocality>();

  for (const item of items) {
    const province = resolveProvinceFromItem(item, provinceById, provinceByName);

    if (!province) {
      continue;
    }

    provinceMap.set(province.id, {
      id: province.id,
      name: province.name,
      slug: province.slug,
      isoCode: province.isoCode,
    });

    const localityName = resolveLocalityName(item, province);
    if (!localityName) {
      continue;
    }

    const localityKey = `${province.id}::${normalizeSearchText(localityName)}`;
    const existing = localityMap.get(localityKey);

    if (!existing) {
      localityMap.set(localityKey, {
        id: item.localityId ?? localityKey,
        provinceId: province.id,
        provinceName: province.name,
        localityId: item.localityId ?? undefined,
        name: localityName,
        propertyCount: 1,
      });
      continue;
    }

    const nextCount = existing.propertyCount + 1;

    if (!existing.localityId && item.localityId) {
      localityMap.set(localityKey, {
        ...existing,
        id: item.localityId,
        localityId: item.localityId,
        propertyCount: nextCount,
      });
      continue;
    }

    localityMap.set(localityKey, {
      ...existing,
      propertyCount: nextCount,
    });
  }

  const provinces = [...provinceMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  );

  const localitiesByProvince: Record<string, SearchCoverageLocality[]> = {};
  const allLocalities = [...localityMap.values()];

  for (const locality of allLocalities) {
    const bucket = localitiesByProvince[locality.provinceId] ?? [];
    bucket.push(locality);
    localitiesByProvince[locality.provinceId] = bucket;
  }

  for (const provinceId of Object.keys(localitiesByProvince)) {
    localitiesByProvince[provinceId]?.sort((a, b) =>
      a.name.localeCompare(b.name, "es"),
    );
  }

  const topLocalitySuggestions = allLocalities
    .sort(
      (a, b) =>
        b.propertyCount - a.propertyCount ||
        a.name.localeCompare(b.name, "es"),
    )
    .slice(0, 5);

  const singleProvince = provinces.length === 1;
  const soleProvince = provinces[0];

  return {
    provinces,
    localitiesByProvince,
    singleProvince,
    isCabaOnly: singleProvince && soleProvince != null && isCabaProvince(soleProvince),
    defaultProvinceId: singleProvince ? soleProvince?.id : undefined,
    topLocalitySuggestions,
  };
}
