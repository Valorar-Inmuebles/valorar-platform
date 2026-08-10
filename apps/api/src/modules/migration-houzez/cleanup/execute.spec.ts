import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { CLEANUP_PROCEDURE_VERSION, EXPECTED_DEMO_COUNTS } from './constants';
import type { CleanupPrisma } from './db';
import { runCleanupExecute } from './execute';
import { computeManifestStableHash } from './manifest';
import type { CleanupR2Deleter } from './r2-delete';
import type { CleanupR2Reader } from './r2-verify';
import type { CleanupManifest, PropertyImageManifestRow } from './types';

const TENANT_ID = 'cmqgnlvda0000ywus410xbnce';
const PUBLIC_HOST = 'pub-220b22089f6147499f7bf4e7e315b174.r2.dev';

function makeUploadRow(i: number): PropertyImageManifestRow {
  const propertyId = `prop${String(i).padStart(4, '0')}aaaaaaaaaaaaaaaa`;
  const uuid = `2539928a-9b7f-41aa-8f79-9bdf75c3ee${String(i).padStart(2, '0')}`;
  const storageKey = `${TENANT_ID}/properties/${propertyId}/${uuid}.jpg`;
  return {
    id: `up-${i}`,
    propertyId,
    storageKey,
    url: `https://${PUBLIC_HOST}/${storageKey}`,
    mimeType: 'image/jpeg',
    fileSize: 1000 + i,
    isCover: i === 0,
    sortOrder: i,
    r2: { exists: false, etag: null, error: 'not_found' },
    classification: 'expected_upload_not_found',
    status: 'not_found',
    isAnomalousKey: false,
    deleteAuthorized: false,
    authorizationReason: 'stale',
  };
}

function makeSeedRow(i: number): PropertyImageManifestRow {
  return {
    id: `seed-${i}`,
    propertyId: `seedprop${i}`,
    storageKey: `tenants/demo/properties/slug-${i}/cover.webp`,
    url: `/seed/properties/slug-${i}/cover.webp`,
    mimeType: 'image/webp',
    fileSize: null,
    isCover: true,
    sortOrder: 0,
    r2: { exists: false, etag: null, error: 'not_found' },
    classification: 'expected_seed_not_found',
    status: 'not_found',
    isAnomalousKey: false,
    deleteAuthorized: false,
    authorizationReason: 'seed',
  };
}

function buildApprovedImages(): PropertyImageManifestRow[] {
  const uploads = Array.from({ length: 8 }, (_, i) => makeUploadRow(i));
  const seeds = Array.from({ length: 120 }, (_, i) => makeSeedRow(i));
  const anomalous: PropertyImageManifestRow = {
    id: 'anom',
    propertyId: 'p',
    storageKey: 'demo/key.jpg',
    url: 'https://example.com/key.jpg',
    mimeType: 'image/jpeg',
    fileSize: 1,
    isCover: false,
    sortOrder: 0,
    r2: { exists: false, etag: null, error: 'not_found' },
    classification: 'anomalous',
    status: 'blocked_anomalous',
    isAnomalousKey: true,
    deleteAuthorized: false,
    authorizationReason: 'anomalous',
  };
  return [...uploads, ...seeds, anomalous];
}

function buildManifest(images: PropertyImageManifestRow[]): CleanupManifest {
  const stableHash = computeManifestStableHash(images);
  return {
    procedureVersion: CLEANUP_PROCEDURE_VERSION,
    mode: 'dry-run',
    generatedAtUtc: '2026-08-10T00:00:00.000Z',
    tenantSlug: 'demo',
    tenantId: TENANT_ID,
    dbHostMasked: 'ep-m***0v.***',
    preCountsByTenant: { ...EXPECTED_DEMO_COUNTS },
    imageRecordCount: images.length,
    storageKeyCount: images.length,
    uniqueStorageKeyCount: images.length,
    headObjectChecksPerformed: images.length,
    classificationSummary: {
      expected_upload_not_found: 8,
      expected_seed_not_found: 120,
      anomalous: 1,
    },
    statusSummary: { not_found: 128, blocked_anomalous: 1 },
    existingCount: 0,
    expectedSeedNotFoundCount: 120,
    expectedUploadNotFoundCount: 8,
    unexpectedNotFoundCount: 0,
    anomalousCount: 1,
    accessOrNetworkFailureCount: 0,
    authorizedDeleteCount: 0,
    excludedFromDeleteCount: 129,
    semantics: {
      dryRunCompleted: true,
      databaseCountsMatch: true,
      storageChecksCompleted: true,
      storagePolicySatisfied: true,
      readyForExecute: true,
      remoteWrites: { database: false, storage: false },
    },
    ok: true,
    stableHash,
    errorSummary: [],
    cascadeCoverage: [],
    images,
  };
}

function alignImagesToThirtyThreeProperties(
  images: PropertyImageManifestRow[],
): PropertyImageManifestRow[] {
  const props = Array.from(
    { length: 33 },
    (_, i) => `prop${String(i).padStart(4, '0')}bbbbbbbbbbbbbbbb`,
  );
  return images.map((img, idx) => {
    if (img.classification === 'expected_upload_not_found') {
      const propertyId = props[idx];
      const uuid = `2539928a-9b7f-41aa-8f79-9bdf75c3ee${String(idx).padStart(2, '0')}`;
      const storageKey = `${TENANT_ID}/properties/${propertyId}/${uuid}.jpg`;
      return {
        ...img,
        propertyId,
        storageKey,
        url: `https://${PUBLIC_HOST}/${storageKey}`,
      };
    }
    const propertyId = props[idx % 33];
    return { ...img, propertyId };
  });
}

