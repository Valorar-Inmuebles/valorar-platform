/** Allowed PropertyFeature slugs for DevelopmentTypology assignments. */
export const TYPOLOGY_FEATURE_SLUGS = [
  'banos',
  'bano-en-suite',
  'toilette',
  'cocina',
  'living',
  'comedor',
  'escritorio',
  'dependencia',
  'lavadero',
  'balcon',
  'terraza',
  'patio',
  'baulera',
] as const;

export type TypologyFeatureSlug = (typeof TYPOLOGY_FEATURE_SLUGS)[number];

const TYPOLOGY_FEATURE_SLUG_SET = new Set<string>(TYPOLOGY_FEATURE_SLUGS);

export function isAllowedTypologyFeatureSlug(slug: string): slug is TypologyFeatureSlug {
  return TYPOLOGY_FEATURE_SLUG_SET.has(slug);
}

export function compareTypologyFeatureSlugs(a: string, b: string): number {
  const indexA = TYPOLOGY_FEATURE_SLUGS.indexOf(a as TypologyFeatureSlug);
  const indexB = TYPOLOGY_FEATURE_SLUGS.indexOf(b as TypologyFeatureSlug);

  if (indexA === -1 && indexB === -1) {
    return a.localeCompare(b);
  }

  if (indexA === -1) {
    return 1;
  }

  if (indexB === -1) {
    return -1;
  }

  return indexA - indexB;
}
