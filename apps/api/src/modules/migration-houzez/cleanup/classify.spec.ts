import {
  buildR2DeleteAllowlist,
  classifyPropertyImage,
  evaluateCleanupSemantics,
  isExpectedSeedReference,
  isExpectedStaleUploadReference,
} from './classify';
import { EXPECTED_STORAGE_POLICY } from './constants';
import type { PropertyImageManifestRow } from './types';

const TENANT_ID = 'cmqgnlvda0000ywus410xbnce';
const PROPERTY_ID = 'cmqgsdbuy0000lous3rnifwl8';
const PUBLIC_HOST = 'pub-220b22089f6147499f7bf4e7e315b174.r2.dev';
const UUID_JPG = '2539928a-9b7f-41aa-8f79-9bdf75c3ee10.jpg';
const STALE_KEY = `${TENANT_ID}/properties/${PROPERTY_ID}/${UUID_JPG}`;
const STALE_URL = `https://${PUBLIC_HOST}/${STALE_KEY}`;

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

describe('isExpectedStaleUploadReference', () => {
  const ok = {
    tenantId: TENANT_ID,
    propertyId: PROPERTY_ID,
    storageKey: STALE_KEY,
    url: STALE_URL,
    publicUrlHost: PUBLIC_HOST,
    isAnomalousKey: false,
  };

  it('accepts closed stale upload attributes', () => {
    expect(isExpectedStaleUploadReference(ok)).toBe(true);
  });

  it('rejects similar pattern not bound to the row propertyId', () => {
    expect(
      isExpectedStaleUploadReference({
        ...ok,
        propertyId: 'other-property-id',
      }),
    ).toBe(false);
  });

  it('rejects wrong tenantId', () => {
    expect(
      isExpectedStaleUploadReference({
        ...ok,
        tenantId: 'other-tenant-id',
      }),
    ).toBe(false);
  });

  it('rejects wrong public host', () => {
    expect(
      isExpectedStaleUploadReference({
        ...ok,
        publicUrlHost: 'other.r2.dev',
      }),
    ).toBe(false);
  });

  it('rejects non-uuid filename and wordpress-houzez keys', () => {
    expect(
      isExpectedStaleUploadReference({
        ...ok,
        storageKey: `${TENANT_ID}/properties/${PROPERTY_ID}/not-a-uuid.jpg`,
      }),
    ).toBe(false);
    expect(
      isExpectedStaleUploadReference({
        ...ok,
        storageKey: `${TENANT_ID}/migrations/wordpress-houzez/5312/00-wp5315.jpg`,
        url: `https://${PUBLIC_HOST}/${TENANT_ID}/migrations/wordpress-houzez/5312/00-wp5315.jpg`,
      }),
    ).toBe(false);
  });
});

