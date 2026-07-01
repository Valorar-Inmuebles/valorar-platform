import { describe, expect, it } from 'vitest';
import { buildGeoTextFields } from './build-geo-text-fields';
import { createSearch } from './create-search';
import { createSlug } from './create-slug';
import { ensureUniqueSlug } from './ensure-unique-slug';

describe('createSlug', () => {
  it('normalizes names for URLs', () => {
    expect(createSlug('Potrero de Márquez')).toBe('potrero-de-marquez');
    expect(createSlug('José C. Paz')).toBe('jose-c-paz');
    expect(createSlug('Ciudad Autónoma de Buenos Aires')).toBe(
      'ciudad-autonoma-de-buenos-aires',
    );
  });
});

describe('createSearch', () => {
  it('normalizes names for lookup', () => {
    expect(createSearch('Potrero de Márquez')).toBe('potrerodemarquez');
    expect(createSearch('José C. Paz')).toBe('josecpaz');
    expect(createSearch('Villa General Belgrano')).toBe('villageneralbelgrano');
    expect(createSearch('Lanús')).toBe('lanus');
  });
});

describe('buildGeoTextFields', () => {
  it('derives slug and search from the same name', () => {
    expect(buildGeoTextFields('Palermo')).toEqual({
      slug: 'palermo',
      search: 'palermo',
    });
  });
});

describe('ensureUniqueSlug', () => {
  it('appends suffix when slug is already used', () => {
    const used = new Set<string>(['palermo']);

    expect(ensureUniqueSlug('palermo', used)).toBe('palermo-2');
    expect(used.has('palermo-2')).toBe(true);
  });
});
