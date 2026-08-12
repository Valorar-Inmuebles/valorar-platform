import { computeManifestStableHash } from './manifest';
import { EXPECTED_DEMO_COUNTS } from './constants';
import { diffExpectedCounts } from './manifest';
import type { PropertyImageManifestRow } from './types';

function sampleRow(
  overrides: Partial<PropertyImageManifestRow> = {},
): Pick<
  PropertyImageManifestRow,
  | 'id'
  | 'storageKey'
  | 'classification'
  | 'status'
  | 'deleteAuthorized'
  | 'isAnomalousKey'
> {
  return {
    id: 'a',
    storageKey: 'tenants/demo/properties/x/cover.webp',
    classification: 'expected_seed_not_found',
    status: 'not_found',
    deleteAuthorized: false,
    isAnomalousKey: false,
    ...overrides,
  };
}

describe('cleanup manifest helpers', () => {
  it('produces stable hash independent of input order', () => {
    const a = computeManifestStableHash([
      sampleRow({ id: 'b', storageKey: 'k2' }),
      sampleRow({ id: 'a', storageKey: 'k1' }),
    ]);
    const b = computeManifestStableHash([
      sampleRow({ id: 'a', storageKey: 'k1' }),
      sampleRow({ id: 'b', storageKey: 'k2' }),
    ]);
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it('changes hash when classification, auth, or status changes', () => {
    const base = computeManifestStableHash([sampleRow()]);
    const byClass = computeManifestStableHash([
      sampleRow({ classification: 'unexpected_not_found' }),
    ]);
    const byAuth = computeManifestStableHash([
      sampleRow({
        deleteAuthorized: true,
        classification: 'r2_object',
        status: 'storage_verified',
      }),
    ]);
    const byStatus = computeManifestStableHash([
      sampleRow({ status: 'failed' }),
    ]);
    expect(byClass).not.toBe(base);
    expect(byAuth).not.toBe(base);
    expect(byStatus).not.toBe(base);
  });

  it('detects count diffs', () => {
    const diffs = diffExpectedCounts(
      { ...EXPECTED_DEMO_COUNTS, Property: 32 },
      { ...EXPECTED_DEMO_COUNTS },
    );
    expect(diffs).toEqual(['Property: expected 33, got 32']);
  });
});
