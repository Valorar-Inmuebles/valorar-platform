import type { CatalogResolution } from '../types';

export type ResolvedLocalityValue = {
  id: string;
  slug: string;
  name: string;
};

export type CatalogLocalityGateResult =
  | {
      ok: true;
      locality: ResolvedLocalityValue;
      warnings: Array<{ code: string; message: string }>;
      blockers: [];
    }
  | {
      ok: false;
      locality: ResolvedLocalityValue | null;
      warnings: Array<{ code: string; message: string }>;
      blockers: Array<{ code: string; message: string }>;
    };

/**
 * Production locality gate (post-pilot):
 * - Accept any barrio/locality that catalog resolution already mapped exactly
 *   (CABA Locality via search match — including Flores).
 * - Refuse unresolved / ambiguous / missing localityId (no silent remap).
 * - Refuse when country/province catalogs are unresolved.
 *
 * This replaces the temporary Flores-only hard gate used for the first pilot.
 */
export function evaluateCatalogLocalityGate(
  catalogs: CatalogResolution[],
): CatalogLocalityGateResult {
  const blockers: Array<{ code: string; message: string }> = [];
  const warnings: Array<{ code: string; message: string }> = [];

  const country = catalogs.find((c) => c.key === 'countryId');
  if (!country || country.status !== 'resolved') {
    blockers.push({
      code: 'GEO_COUNTRY_UNRESOLVED',
      message:
        'Production import requires resolved countryId (iso2=AR) in catalogs.',
    });
  }

  const province = catalogs.find((c) => c.key === 'provinceId');
  if (!province || province.status !== 'resolved') {
    blockers.push({
      code: 'GEO_PROVINCE_UNRESOLVED',
      message:
        'Production import requires resolved provinceId (Capital Federal or explicit allowlisted province).',
    });
  }

  const localityHit = catalogs.find((c) => c.key === 'localityId');
  if (!localityHit) {
    blockers.push({
      code: 'LOCALITY_UNRESOLVED',
      message: 'Catalogs missing localityId entry — refusing import.',
    });
    return { ok: false, locality: null, warnings, blockers };
  }

  if (localityHit.status !== 'resolved') {
    blockers.push({
      code: 'LOCALITY_UNRESOLVED',
      message: `Locality/barrio not mapped to geo catalog (status=${localityHit.status}): ${localityHit.detail}`,
    });
    return { ok: false, locality: null, warnings, blockers };
  }

  const value = localityHit.value as ResolvedLocalityValue | null;
  if (!value?.id || !value.slug || !value.name) {
    blockers.push({
      code: 'LOCALITY_UNRESOLVED',
      message:
        'Resolved localityId payload incomplete (requires id, slug, name) — refusing silent import.',
    });
    return { ok: false, locality: null, warnings, blockers };
  }

  if (blockers.length) {
    return { ok: false, locality: value, warnings, blockers };
  }

  warnings.push({
    code: 'LOCALITY_RESOLVED',
    message: `Mapped barrio/locality → slug=${value.slug} name=${value.name} id=${value.id}.`,
  });

  return { ok: true, locality: value, warnings, blockers: [] };
}

/** True when catalogs contain a resolved localityId with id+slug (any known CABA barrio). */
export function catalogsIncludeResolvedLocality(
  catalogs: CatalogResolution[],
): boolean {
  return evaluateCatalogLocalityGate(catalogs).ok;
}
