import type { CatalogResolution } from '../types';

/**
 * @deprecated Pilot-era Flores-only helpers. Prefer {@link evaluateCatalogLocalityGate}
 * from `./assert-resolved-locality`. Kept for unit coverage of the original exact Flores
 * resolver used during E.9–E.10.
 */
export type FloresLocalityRow = {
  id: string;
  name: string;
  slug: string;
  provinceId: string;
  provinceName: string;
  countryId: string;
  countryIso2: string;
};

export type ExactFloresResolution =
  | { ok: true; locality: FloresLocalityRow }
  | { ok: false; errors: string[] };

export type FloresLocalityPrisma = {
  country: {
    findFirst: (args: unknown) => Promise<{ id: string; iso2: string } | null>;
  };
  province: {
    findMany: (
      args: unknown,
    ) => Promise<
      Array<{ id: string; name: string; search: string; countryId: string }>
    >;
  };
  locality: {
    findMany: (
      args: unknown,
    ) => Promise<
      Array<{ id: string; name: string; slug: string; provinceId: string }>
    >;
  };
};

/**
 * Exact Flores locality under Capital Federal / AR — no ILIKE fuzzy, no LIMIT tricks.
 * Retained for pilot regression tests; production import no longer requires Flores-only.
 */
export async function resolveExactFloresLocality(
  prisma: FloresLocalityPrisma,
): Promise<ExactFloresResolution> {
  const country = await prisma.country.findFirst({
    where: { iso2: 'AR' },
    select: { id: true, iso2: true },
  });
  if (!country) {
    return { ok: false, errors: ['Country AR not found.'] };
  }

  const provinces = await prisma.province.findMany({
    where: { countryId: country.id },
    select: { id: true, name: true, search: true, countryId: true },
  });
  const caba = provinces.find(
    (p) =>
      p.search === 'capitalfederal' ||
      p.search === 'caba' ||
      /ciudad autonoma|capital federal|caba/i.test(p.name),
  );
  if (!caba) {
    return {
      ok: false,
      errors: ['Capital Federal / CABA province not found.'],
    };
  }

  const localities = await prisma.locality.findMany({
    where: { provinceId: caba.id, slug: 'flores' },
    select: { id: true, name: true, slug: true, provinceId: true },
  });

  if (localities.length === 0) {
    return {
      ok: false,
      errors: ['Locality slug=flores not found under Capital Federal.'],
    };
  }
  if (localities.length > 1) {
    return {
      ok: false,
      errors: [
        `Ambiguous locality slug=flores under Capital Federal (${localities.length} rows).`,
      ],
    };
  }

  const locality = localities[0];
  return {
    ok: true,
    locality: {
      id: locality.id,
      name: locality.name,
      slug: locality.slug,
      provinceId: caba.id,
      provinceName: caba.name,
      countryId: country.id,
      countryIso2: country.iso2,
    },
  };
}

/**
 * @deprecated Use {@link catalogsIncludeResolvedLocality}. Flores remains a valid resolved locality.
 */
export function catalogsIncludeExactFlores(
  catalogs: CatalogResolution[],
  expectedLocalityId?: string,
): boolean {
  const hit = catalogs.find(
    (c) => c.key === 'localityId' && c.status === 'resolved',
  );
  if (!hit) return false;
  const value = hit.value as {
    id?: string;
    slug?: string;
    name?: string;
  } | null;
  if (!value?.id) return false;
  if (expectedLocalityId && value.id !== expectedLocalityId) return false;
  if (value.slug && value.slug !== 'flores') return false;
  return true;
}
