import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  PILOT_5312_APPROVED_V2_MANIFEST_SHA256,
  PILOT_5312_PRODUCTION_MSR_ID,
  PILOT_5312_PRODUCTION_PROPERTY_ID,
} from '../constants';
import { IMAGE_OPTIMIZE_PIPELINE_VERSION } from '../images/optimize-pipeline';
import { InMemoryMigrationObjectStore } from '../writer/migration-object-store';
import { buildHouzezMigrationImageKeyWithPipeline } from '../writer/storage-keys';
import {
  assertPilotImageBaseline,
  loadApprovedV2Manifest,
  runPilotImageUpgrade,
  type PropertyImageRow,
  type UpgradePrisma,
} from './pilot-image-upgrade';

const TENANT_ID = 'cmqgnlvda0000ywus410xbnce';
const PROPERTY_ID = PILOT_5312_PRODUCTION_PROPERTY_ID;

const RELATIVE = [
  '00-wp5315.webp',
  '01-wp6927.webp',
  '02-wp8967.webp',
  '03-wp8966.webp',
  '04-wp5314.webp',
  '05-wp6928.webp',
  '06-wp8965.webp',
] as const;

const ATTACHMENTS = [5315, 6927, 8967, 8966, 5314, 6928, 8965] as const;

function keyFor(order: number, attachmentId: number): string {
  return `${TENANT_ID}/migrations/wordpress-houzez/5312/${String(order).padStart(2, '0')}-wp${attachmentId}.webp`;
}

function makeImages(): PropertyImageRow[] {
  return RELATIVE.map((rel, order) => ({
    id: `img${order}${crypto.randomBytes(8).toString('hex')}`,
    tenantId: TENANT_ID,
    propertyId: PROPERTY_ID,
    storageKey: `${TENANT_ID}/migrations/wordpress-houzez/5312/${rel}`,
    url: `https://example.test/media/${TENANT_ID}/migrations/wordpress-houzez/5312/${rel}`,
    altText: null,
    mimeType: 'image/webp',
    fileSize: 1000 + order,
    sortOrder: order,
    isCover: order === 0,
  }));
}

describe('buildHouzezMigrationImageKeyWithPipeline', () => {
  it('builds versioned webp keys that do not collide with v1', () => {
    const v2 = buildHouzezMigrationImageKeyWithPipeline({
      tenantId: TENANT_ID,
      sourceId: '5312',
      sortOrder: 0,
      attachmentId: 5315,
      pipelineVersion: IMAGE_OPTIMIZE_PIPELINE_VERSION,
    });
    expect(v2).toBe(
      `${TENANT_ID}/migrations/wordpress-houzez/5312/00-wp5315.houzez-webp-v2.webp`,
    );
    expect(v2.endsWith('.webp')).toBe(true);
    expect(v2).not.toBe(keyFor(0, 5315));
  });
});

describe('assertPilotImageBaseline', () => {
  it('accepts the approved seven-image pilot shape', () => {
    const result = assertPilotImageBaseline({
      images: makeImages(),
      tenantId: TENANT_ID,
      propertyId: PROPERTY_ID,
    });
    expect(result.ok).toBe(true);
  });

  it('rejects duplicate covers', () => {
    const images = makeImages();
    images[1].isCover = true;
    const result = assertPilotImageBaseline({
      images,
      tenantId: TENANT_ID,
      propertyId: PROPERTY_ID,
    });
    expect(result.ok).toBe(false);
  });
});

describe('loadApprovedV2Manifest', () => {
  const realManifest = path.resolve(
    __dirname,
    '../../../../../../migration-data/prepared/wp-5312/2026-08-11T21-00-33-562Z/preparation-manifest.json',
  );

  it('loads and verifies the approved preparation manifest when present', () => {
    if (!fs.existsSync(realManifest)) {
      return;
    }
    const loaded = loadApprovedV2Manifest(realManifest);
    expect(loaded.sha256).toBe(PILOT_5312_APPROVED_V2_MANIFEST_SHA256);
    expect(loaded.manifest.pipelineVersion).toBe(
      IMAGE_OPTIMIZE_PIPELINE_VERSION,
    );
    expect(loaded.manifest.images).toHaveLength(7);
  });

  it('rejects a tampered manifest hash', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'houzez-upgrade-'));
    const file = path.join(dir, 'preparation-manifest.json');
    fs.writeFileSync(file, JSON.stringify({ wpId: 5312, images: [] }));
    expect(() => loadApprovedV2Manifest(file)).toThrow(/SHA-256 mismatch/);
  });
});

