import {
  buildR2DeleteAllowlist,
  classifyPropertyImage,
  evaluateCleanupSemantics,
  isExpectedSeedReference,
} from './classify';
import type { PropertyImageManifestRow } from './types';

function baseImage(
  overrides: Partial<{
    id: string;
    propertyId: string;
    storageKey: string;
    url: string | null;
  }> = {},
) {
  return {
    id: overrides.id ?? 'img1',
    propertyId: overrides.propertyId ?? 'prop1',
    storageKey: overrides.storageKey ?? 'tenants/demo/properties/x/cover.webp',
    url: overrides.url ?? '/seed/properties/x/cover.webp',
    mimeType: 'image/webp' as string | null,
    fileSize: 10 as number | null,
    isCover: true,
    sortOrder: 0,
  };
}

describe('isExpectedSeedReference', () => {
  it('accepts closed seed attributes', () => {
    expect(
      isExpectedSeedReference({
        tenantSlug: 'demo',
        storageKey: 'tenants/demo/properties/slug/cover.webp',
        url: '/seed/properties/slug/cover.webp',
        isAnomalousKey: false,
      }),
    ).toBe(true);
  });

  it('rejects partial / weak matches', () => {
    expect(
      isExpectedSeedReference({
        tenantSlug: 'demo',
        storageKey: 'tenants/demo/other/cover.webp',
        url: '/seed/properties/slug/cover.webp',
        isAnomalousKey: false,
      }),
    ).toBe(false);
    expect(
      isExpectedSeedReference({
        tenantSlug: 'demo',
        storageKey: 'tenants/demo/properties/slug/cover.webp',
        url: 'https://cdn.example/seed/properties/slug/cover.webp',
        isAnomalousKey: false,
      }),
    ).toBe(false);
    expect(
      isExpectedSeedReference({
        tenantSlug: 'other',
        storageKey: 'tenants/demo/properties/slug/cover.webp',
        url: '/seed/properties/slug/cover.webp',
        isAnomalousKey: false,
      }),
    ).toBe(false);
  });
});

describe('classifyPropertyImage', () => {
  it('marks existing HeadObject as storage_verified and deleteAuthorized', () => {
    const row = classifyPropertyImage({
      tenantSlug: 'demo',
      image: baseImage({
        storageKey:
          'cmqgnlvda0000ywus410xbnce/properties/p1/2539928a-9b7f-41aa-8f79-9bdf75c3ee10.jpg',
        url: 'https://pub.example.r2.dev/key.jpg',
      }),
      head: { ok: true, exists: true, etag: 'abc' },
    });
    expect(row.classification).toBe('r2_object');
    expect(row.status).toBe('storage_verified');
    expect(row.deleteAuthorized).toBe(true);
    expect(row.isAnomalousKey).toBe(false);
  });

  it('marks exact seed + not_found as expected_seed_not_found unauthorized', () => {
    const row = classifyPropertyImage({
      tenantSlug: 'demo',
      image: baseImage(),
      head: { ok: true, exists: false, etag: null },
    });
    expect(row.classification).toBe('expected_seed_not_found');
    expect(row.status).toBe('not_found');
    expect(row.deleteAuthorized).toBe(false);
  });

  it('marks non-seed not_found as unexpected and unauthorized', () => {
    const row = classifyPropertyImage({
      tenantSlug: 'demo',
      image: baseImage({
        storageKey: 'orphan/path/file.jpg',
        url: 'https://example.com/file.jpg',
      }),
      head: { ok: true, exists: false, etag: null },
    });
    expect(row.classification).toBe('unexpected_not_found');
    expect(row.status).toBe('not_found');
    expect(row.deleteAuthorized).toBe(false);
  });

  it('blocks demo/key.jpg as anomalous', () => {
    const row = classifyPropertyImage({
      tenantSlug: 'demo',
      image: baseImage({
        storageKey: 'demo/key.jpg',
        url: 'https://example.com/key.jpg',
      }),
      head: { ok: true, exists: false, etag: null },
    });
    expect(row.classification).toBe('anomalous');
    expect(row.status).toBe('blocked_anomalous');
    expect(row.deleteAuthorized).toBe(false);
    expect(row.isAnomalousKey).toBe(true);
  });

  it('marks HeadObject failures as access_or_network_failure', () => {
    const row = classifyPropertyImage({
      tenantSlug: 'demo',
      image: baseImage({
        storageKey: 'any/key.jpg',
        url: null,
      }),
      head: {
        ok: false,
        exists: null,
        etag: null,
        error: 'AccessDenied',
        fatal: true,
      },
    });
    expect(row.classification).toBe('access_or_network_failure');
    expect(row.status).toBe('failed');
    expect(row.deleteAuthorized).toBe(false);
  });
});