describe('classifyPropertyImage', () => {
  it('marks existing HeadObject as storage_verified and deleteAuthorized', () => {
    const row = classifyPropertyImage({
      tenantSlug: 'demo',
      tenantId: TENANT_ID,
      publicUrlHost: PUBLIC_HOST,
      image: baseImage({
        propertyId: PROPERTY_ID,
        storageKey: STALE_KEY,
        url: STALE_URL,
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
      tenantId: TENANT_ID,
      publicUrlHost: PUBLIC_HOST,
      image: baseImage(),
      head: { ok: true, exists: false, etag: null },
    });
    expect(row.classification).toBe('expected_seed_not_found');
    expect(row.status).toBe('not_found');
    expect(row.deleteAuthorized).toBe(false);
  });

  it('marks known stale upload + not_found as expected_upload_not_found', () => {
    const row = classifyPropertyImage({
      tenantSlug: 'demo',
      tenantId: TENANT_ID,
      publicUrlHost: PUBLIC_HOST,
      image: baseImage({
        propertyId: PROPERTY_ID,
        storageKey: STALE_KEY,
        url: STALE_URL,
      }),
      head: { ok: true, exists: false, etag: null },
    });
    expect(row.classification).toBe('expected_upload_not_found');
    expect(row.status).toBe('not_found');
    expect(row.deleteAuthorized).toBe(false);
  });

  it('rejects stale-looking key with wrong propertyId as unexpected', () => {
    const row = classifyPropertyImage({
      tenantSlug: 'demo',
      tenantId: TENANT_ID,
      publicUrlHost: PUBLIC_HOST,
      image: baseImage({
        propertyId: 'cmqgvbh020000gcusikcgle4x',
        storageKey: STALE_KEY,
        url: STALE_URL,
      }),
      head: { ok: true, exists: false, etag: null },
    });
    expect(row.classification).toBe('unexpected_not_found');
  });

  it('rejects wrong public host as unexpected', () => {
    const row = classifyPropertyImage({
      tenantSlug: 'demo',
      tenantId: TENANT_ID,
      publicUrlHost: PUBLIC_HOST,
      image: baseImage({
        propertyId: PROPERTY_ID,
        storageKey: STALE_KEY,
        url: `https://other.r2.dev/${STALE_KEY}`,
      }),
      head: { ok: true, exists: false, etag: null },
    });
    expect(row.classification).toBe('unexpected_not_found');
  });

  it('marks non-seed not_found as unexpected and unauthorized', () => {
    const row = classifyPropertyImage({
      tenantSlug: 'demo',
      tenantId: TENANT_ID,
      publicUrlHost: PUBLIC_HOST,
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
      tenantId: TENANT_ID,
      publicUrlHost: PUBLIC_HOST,
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

  it('marks HeadObject failures as access_or_network_failure (not absence)', () => {
    const row = classifyPropertyImage({
      tenantSlug: 'demo',
      tenantId: TENANT_ID,
      publicUrlHost: PUBLIC_HOST,
      image: baseImage({
        propertyId: PROPERTY_ID,
        storageKey: STALE_KEY,
        url: STALE_URL,
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

  it('never classifies wordpress-houzez pilot keys as expected_upload_not_found', () => {
    const key = `${TENANT_ID}/migrations/wordpress-houzez/5312/00-wp5315.jpg`;
    const row = classifyPropertyImage({
      tenantSlug: 'demo',
      tenantId: TENANT_ID,
      publicUrlHost: PUBLIC_HOST,
      image: baseImage({
        propertyId: PROPERTY_ID,
        storageKey: key,
        url: `https://${PUBLIC_HOST}/${key}`,
      }),
      head: { ok: true, exists: false, etag: null },
    });
    expect(row.classification).toBe('unexpected_not_found');
    expect(row.deleteAuthorized).toBe(false);
  });
});

function rowFromClassify(
  partial: ReturnType<typeof classifyPropertyImage>,
): PropertyImageManifestRow {
  return partial;
}

describe('evaluateCleanupSemantics + allowlist (v4 policy)', () => {
  function buildPolicyRows() {
    const uploads = Array.from({ length: 8 }, (_, i) => {
      const propertyId = `prop${String(i).padStart(4, '0')}aaaaaaaaaaaaaaaa`;
      const uuid = `2539928a-9b7f-41aa-8f79-9bdf75c3ee${String(i).padStart(2, '0')}`;
      const storageKey = `${TENANT_ID}/properties/${propertyId}/${uuid}.jpg`;
      return rowFromClassify(
        classifyPropertyImage({
          tenantSlug: 'demo',
          tenantId: TENANT_ID,
          publicUrlHost: PUBLIC_HOST,
          image: baseImage({
            id: `up-${i}`,
            propertyId,
            storageKey,
            url: `https://${PUBLIC_HOST}/${storageKey}`,
          }),
          head: { ok: true, exists: false, etag: null },
        }),
      );
    });
    const seeds = Array.from({ length: 120 }, (_, i) =>
      rowFromClassify(
        classifyPropertyImage({
          tenantSlug: 'demo',
          tenantId: TENANT_ID,
          publicUrlHost: PUBLIC_HOST,
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
        tenantId: TENANT_ID,
        publicUrlHost: PUBLIC_HOST,
        image: baseImage({
          id: 'anom',
          storageKey: 'demo/key.jpg',
          url: 'https://example.com/key.jpg',
        }),
        head: { ok: true, exists: false, etag: null },
      }),
    );
    return [...uploads, ...seeds, anomalous];
  }

  it('satisfies approved policy 0/120/8/1/0 with empty allowlist', () => {
    const images = buildPolicyRows();
    expect(images).toHaveLength(129);
    const evalResult = evaluateCleanupSemantics({
      countDiffs: [],
      images,
      headObjectChecksPerformed: 129,
      fatalHeadErrors: [],
    });
    expect(evalResult.classificationSummary).toMatchObject({
      expected_upload_not_found: 8,
      expected_seed_not_found: 120,
      anomalous: 1,
    });
    expect(evalResult.classificationSummary.r2_object ?? 0).toBe(0);
    expect(evalResult.classificationSummary.unexpected_not_found ?? 0).toBe(0);
    expect(evalResult.storagePolicySatisfied).toBe(true);
    expect(evalResult.readyForExecute).toBe(true);
    expect(evalResult.authorizedKeys).toHaveLength(
      EXPECTED_STORAGE_POLICY.r2ObjectsAuthorized,
    );
    expect(buildR2DeleteAllowlist(images)).toHaveLength(0);
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
          tenantId: TENANT_ID,
          publicUrlHost: PUBLIC_HOST,
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

  it('fails policy when a wordpress-houzez key appears', () => {
    const images = [
      ...buildPolicyRows().slice(0, 128),
      rowFromClassify(
        classifyPropertyImage({
          tenantSlug: 'demo',
          tenantId: TENANT_ID,
          publicUrlHost: PUBLIC_HOST,
          image: baseImage({
            id: 'wp',
            storageKey: `${TENANT_ID}/migrations/wordpress-houzez/5312/00-wp5315.jpg`,
            url: `https://${PUBLIC_HOST}/${TENANT_ID}/migrations/wordpress-houzez/5312/00-wp5315.jpg`,
          }),
          head: { ok: true, exists: false, etag: null },
        }),
      ),
    ];
    const evalResult = evaluateCleanupSemantics({
      countDiffs: [],
      images,
      headObjectChecksPerformed: images.length,
      fatalHeadErrors: [],
    });
    expect(evalResult.storagePolicySatisfied).toBe(false);
  });

  it('fails on auth/network HeadObject fatals', () => {
    const images = [
      rowFromClassify(
        classifyPropertyImage({
          tenantSlug: 'demo',
          tenantId: TENANT_ID,
          publicUrlHost: PUBLIC_HOST,
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

  it('allowlist never includes not_found / upload_not_found / anomalous', () => {
    const images = buildPolicyRows();
    const allow = new Set(buildR2DeleteAllowlist(images));
    expect(allow.size).toBe(0);
    for (const img of images) {
      expect(allow.has(img.storageKey)).toBe(false);
    }
  });

  it('allowlist never includes wordpress-houzez even if marked authorized', () => {
    const key = `${TENANT_ID}/migrations/wordpress-houzez/5312/00-wp5315.jpg`;
    const rogue: PropertyImageManifestRow = {
      id: 'rogue',
      propertyId: PROPERTY_ID,
      storageKey: key,
      url: `https://${PUBLIC_HOST}/${key}`,
      mimeType: 'image/jpeg',
      fileSize: 1,
      isCover: true,
      sortOrder: 0,
      r2: { exists: true, etag: 'e', error: null },
      classification: 'r2_object',
      status: 'storage_verified',
      isAnomalousKey: false,
      deleteAuthorized: true,
      authorizationReason: 'should-be-blocked',
    };
    expect(buildR2DeleteAllowlist([rogue])).toEqual([]);
  });
});
