import type { PrismaClient } from '../../generated/prisma/client';
import { createSearch } from '@repo/geo-text';

export type PropertyGeoBackfillStats = {
  totalProperties: number;
  countryMatched: number;
  provinceMatched: number;
  localityMatched: number;
  neighborhoodMatched: number;
  fullyMatched: number;
};

const CABA_CITY_SEARCHES = new Set([
  'ciudadautonomadebuenosaires',
  'caba',
  'capitalfederal',
  'ciudaddebuenosaires',
  'capfed',
]);

export async function backfillPropertyGeoFks(
  prisma: PrismaClient,
): Promise<PropertyGeoBackfillStats> {
  const properties = await prisma.property.findMany({
    select: {
      id: true,
      country: true,
      province: true,
      city: true,
      neighborhood: true,
    },
  });

  const countries = await prisma.country.findMany();
  const provinces = await prisma.province.findMany();
  const localities = await prisma.locality.findMany();
  const neighborhoods = await prisma.neighborhood.findMany();

  const countryByIso = new Map(
    countries.map((country) => [country.iso2.toUpperCase(), country]),
  );
  const countryBySearch = new Map(
    countries.map((country) => [country.search, country]),
  );
  const provincesByCountrySearch = new Map<
    string,
    Map<string, (typeof provinces)[0]>
  >();
  const localitiesByProvinceSearch = new Map<
    string,
    Map<string, (typeof localities)[0]>
  >();
  const neighborhoodsByLocalitySearch = new Map<
    string,
    Map<string, (typeof neighborhoods)[0]>
  >();

  for (const province of provinces) {
    const bucket =
      provincesByCountrySearch.get(province.countryId) ?? new Map();
    bucket.set(province.search, province);
    provincesByCountrySearch.set(province.countryId, bucket);
  }

  for (const locality of localities) {
    const bucket =
      localitiesByProvinceSearch.get(locality.provinceId) ?? new Map();
    bucket.set(locality.search, locality);
    localitiesByProvinceSearch.set(locality.provinceId, bucket);
  }

  for (const neighborhood of neighborhoods) {
    const bucket =
      neighborhoodsByLocalitySearch.get(neighborhood.localityId) ?? new Map();
    bucket.set(neighborhood.search, neighborhood);
    neighborhoodsByLocalitySearch.set(neighborhood.localityId, bucket);
  }

  let countryMatched = 0;
  let provinceMatched = 0;
  let localityMatched = 0;
  let neighborhoodMatched = 0;
  let fullyMatched = 0;

  for (const property of properties) {
    const country =
      countryByIso.get(property.country.toUpperCase()) ??
      countryBySearch.get(createSearch(property.country)) ??
      null;

    let province =
      country && property.province
        ? (provincesByCountrySearch
            .get(country.id)
            ?.get(createSearch(property.province)) ?? null)
        : null;

    if (!province && country) {
      const citySearch = createSearch(property.city);
      if (CABA_CITY_SEARCHES.has(citySearch)) {
        province =
          provincesByCountrySearch.get(country.id)?.get('capitalfederal') ??
          null;
      }
    }

    let locality = province
      ? (localitiesByProvinceSearch
          .get(province.id)
          ?.get(createSearch(property.city)) ?? null)
      : null;

    if (!locality && province && property.neighborhood) {
      locality =
        localitiesByProvinceSearch
          .get(province.id)
          ?.get(createSearch(property.neighborhood)) ?? null;
    }

    let neighborhood =
      locality && property.neighborhood
        ? (neighborhoodsByLocalitySearch
            .get(locality.id)
            ?.get(createSearch(property.neighborhood)) ?? null)
        : null;

    if (neighborhood && neighborhood.search === locality?.search) {
      neighborhood = null;
    }

    await prisma.property.update({
      where: { id: property.id },
      data: {
        countryId: country?.id ?? null,
        provinceId: province?.id ?? null,
        localityId: locality?.id ?? null,
        neighborhoodId: neighborhood?.id ?? null,
      },
    });

    if (country) countryMatched += 1;
    if (province) provinceMatched += 1;
    if (locality) localityMatched += 1;
    if (neighborhood) neighborhoodMatched += 1;
    if (country && province && locality) fullyMatched += 1;
  }

  await prisma.$executeRaw`
    DELETE FROM "PropertyGeoMigrationAudit" WHERE "id" = 'geo-002-backfill'
  `;

  await prisma.$executeRaw`
    INSERT INTO "PropertyGeoMigrationAudit" (
      "id",
      "totalProperties",
      "countryMatched",
      "provinceMatched",
      "localityMatched",
      "neighborhoodMatched",
      "fullyMatched"
    ) VALUES (
      'geo-002-backfill',
      ${properties.length},
      ${countryMatched},
      ${provinceMatched},
      ${localityMatched},
      ${neighborhoodMatched},
      ${fullyMatched}
    )
  `;

  return {
    totalProperties: properties.length,
    countryMatched,
    provinceMatched,
    localityMatched,
    neighborhoodMatched,
    fullyMatched,
  };
}