describe('runPilotImageUpgrade (in-memory)', () => {
  const realRoot = path.resolve(
    __dirname,
    '../../../../../../migration-data/prepared/wp-5312/2026-08-11T21-00-33-562Z',
  );
  const realManifest = path.join(realRoot, 'preparation-manifest.json');

  function createFakePrisma(images: PropertyImageRow[]): UpgradePrisma & {
    __images: PropertyImageRow[];
  } {
    const state = { images: images.map((i) => ({ ...i })) };
    const prisma: UpgradePrisma & { __images: PropertyImageRow[] } = {
      get __images() {
        return state.images;
      },
      $queryRawUnsafe: (query: string) => {
        if (query.includes('neon.project_id')) {
          return Promise.resolve([{ v: 'square-lab-71259415' }]);
        }
        if (query.includes('neon.branch_id')) {
          return Promise.resolve([{ v: 'br-rapid-bread-acsu0836' }]);
        }
        if (query.includes('neon.endpoint_id')) {
          return Promise.resolve([{ v: 'ep-mute-sun-ac6nva0v' }]);
        }
        if (query.includes('application_name')) {
          return Promise.resolve([{ v: 'test' }]);
        }
        if (query.includes('MigrationSourceRef')) {
          return Promise.resolve([{ '?column?': 1 }]);
        }
        return Promise.resolve([]);
      },
      $transaction: (fn) =>
        fn({
          propertyImage: {
            updateMany: (args: {
              where: {
                id: string;
                storageKey: string;
                sortOrder: number;
                isCover: boolean;
              };
              data: Partial<PropertyImageRow>;
            }) => {
              const idx = state.images.findIndex(
                (i) =>
                  i.id === args.where.id &&
                  i.storageKey === args.where.storageKey &&
                  i.sortOrder === args.where.sortOrder &&
                  i.isCover === args.where.isCover,
              );
              if (idx < 0) return Promise.resolve({ count: 0 });
              state.images[idx] = { ...state.images[idx], ...args.data };
              return Promise.resolve({ count: 1 });
            },
          },
        }),
      tenant: {
        findUnique: () =>
          Promise.resolve({
            id: TENANT_ID,
            slug: 'demo',
            status: 'ACTIVE',
          }),
      },
      user: {
        findFirst: () =>
          Promise.resolve({
            id: 'owner1',
            email: 'admin@demo.valorar.dev',
            isActive: true,
            role: 'TENANT_ADMIN',
          }),
      },
      property: {
        findUnique: () =>
          Promise.resolve({
            id: PROPERTY_ID,
            tenantId: TENANT_ID,
            isActive: true,
          }),
        count: () => Promise.resolve(1),
      },
      propertyListing: { count: () => Promise.resolve(1) },
      propertyPrice: { count: () => Promise.resolve(1) },
      propertyImage: {
        findMany: () => Promise.resolve(state.images.map((i) => ({ ...i }))),
        count: () => Promise.resolve(state.images.length),
      },
      propertyFeatureAssignment: { count: () => Promise.resolve(1) },
      propertyAgentAccess: { count: () => Promise.resolve(1) },
      migrationSourceRef: {
        findUnique: () =>
          Promise.resolve({
            id: PILOT_5312_PRODUCTION_MSR_ID,
            entityId: PROPERTY_ID,
            entityType: 'property',
            sourceSystem: 'wordpress-houzez',
            sourceId: '5312',
            tenantId: TENANT_ID,
            migrationBatchId: 'batch',
            metadata: null,
          }),
        findMany: () => Promise.resolve([]),
        count: () => Promise.resolve(1),
      },
    };
    return prisma;
  }

  it('upgrades only 5315 and 5314 with compensation-safe new keys', async () => {
    if (!fs.existsSync(realManifest)) {
      return;
    }
    const images = makeImages();
    // Align fileSize with seeded R2 objects
    for (const img of images) {
      img.fileSize = 1000 + img.sortOrder;
    }
    const store = new InMemoryMigrationObjectStore();
    for (let i = 0; i < ATTACHMENTS.length; i++) {
      const k = keyFor(i, ATTACHMENTS[i]);
      store.seedPreexisting(k, Buffer.alloc(1000 + i, 1), 'image/webp');
    }
    const prisma = createFakePrisma(images);
    const report = await runPilotImageUpgrade({
      prisma,
      objectStore: store,
      approvedManifestPath: realManifest,
      execute: true,
    });
    expect(report.verdict).toBe('PILOT_IMAGE_UPGRADE_COMPLETED_AND_VERIFIED');
    expect(report.rowsUpdated).toBe(2);
    expect(report.putObjectResults).toHaveLength(2);
    expect(report.compensation.applicable).toBe(false);
    expect(store.deletedKeys).toHaveLength(0);

    const cover = prisma.__images.find((i) => i.sortOrder === 0)!;
    const img5314 = prisma.__images.find((i) => i.sortOrder === 4)!;
    expect(cover.storageKey).toContain('houzez-webp-v2.webp');
    expect(img5314.storageKey).toContain('houzez-webp-v2.webp');
    expect(store.objects.has(keyFor(0, 5315))).toBe(true);
    expect(store.objects.has(keyFor(4, 5314))).toBe(true);
  });

  it('blocks when a proposed v2 key already exists', async () => {
    if (!fs.existsSync(realManifest)) {
      return;
    }
    const images = makeImages();
    for (const img of images) {
      img.fileSize = 1000 + img.sortOrder;
    }
    const store = new InMemoryMigrationObjectStore();
    for (let i = 0; i < ATTACHMENTS.length; i++) {
      store.seedPreexisting(
        keyFor(i, ATTACHMENTS[i]),
        Buffer.alloc(1000 + i, 1),
        'image/webp',
      );
    }
    store.seedPreexisting(
      buildHouzezMigrationImageKeyWithPipeline({
        tenantId: TENANT_ID,
        sourceId: '5312',
        sortOrder: 0,
        attachmentId: 5315,
        pipelineVersion: IMAGE_OPTIMIZE_PIPELINE_VERSION,
      }),
      Buffer.from('already'),
      'image/webp',
    );
    const report = await runPilotImageUpgrade({
      prisma: createFakePrisma(images),
      objectStore: store,
      approvedManifestPath: realManifest,
      execute: true,
    });
    expect(report.verdict).toBe('BLOCKED');
    expect(report.executed).toBe(false);
  });
});
