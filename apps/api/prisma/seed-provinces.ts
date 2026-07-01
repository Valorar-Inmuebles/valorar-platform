import type { Country, PrismaClient, Province } from '../generated/prisma/client';
import {
  CABA_PROVINCE_NAME,
  isCabaProvinceKey,
  isCabaProvinceName,
  parseProvinciasImportSql,
  readGeoImportSql,
} from './seed-utils/parse-geo-import-sql';
import { resolveUniqueGeoSlug } from './seed-utils/geo-text-fields';

export type ProvinceSeedMaps = {
  byProvinceKey: Map<string, Province>;
  cabaProvinceId: string;
};

function resolveProvinceName(name: string): string {
  if (isCabaProvinceName(name)) {
    return CABA_PROVINCE_NAME;
  }

  return name.trim();
}

export async function seedProvinces(
  prisma: PrismaClient,
  country: Country,
): Promise<{ count: number; maps: ProvinceSeedMaps }> {
  const rows = parseProvinciasImportSql(readGeoImportSql('provincias.sql')).filter(
    (row) => row.active,
  );
  const cabaRow = rows.find(
    (row) => isCabaProvinceKey(row.provinceKey) || isCabaProvinceName(row.name),
  );
  const otherRows = rows.filter((row) => row !== cabaRow);
  const orderedRows = cabaRow ? [cabaRow, ...otherRows] : rows;
  const byProvinceKey = new Map<string, Province>();
  const usedSlugs = new Set<string>();
  let cabaProvinceId = '';
  let count = 0;

  for (const row of orderedRows) {
    const name = resolveProvinceName(row.name);
    const textFields = resolveUniqueGeoSlug(name, usedSlugs);

    const province = await prisma.province.upsert({
      where: {
        countryId_name: {
          countryId: country.id,
          name,
        },
      },
      update: {
        isoCode: row.isoCode,
        slug: textFields.slug,
        search: textFields.search,
      },
      create: {
        countryId: country.id,
        name,
        isoCode: row.isoCode,
        slug: textFields.slug,
        search: textFields.search,
      },
    });

    byProvinceKey.set(row.provinceKey, province);

    if (isCabaProvinceKey(row.provinceKey) || isCabaProvinceName(row.name)) {
      cabaProvinceId = province.id;
    }

    count += 1;
  }

  if (!cabaProvinceId) {
    throw new Error('Capital Federal province not found in provincias.sql');
  }

  return {
    count,
    maps: {
      byProvinceKey,
      cabaProvinceId,
    },
  };
}
