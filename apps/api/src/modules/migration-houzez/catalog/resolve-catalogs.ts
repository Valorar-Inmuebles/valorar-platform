import { createSearch } from '@repo/geo-text';
import type { CatalogResolution } from '../types';
import type { PublishTransformResult } from '../transform/publish-rules';

const FEATURE_SLUG_MAP: Record<string, string> = {
  Pavimento: 'pavimento', // may not exist in catalog
  Balcon: 'balcon',
  Lavadero: 'lavadero',
  Cocina: 'cocina',
  Terraza: 'terraza',
  'Apto Profesional': 'apto-profesional',
  'Apto Oficina': 'apto-oficina',
  'Cochera Fija': 'cochera-fija',
  'Uso Comercial': 'uso-comercial',
  Baulera: 'baulera',
  Patio: 'patio',
  Dependencia: 'dependencia',
  Parrilla: 'parrilla',
  SUM: 'sum',
  Piscina: 'pileta',
};

const CABA_CITY_SEARCHES = new Set([
  'ciudadautonomadebuenosaires',
  'caba',
  'capitalfederal',
  'ciudaddebuenosaires',
  'capfed',
]);

export type CatalogPrisma = {
  propertyFeature: {
    findMany: (
      args: unknown,
    ) => Promise<Array<{ id: string; slug: string; name: string }>>;
  };
  country: {
    findFirst: (
      args: unknown,
    ) => Promise<{ id: string; name: string; iso2: string } | null>;
  };
  province: {
    findMany: (
      args: unknown,
    ) => Promise<
      Array<{ id: string; name: string; search: string; countryId: string }>
    >;
  };
  locality: {
    findMany: (args: unknown) => Promise<
      Array<{
        id: string;
        name: string;
        search: string;
        provinceId: string;
        slug: string;
      }>
    >;
  };
};

export async function resolveCatalogsForTransform(input: {
  prisma: CatalogPrisma | null;
  transform: PublishTransformResult;
}): Promise<CatalogResolution[]> {
  const results: CatalogResolution[] = [];

  results.push({
    key: 'propertyType',
    status: 'resolved',
    value: input.transform.property.propertyType,
    detail: 'Enum PropertyType — no DB row required.',
  });
  results.push({
    key: 'listingType',
    status: 'resolved',
    value: input.transform.listing.listingType,
    detail: 'Enum PropertyListingType.',
  });
  results.push({
    key: 'listingStatus',
    status: 'resolved',
    value: input.transform.listing.status,
    detail: 'Enum PropertyListingStatus.',
  });
  if (input.transform.price) {
    results.push({
      key: 'currency',
      status: 'resolved',
      value: input.transform.price.currency,
      detail: 'Enum Currency.',
    });
  } else {
    results.push({
      key: 'currency',
      status: 'unresolved',
      detail: 'No price payload.',
    });
  }

  if (!input.prisma) {
    results.push({
      key: 'geo',
      status: 'unresolved',
      detail: 'Prisma client unavailable — geo resolution skipped.',
    });
    for (const name of input.transform.featureNames) {
      results.push({
        key: `feature:${name}`,
        status: 'unresolved',
        detail: 'Prisma unavailable; feature not resolved.',
      });
    }
    return results;
  }

  const country = await input.prisma.country.findFirst({
    where: { iso2: 'AR' },
  });
  results.push(
    country
      ? {
          key: 'countryId',
          status: 'resolved',
          value: { id: country.id, iso2: country.iso2 },
          detail: 'Matched Country iso2=AR.',
        }
      : {
          key: 'countryId',
          status: 'unresolved',
          detail: 'Country AR not found in geo catalog.',
        },
  );

  const provinces = country
    ? await input.prisma.province.findMany({ where: { countryId: country.id } })
    : [];
  const cabaProvince =
    provinces.find((p) => CABA_CITY_SEARCHES.has(p.search)) ||
    provinces.find((p) => /ciudad autonoma|capital federal|caba/i.test(p.name));

  results.push(
    cabaProvince
      ? {
          key: 'provinceId',
          status: 'resolved',
          value: { id: cabaProvince.id, name: cabaProvince.name },
          detail: 'Matched CABA province via normalized search/name.',
        }
      : {
          key: 'provinceId',
          status: 'unresolved',
          detail: 'CABA/Capital Federal province not found.',
        },
  );

  const neighborhoodName = input.transform.property.neighborhood;
  let localityId: string | null = null;
  if (cabaProvince && neighborhoodName) {
    const localities = await input.prisma.locality.findMany({
      where: { provinceId: cabaProvince.id },
    });
    const want = createSearch(neighborhoodName);
    const exact = localities.filter((l) => l.search === want);
    if (exact.length === 1) {
      localityId = exact[0].id;
      results.push({
        key: 'localityId',
        status: 'resolved',
        value: { id: exact[0].id, name: exact[0].name, slug: exact[0].slug },
        detail: `Exact search match for barrio/locality "${neighborhoodName}" under CABA (barrios are Localities).`,
      });
    } else if (exact.length > 1) {
      results.push({
        key: 'localityId',
        status: 'unresolved',
        detail: `Ambiguous locality search="${want}" (${exact.length} hits) — not assigning localityId.`,
      });
    } else {
      results.push({
        key: 'localityId',
        status: 'unresolved',
        detail: `No exact locality search match for "${neighborhoodName}".`,
      });
    }
  } else {
    results.push({
      key: 'localityId',
      status: 'not_required',
      detail: 'No neighborhood taxonomy or province unresolved.',
    });
  }

  results.push({
    key: 'neighborhoodId',
    status: 'not_required',
    detail:
      'Geo model: CABA barrios are Localities; Neighborhood table is unused for CABA (count may be 0). Text neighborhood retained.',
  });

  // city text is required by Property when localityId absent
  results.push({
    key: 'city_text',
    status: 'resolved',
    value: input.transform.property.city,
    detail: localityId
      ? 'localityId preferred; city text kept for legacy compatibility.'
      : 'city text will be required on create if localityId unresolved.',
  });

  const features = await input.prisma.propertyFeature.findMany({
    where: { isActive: true },
  });
  const bySlug = new Map(features.map((f) => [f.slug, f]));

  for (const name of input.transform.featureNames) {
    const slug = FEATURE_SLUG_MAP[name] ?? slugifyFeature(name);
    const hit = bySlug.get(slug);
    if (hit) {
      results.push({
        key: `feature:${name}`,
        status: 'resolved',
        value: { id: hit.id, slug: hit.slug },
        detail: `Matched PropertyFeature slug=${hit.slug}.`,
      });
    } else {
      results.push({
        key: `feature:${name}`,
        status: 'omitted',
        detail: `No catalog match for "${name}" (tried slug=${slug}). Omit in V1; do not create catalog rows.`,
      });
    }
  }

  return results;
}

function slugifyFeature(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
