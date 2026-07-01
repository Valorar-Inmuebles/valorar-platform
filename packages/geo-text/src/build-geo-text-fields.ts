import { createSearch } from './create-search';
import { createSlug } from './create-slug';

export type GeoTextFields = {
  slug: string;
  search: string;
};

export function buildGeoTextFields(name: string): GeoTextFields {
  return {
    slug: createSlug(name),
    search: createSearch(name),
  };
}
