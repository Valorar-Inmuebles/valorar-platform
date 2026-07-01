import type { Prisma } from '../../generated/prisma/client';
import { resolveUniqueGeoSlug } from './geo-text-fields';
import type { SeedLocalityRow } from './dedupe-localities';
import type { ProvinceSeedMaps } from '../seed-provinces';

export type PreparedLocalityRecord = Prisma.LocalityCreateManyInput;

export function prepareLocalitySeedRecords(
  rows: SeedLocalityRow[],
  provinceMaps: ProvinceSeedMaps,
): PreparedLocalityRecord[] {
  const usedSlugsByProvince = new Map<string, Set<string>>();
  const records: PreparedLocalityRecord[] = [];

  for (const row of rows) {
    const province = provinceMaps.byProvinceKey.get(row.provinceKey);

    if (!province) {
      throw new Error(
        `Unknown province key "${row.provinceKey}" for locality "${row.name}"`,
      );
    }

    const usedSlugs =
      usedSlugsByProvince.get(province.id) ?? new Set<string>();
    usedSlugsByProvince.set(province.id, usedSlugs);
    const textFields = resolveUniqueGeoSlug(row.name, usedSlugs);

    records.push({
      provinceId: province.id,
      name: row.name,
      postalCode: row.postalCode,
      slug: textFields.slug,
      search: textFields.search,
    });
  }

  return records;
}