function createPrismaFake(images: PropertyImageManifestRow[]): CleanupPrisma {
  const propertyIds = [...new Set(images.map((i) => i.propertyId))].sort(
    (a, b) => a.localeCompare(b),
  );
  while (propertyIds.length < 33) {
    propertyIds.push(`pad-property-${propertyIds.length}`);
  }
  const sortedPropIds = propertyIds
    .slice(0, 33)
    .sort((a, b) => a.localeCompare(b));

  let propertyCount = 33;
  return {
    tenant: {
      findMany: () => Promise.resolve([{ id: TENANT_ID, slug: 'demo' }]),
    },
    property: {
      count: () => Promise.resolve(propertyCount),
      findMany: () =>
        Promise.resolve(
          propertyCount === 0 ? [] : sortedPropIds.map((id) => ({ id })),
        ),
    },
    propertyListing: {
      count: () => Promise.resolve(propertyCount === 0 ? 0 : 36),
    },
    propertyPrice: {
      count: () => Promise.resolve(propertyCount === 0 ? 0 : 38),
    },
    propertyImage: {
      count: () => Promise.resolve(propertyCount === 0 ? 0 : 129),
      findMany: () =>
        Promise.resolve(
          propertyCount === 0
            ? []
            : images.map((img) => ({
                id: img.id,
                propertyId: img.propertyId,
                storageKey: img.storageKey,
                url: img.url,
                mimeType: img.mimeType,
                fileSize: img.fileSize,
                isCover: img.isCover,
                sortOrder: img.sortOrder,
              })),
        ),
    },
    propertyFeatureAssignment: {
      count: () => Promise.resolve(propertyCount === 0 ? 0 : 104),
    },
    propertyAgentAccess: { count: () => Promise.resolve(0) },
    $transaction: async (fn) => {
      propertyCount = 0;
      return fn({
        $executeRawUnsafe: () => Promise.resolve(33),
      } as unknown as CleanupPrisma);
    },
    $executeRawUnsafe: () => Promise.resolve(33),
  };
}

describe('runCleanupExecute empty allowlist (v4)', () => {
  let tmpDir: string;
  let manifestPath: string;
  let approvedHash: string;
  let images: PropertyImageManifestRow[];

  beforeEach(() => {
    images = alignImagesToThirtyThreeProperties(buildApprovedImages());
    const manifest = buildManifest(images);
    approvedHash = manifest.stableHash;
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'houzez-cleanup-exec-'));
    manifestPath = path.join(tmpDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest), 'utf8');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('completes with empty allowlist and zero DeleteObject calls', async () => {
    let deleteCalls = 0;
    const r2Delete: CleanupR2Deleter = {
      deleteObject: () => {
        deleteCalls += 1;
        return Promise.resolve();
      },
      destroy: () => undefined,
    };
    const r2Head: CleanupR2Reader = {
      headObject: () =>
        Promise.resolve({ ok: true, exists: false, etag: null }),
      destroy: () => undefined,
    };

    const result = await runCleanupExecute({
      prisma: createPrismaFake(images),
      r2Delete,
      r2Head,
      tenantSlug: 'demo',
      manifestPath,
      approvedHash,
      dbHostMasked: 'ep-m***0v.***',
      cleanupTarget: 'production',
      reportRoot: path.join(tmpDir, 'reports'),
    });

    expect(result.ok).toBe(true);
    expect(result.finalStatus).toBe('completed');
    expect(deleteCalls).toBe(0);
    expect(result.report?.allowlistCount).toBe(0);
    expect(result.report?.deleteObjectAttempts).toBe(0);
    expect(result.report?.r2DeletedCount).toBe(0);
    expect(result.report?.remoteWrites.storage).toBe(false);
  });

  it('refuses when wordpress-houzez key is present in manifesto', async () => {
    const withWp = [...images];
    withWp[0] = {
      ...withWp[0],
      storageKey: `${TENANT_ID}/migrations/wordpress-houzez/5312/00-wp5315.jpg`,
      url: `https://${PUBLIC_HOST}/${TENANT_ID}/migrations/wordpress-houzez/5312/00-wp5315.jpg`,
      classification: 'unexpected_not_found',
    };
    const hash = computeManifestStableHash(withWp);
    const manifest = buildManifest(withWp);
    manifest.stableHash = hash;
    const mp = path.join(tmpDir, 'manifest-wp.json');
    fs.writeFileSync(mp, JSON.stringify(manifest), 'utf8');

    const r2Delete: CleanupR2Deleter = {
      deleteObject: () => Promise.reject(new Error('should not delete')),
      destroy: () => undefined,
    };
    const r2Head: CleanupR2Reader = {
      headObject: () =>
        Promise.resolve({ ok: true, exists: false, etag: null }),
      destroy: () => undefined,
    };

    const result = await runCleanupExecute({
      prisma: createPrismaFake(withWp),
      r2Delete,
      r2Head,
      tenantSlug: 'demo',
      manifestPath: mp,
      approvedHash: hash,
      dbHostMasked: 'ep-m***0v.***',
      cleanupTarget: 'production',
      reportRoot: path.join(tmpDir, 'reports'),
    });

    expect(result.ok).toBe(false);
    expect(result.messages.join(' ')).toMatch(/wordpress-houzez/);
  });
});
