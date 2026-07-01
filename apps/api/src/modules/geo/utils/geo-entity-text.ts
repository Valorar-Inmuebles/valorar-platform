import {
  buildGeoTextFields,
  createSearch,
  createSlug,
  ensureUniqueSlug,
  type GeoTextFields,
} from '@repo/geo-text';

/**
 * Centralizes slug/search derivation for geographic entities.
 * Use on every create or update so values stay in sync with `name`.
 */
export {
  buildGeoTextFields,
  createSearch,
  createSlug,
  ensureUniqueSlug,
  type GeoTextFields,
};

export function resolveGeoEntityTextFields(name: string): GeoTextFields {
  return buildGeoTextFields(name);
}
