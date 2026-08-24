import { createSearch } from '@repo/geo-text';
import { OFFICIAL_GEO_CREATE_MECHANISM } from '../constants';
import type {
  LocationResolution,
  MissingCatalogEntry,
  SourceIssue,
} from '../types';
import type {
  CatalogLocality,
  CatalogProvince,
  OfflineGeoCatalog,
} from './caba-geo-catalog';
import { DEFAULT_GEO_CATALOG } from './caba-geo-catalog';

export type CatalogLocationResolution = {
  location: LocationResolution;
  issues: SourceIssue[];
  catalogGap: Omit<MissingCatalogEntry, 'sourceIds'> | null;
};

function emptyLocation(
  extras: Partial<LocationResolution> = {},
): LocationResolution {
  return {
    provinceName: null,
    provinceSlug: null,
    provinceIsoCode: null,
    provinceId: null,
    localityName: null,
    localitySlug: null,
    localitySearch: null,
    localityId: null,
    status: 'unresolved',
    evidence: [],
    candidates: [],
    ...extras,
  };
}

export function findCanonicalProvince(
  provinceName: string | null | undefined,
  catalog: OfflineGeoCatalog = DEFAULT_GEO_CATALOG,
): CatalogProvince | null {
  if (!provinceName?.trim()) {
    return null;
  }

  const search = createSearch(provinceName);
  const matches = catalog.provinces.filter(
    (province) => province.search === search || province.aliases.has(search),
  );

  if (matches.length === 1) {
    return matches[0];
  }

  return null;
}

export function findCanonicalLocality(
  province: CatalogProvince,
  localityName: string,
): {
  status: 'resolved' | 'ambiguous' | 'missing';
  matches: CatalogLocality[];
} {
  const search = createSearch(localityName);
  const matches = province.localities.filter(
    (locality) => locality.search === search,
  );

  if (matches.length === 1) {
    return { status: 'resolved', matches };
  }
  if (matches.length > 1) {
    return { status: 'ambiguous', matches };
  }
  return { status: 'missing', matches };
}

export function resolveAgainstCatalog(input: {
  provinceName: string | null;
  localityName: string | null;
  evidence: string[];
  candidates: string[];
  catalog?: OfflineGeoCatalog;
}): CatalogLocationResolution {
  const catalog = input.catalog ?? DEFAULT_GEO_CATALOG;
  const evidence = [...input.evidence];
  const candidates = [...input.candidates];

  const province = findCanonicalProvince(input.provinceName, catalog);
  if (!province) {
    const required = input.provinceName?.trim() || '(missing province)';
    const issue: SourceIssue = {
      code: 'MISSING_CATALOG_PROVINCE',
      severity: 'error',
      blocking: true,
      message: `Province "${required}" was not found in the geo catalog. Import is blocked; do not create a duplicate Capital Federal/CABA province.`,
    };
    return {
      location: emptyLocation({
        provinceName: input.provinceName,
        localityName: input.localityName,
        status: 'missing',
        evidence,
        candidates,
      }),
      issues: [issue],
      catalogGap: {
        kind: 'province',
        model: 'Province',
        requiredName: required,
        provinceName: required,
        provinceSlug: null,
        officialCreateMechanism: OFFICIAL_GEO_CREATE_MECHANISM,
      },
    };
  }

  const provinceFields = {
    provinceName: province.name,
    provinceSlug: province.slug,
    provinceIsoCode: province.isoCode,
    provinceId: null,
  };

  if (!input.localityName?.trim()) {
    return {
      location: emptyLocation({
        ...provinceFields,
        status: 'unresolved',
        evidence,
        candidates,
      }),
      issues: [],
      catalogGap: null,
    };
  }

  const localityResult = findCanonicalLocality(province, input.localityName);

  if (localityResult.status === 'ambiguous') {
    const names = localityResult.matches.map((item) => item.name);
    return {
      location: emptyLocation({
        ...provinceFields,
        status: 'ambiguous',
        evidence,
        candidates: names,
      }),
      issues: [
        {
          code: 'AMBIGUOUS_LOCALITY',
          severity: 'error',
          blocking: true,
          message: `Multiple catalog localities match "${input.localityName}" under ${province.name}: ${names.join(', ')}.`,
        },
      ],
      catalogGap: null,
    };
  }

  if (localityResult.status === 'missing') {
    return {
      location: emptyLocation({
        ...provinceFields,
        localityName: input.localityName,
        status: 'missing',
        evidence,
        candidates,
      }),
      issues: [
        {
          code: 'MISSING_CATALOG_LOCALITY',
          severity: 'error',
          blocking: true,
          message: `Locality "${input.localityName}" does not exist under ${province.name} (${province.slug}). Do not substitute another barrio. Create it via the official geo catalog mechanism before import.`,
        },
      ],
      catalogGap: {
        kind: 'locality',
        model: 'Locality',
        requiredName: input.localityName,
        provinceName: province.name,
        provinceSlug: province.slug,
        officialCreateMechanism: OFFICIAL_GEO_CREATE_MECHANISM,
      },
    };
  }

  const locality = localityResult.matches[0];
  return {
    location: {
      ...provinceFields,
      localityName: locality.name,
      localitySlug: locality.slug,
      localitySearch: locality.search,
      localityId: null,
      status: 'resolved',
      evidence,
      candidates: [locality.name],
    },
    issues: [],
    catalogGap: null,
  };
}
