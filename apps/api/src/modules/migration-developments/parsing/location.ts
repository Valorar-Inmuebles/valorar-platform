import { createSearch } from '@repo/geo-text';
import { CABA_LOCALITY_NAMES } from '../catalog/caba-geo-catalog';
import { DEFAULT_PROVINCE_NAME } from '../constants';
import type { LocationResolution, SourceIssue } from '../types';

export { CABA_LOCALITY_NAMES };

const STRONG_PATTERNS = [
  /barrio(?:\s+porte[nñ]o)?\s+de\s+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ ]{2,40})/gi,
  /en lo mejor(?:\s+del barrio)?\s+de\s+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ ]{2,40})/gi,
];

function matchKnownLocality(candidate: string): string | null {
  const normalized = createSearch(candidate.replace(/[.,;:!?].*$/, ''));
  const exact = CABA_LOCALITY_NAMES.filter(
    (name) => createSearch(name) === normalized,
  );
  if (exact.length === 1) {
    return exact[0];
  }
  return null;
}

function baseLocation(
  extras: Partial<LocationResolution> = {},
): LocationResolution {
  return {
    provinceName: DEFAULT_PROVINCE_NAME,
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

export function detectLocation(
  text: string,
  localityOverride?: string,
): { location: LocationResolution; issues: SourceIssue[] } {
  if (localityOverride) {
    return {
      location: baseLocation({
        localityName: localityOverride,
        status: 'resolved',
        evidence: [`Override: ${localityOverride}`],
        candidates: [localityOverride],
      }),
      issues: [],
    };
  }

  const strongHits = new Set<string>();
  const evidence: string[] = [];

  for (const pattern of STRONG_PATTERNS) {
    pattern.lastIndex = 0;
    let match = pattern.exec(text);
    while (match) {
      const locality = matchKnownLocality(match[1] ?? '');
      if (locality) {
        strongHits.add(locality);
        evidence.push(match[0].trim());
      }
      match = pattern.exec(text);
    }
  }

  const candidates = [...strongHits];
  const issues: SourceIssue[] = [];

  if (candidates.length === 1) {
    return {
      location: baseLocation({
        localityName: candidates[0],
        status: 'resolved',
        evidence,
        candidates,
      }),
      issues: [],
    };
  }

  if (candidates.length > 1) {
    issues.push({
      code: 'AMBIGUOUS_LOCALITY',
      severity: 'error',
      blocking: true,
      message: `Multiple localities detected: ${candidates.join(', ')}. Import is blocked until an override is defined.`,
    });
    return {
      location: baseLocation({
        status: 'ambiguous',
        evidence,
        candidates,
      }),
      issues,
    };
  }

  issues.push({
    code: 'UNRESOLVED_LOCALITY',
    severity: 'error',
    blocking: true,
    message:
      'Locality is not unequivocal in the source text. Import is blocked until an override is defined.',
  });

  return {
    location: baseLocation({
      status: 'unresolved',
      evidence,
      candidates: [],
    }),
    issues,
  };
}
