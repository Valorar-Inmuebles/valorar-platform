import {
  catalogsIncludeResolvedLocality,
  evaluateCatalogLocalityGate,
} from './assert-resolved-locality';
import type { CatalogResolution } from '../types';

function baseCatalogs(locality: CatalogResolution | null): CatalogResolution[] {
  const rows: CatalogResolution[] = [
    {
      key: 'countryId',
      status: 'resolved',
      detail: 'AR',
      value: { id: 'c-ar', iso2: 'AR' },
    },
    {
      key: 'provinceId',
      status: 'resolved',
      detail: 'CABA',
      value: { id: 'p-caba', name: 'CABA' },
    },
  ];
  if (locality) rows.push(locality);
  return rows;
}

describe('evaluateCatalogLocalityGate', () => {
  it('allows Flores when resolved', () => {
    const result = evaluateCatalogLocalityGate(
      baseCatalogs({
        key: 'localityId',
        status: 'resolved',
        detail: 'ok',
        value: { id: 'loc-flores', slug: 'flores', name: 'Flores' },
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.locality.slug).toBe('flores');
    expect(result.warnings.some((w) => w.code === 'LOCALITY_RESOLVED')).toBe(
      true,
    );
  });

  it('allows other known CABA barrios (Caballito)', () => {
    const catalogs = baseCatalogs({
      key: 'localityId',
      status: 'resolved',
      detail: 'ok',
      value: { id: 'loc-cab', slug: 'caballito', name: 'Caballito' },
    });
    const result = evaluateCatalogLocalityGate(catalogs);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.locality.slug).toBe('caballito');
    expect(catalogsIncludeResolvedLocality(catalogs)).toBe(true);
  });

  it('blocks unknown / unresolved locality', () => {
    const result = evaluateCatalogLocalityGate(
      baseCatalogs({
        key: 'localityId',
        status: 'unresolved',
        detail: 'No exact locality search match for "Barrio Inventado".',
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.blockers.some((b) => b.code === 'LOCALITY_UNRESOLVED')).toBe(
      true,
    );
  });

  it('blocks missing localityId entry', () => {
    const result = evaluateCatalogLocalityGate(baseCatalogs(null));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.blockers.some((b) => b.code === 'LOCALITY_UNRESOLVED')).toBe(
      true,
    );
  });

  it('blocks incomplete resolved payload (no silent normalize)', () => {
    const result = evaluateCatalogLocalityGate(
      baseCatalogs({
        key: 'localityId',
        status: 'resolved',
        detail: 'partial',
        value: { id: 'x' },
      }),
    );
    expect(result.ok).toBe(false);
  });

  it('blocks when province unresolved even if locality resolved', () => {
    const result = evaluateCatalogLocalityGate([
      {
        key: 'countryId',
        status: 'resolved',
        detail: 'AR',
        value: { id: 'c-ar', iso2: 'AR' },
      },
      {
        key: 'provinceId',
        status: 'unresolved',
        detail: 'missing',
      },
      {
        key: 'localityId',
        status: 'resolved',
        detail: 'ok',
        value: { id: 'loc-flores', slug: 'flores', name: 'Flores' },
      },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(
      result.blockers.some((b) => b.code === 'GEO_PROVINCE_UNRESOLVED'),
    ).toBe(true);
  });
});
