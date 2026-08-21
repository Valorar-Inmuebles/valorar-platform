import { createSearch } from '@repo/geo-text';
import {
  CABA_PROVINCE_SEARCH_ALIASES,
  DEFAULT_GEO_CATALOG,
  type OfflineGeoCatalog,
} from './caba-geo-catalog';
import {
  findCanonicalLocality,
  findCanonicalProvince,
  resolveAgainstCatalog,
} from './resolve-geo';

function catalogWithExtraProvince(): OfflineGeoCatalog {
  return {
    provinces: [
      ...DEFAULT_GEO_CATALOG.provinces,
      {
        name: 'Neuquén',
        slug: 'neuquen',
        search: createSearch('Neuquén'),
        isoCode: 'AR-Q',
        aliases: new Set([createSearch('Neuquén')]),
        localities: [
          {
            name: 'Flores',
            slug: 'flores',
            search: createSearch('Flores'),
          },
        ],
      },
    ],
  };
}

describe('geo catalog resolution', () => {
  it('selects the canonical Capital Federal province from aliases', () => {
    for (const alias of [
      'Capital Federal',
      'capital federal',
      'Ciudad Autónoma de Buenos Aires',
      'ciudad autonoma de buenos aires',
      'CABA',
      'caba',
      'Ciudad de Buenos Aires',
      'Cap. Fed.',
    ]) {
      const province = findCanonicalProvince(alias);
      expect(province?.name).toBe('Capital Federal');
      expect(province?.slug).toBe('capital-federal');
      expect(province?.isoCode).toBe('AR-C');
      expect(CABA_PROVINCE_SEARCH_ALIASES.has(createSearch(alias))).toBe(true);
    }
  });

  it('does not create or select a second CABA province', () => {
    const catalog: OfflineGeoCatalog = {
      provinces: [
        DEFAULT_GEO_CATALOG.provinces[0],
        {
          ...DEFAULT_GEO_CATALOG.provinces[0],
          name: 'CABA',
          slug: 'caba',
          search: createSearch('CABA'),
        },
      ],
    };

    expect(findCanonicalProvince('CABA', catalog)).toBeNull();
  });

  it('resolves localities only inside the selected province', () => {
    const catalog = catalogWithExtraProvince();
    const caba = findCanonicalProvince('Capital Federal', catalog);
    const neuquen = findCanonicalProvince('Neuquén', catalog);
    expect(caba).toBeTruthy();
    expect(neuquen).toBeTruthy();

    const cabaFlores = findCanonicalLocality(caba!, 'FLORES');
    const neuquenFlores = findCanonicalLocality(neuquen!, 'Flores');
    expect(cabaFlores.status).toBe('resolved');
    expect(cabaFlores.matches[0]?.name).toBe('Flores');
    expect(neuquenFlores.matches[0]?.slug).toBe('flores');
    expect(caba).not.toBe(neuquen);
  });

  it('normalizes case, tildes and spaces without fuzzy matching', () => {
    const caba = findCanonicalProvince('Capital Federal')!;
    expect(findCanonicalLocality(caba, '  Caballito ').status).toBe('resolved');
    expect(findCanonicalLocality(caba, 'FLÓRESTA').matches[0]?.name).toBe(
      'Floresta',
    );
    expect(findCanonicalLocality(caba, 'Villa  Luro').matches[0]?.name).toBe(
      'Villa Luro',
    );
    expect(findCanonicalLocality(caba, 'Flores Centro').status).toBe('missing');
    expect(findCanonicalLocality(caba, 'Flor').status).toBe('missing');
  });

  it('rejects ambiguous catalog matches under the same province', () => {
    const catalog: OfflineGeoCatalog = {
      provinces: [
        {
          ...DEFAULT_GEO_CATALOG.provinces[0],
          localities: [
            { name: 'Flores', slug: 'flores', search: 'flores' },
            { name: 'Flores Dup', slug: 'flores-dup', search: 'flores' },
          ],
        },
      ],
    };
    const result = resolveAgainstCatalog({
      provinceName: 'CABA',
      localityName: 'Flores',
      evidence: [],
      candidates: ['Flores'],
      catalog,
    });
    expect(result.location.status).toBe('ambiguous');
    expect(
      result.issues.some((issue) => issue.code === 'AMBIGUOUS_LOCALITY'),
    ).toBe(true);
    expect(result.catalogGap).toBeNull();
  });

  it('detects a locality missing from the catalog without inserting it', () => {
    const result = resolveAgainstCatalog({
      provinceName: 'Capital Federal',
      localityName: 'Barrio Inventado',
      evidence: ['Override: Barrio Inventado'],
      candidates: ['Barrio Inventado'],
    });
    expect(result.location.status).toBe('missing');
    expect(result.location.localityId).toBeNull();
    expect(result.location.provinceId).toBeNull();
    expect(result.catalogGap).toMatchObject({
      kind: 'locality',
      model: 'Locality',
      requiredName: 'Barrio Inventado',
      provinceName: 'Capital Federal',
      provinceSlug: 'capital-federal',
    });
    expect(result.catalogGap?.officialCreateMechanism).toContain(
      'importer must not insert',
    );
  });
});