function rowFromClassify(
  partial: ReturnType<typeof classifyPropertyImage>,
): PropertyImageManifestRow {
  return partial;
}

describe('evaluateCleanupSemantics + allowlist', () => {
  function buildPolicyRows() {
    const r2 = Array.from({ length: 8 }, (_, i) =>
      rowFromClassify(
        classifyPropertyImage({
          tenantSlug: 'demo',
          image: baseImage({
            id: `r2-${i}`,
            storageKey: `tenant/properties/p/${i}.jpg`,
            url: `https://r2.dev/${i}.jpg`,
          }),
          head: { ok: true, exists: true, etag: `e${i}` },
        }),
      ),
    );
    const seeds = Array.from({ length: 120 }, (_, i) =>
      rowFromClassify(
        classifyPropertyImage({
          tenantSlug: 'demo',
          image: baseImage({
            id: `seed-${i}`,
            storageKey: `tenants/demo/properties/slug-${i}/cover.webp`,
            url: `/seed/properties/slug-${i}/cover.webp`,
          }),
          head: { ok: true, exists: false, etag: null },
        }),
      ),
    );
    const anomalous = rowFromClassify(
      classifyPropertyImage({
        tenantSlug: 'demo',
        image: baseImage({
          id: 'anom',
          storageKey: 'demo/key.jpg',
          url: 'https://example.com/key.jpg',
        }),
        head: { ok: true, exists: false, etag: null },
      }),
    );
    return [...r2, ...seeds, anomalous];
  }

  it('satisfies approved policy and builds allowlist of exactly 8', () => {
    const images = buildPolicyRows();
    const evalResult = evaluateCleanupSemantics({
      countDiffs: [],
      images,
      headObjectChecksPerformed: 129,
      fatalHeadErrors: [],
    });
    expect(evalResult.storagePolicySatisfied).toBe(true);
    expect(evalResult.readyForExecute).toBe(true);
    expect(evalResult.authorizedKeys).toHaveLength(8);
    expect(buildR2DeleteAllowlist(images)).toHaveLength(8);
    expect(
      buildR2DeleteAllowlist(images).every(
        (k) => !k.startsWith('tenants/demo/'),
      ),
    ).toBe(true);
    expect(buildR2DeleteAllowlist(images)).not.toContain('demo/key.jpg');
  });

  it('fails policy on unexpected not_found', () => {
    const base = buildPolicyRows().filter(
      (r) => r.classification !== 'anomalous',
    );
    const withUnexpected = [
      ...base,
      rowFromClassify(
        classifyPropertyImage({
          tenantSlug: 'demo',
          image: baseImage({
            id: 'bad',
            storageKey: 'unexpected/key.jpg',
            url: 'https://example.com/x.jpg',
          }),
          head: { ok: true, exists: false, etag: null },
        }),
      ),
    ];
    const evalResult = evaluateCleanupSemantics({
      countDiffs: [],
      images: withUnexpected,
      headObjectChecksPerformed: withUnexpected.length,
      fatalHeadErrors: [],
    });
    expect(evalResult.storagePolicySatisfied).toBe(false);
    expect(evalResult.readyForExecute).toBe(false);
  });

  it('fails on auth/network HeadObject fatals', () => {
    const images = [
      rowFromClassify(
        classifyPropertyImage({
          tenantSlug: 'demo',
          image: baseImage({ storageKey: 'k', url: null }),
          head: {
            ok: false,
            exists: null,
            etag: null,
            error: '403',
            fatal: true,
          },
        }),
      ),
    ];
    const evalResult = evaluateCleanupSemantics({
      countDiffs: [],
      images,
      headObjectChecksPerformed: 1,
      fatalHeadErrors: ['k: 403'],
    });
    expect(evalResult.storageChecksCompleted).toBe(false);
    expect(evalResult.readyForExecute).toBe(false);
  });

  it('fails when DB counts differ', () => {
    const images = buildPolicyRows();
    const evalResult = evaluateCleanupSemantics({
      countDiffs: ['Property: expected 33, got 32'],
      images,
      headObjectChecksPerformed: 129,
      fatalHeadErrors: [],
    });
    expect(evalResult.databaseCountsMatch).toBe(false);
    expect(evalResult.readyForExecute).toBe(false);
  });

  it('allowlist never includes not_found entries', () => {
    const images = buildPolicyRows();
    const allow = new Set(buildR2DeleteAllowlist(images));
    for (const img of images) {
      if (img.status === 'not_found' || img.r2.exists !== true) {
        expect(allow.has(img.storageKey)).toBe(false);
      }
    }
  });

  it('anomalous never enters allowlist', () => {
    const images = buildPolicyRows();
    expect(buildR2DeleteAllowlist(images)).not.toContain('demo/key.jpg');
  });
});
