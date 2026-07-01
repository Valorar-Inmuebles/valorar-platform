import {
  buildGeoTextFields,
  createSlug,
  ensureUniqueSlug,
} from '@repo/geo-text';

export type ResolvedGeoTextFields = {
  slug: string;
  search: string;
};

/**
 * Derives slug/search from a geographic entity name.
 * Apply ensureUniqueSlug separately when slug must be unique within a parent scope.
 */
export function resolveGeoTextFields(name: string): ResolvedGeoTextFields {
  return buildGeoTextFields(name);
}

export function resolveUniqueGeoSlug(
  name: string,
  usedSlugs: Set<string>,
): ResolvedGeoTextFields {
  const { search } = buildGeoTextFields(name);
  const slug = ensureUniqueSlug(createSlug(name), usedSlugs);

  return { slug, search };
}

export { buildGeoTextFields, createSearch, createSlug, ensureUniqueSlug } from '@repo/geo-text';
