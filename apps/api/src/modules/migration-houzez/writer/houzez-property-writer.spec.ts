import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';
import sharp from 'sharp';
import { HOUZEZ_SOURCE_SYSTEM } from '../constants';
import { loadBundledDatasetManifest } from '../dataset/validate-dataset-manifest';
import type {
  CatalogResolution,
  DryRunReport,
  ImagePlanEntry,
  OwnerResolution,
} from '../types';
import type { PublishTransformResult } from '../transform/publish-rules';
import { computeDryRunFingerprint } from './dry-run-fingerprint';
import { InMemoryMigrationObjectStore } from './migration-object-store';
import {
  writeOneHouzezProperty,
  type WriterPrisma,
  type WriterPrismaTx,
} from './houzez-property-writer';
import { buildHouzezMigrationImageKey } from './storage-keys';
import { applyImageOptimizationPlan } from '../images/optimize-pipeline';

type Row = Record<string, unknown>;

class FakeWriterPrisma implements WriterPrisma {
  refs = new Map<string, Row>();
  properties: Row[] = [];
  listings: Row[] = [];
  prices: Row[] = [];
  images: Row[] = [];
  features: Row[] = [];
  agentAccess: Row[] = [];
  failOn: string | null = null;
  uniqueOnCreate = false;
  schemaAvailable = true;

  migrationSourceRef = {
    findUnique: (args: unknown) => {
      const where = (
        args as {
          where: {
            tenantId_sourceSystem_sourceId_entityType: {
              tenantId: string;
              sourceSystem: string;
              sourceId: string;
              entityType: string;
            };
          };
        }
      ).where.tenantId_sourceSystem_sourceId_entityType;
      const key = `${where.tenantId}|${where.sourceSystem}|${where.sourceId}|${where.entityType}`;
      const hit = this.refs.get(key);
      return Promise.resolve(
        hit
          ? {
              entityId: String(hit.entityId),
              migrationBatchId: String(hit.migrationBatchId),
              entityType: String(hit.entityType),
              metadata: hit.metadata,
            }
          : null,
      );
    },
    findMany: () => Promise.resolve([]),
    create: (args: unknown) => {
      const data = (args as { data: Row }).data;
      const key = `${String(data.tenantId)}|${String(data.sourceSystem)}|${String(data.sourceId)}|${String(data.entityType)}`;
      if (this.refs.has(key) || this.uniqueOnCreate) {
        const err = new Error('Unique constraint failed') as Error & {
          code: string;
        };
        err.code = 'P2002';
        return Promise.reject(err);
      }
      this.refs.set(key, data);
      return Promise.resolve({ id: String(data.id) });
    },
  };

  $queryRawUnsafe = () =>
    Promise.resolve(this.schemaAvailable ? [{ '?column?': 1 }] : []);

  private tx(): WriterPrismaTx {
    return {
      property: {
        create: (args: unknown) => {
          if (this.failOn === 'property') {
            return Promise.reject(new Error('property create failed'));
          }
          const data = (args as { data: Row }).data;
          this.properties.push(data);
          return Promise.resolve({ id: String(data.id) });
        },
      },
      propertyListing: {
        create: (args: unknown) => {
          if (this.failOn === 'listing') {
            return Promise.reject(new Error('listing create failed'));
          }
          const data = (args as { data: Row }).data;
          this.listings.push(data);
          return Promise.resolve({ id: String(data.id) });
        },
      },
      propertyPrice: {
        create: (args: unknown) => {
          if (this.failOn === 'price') {
            return Promise.reject(new Error('price create failed'));
          }
          const data = (args as { data: Row }).data;
          this.prices.push(data);
          return Promise.resolve({ id: String(data.id) });
        },
      },
      propertyImage: {
        create: (args: unknown) => {
          if (this.failOn === 'image') {
            return Promise.reject(new Error('image create failed'));
          }
          const data = (args as { data: Row }).data;
          this.images.push(data);
          return Promise.resolve({ id: String(data.id) });
        },
      },
      propertyFeatureAssignment: {
        create: (args: unknown) => {
          if (this.failOn === 'feature') {
            return Promise.reject(new Error('feature create failed'));
          }
          const data = (args as { data: Row }).data;
          this.features.push(data);
          return Promise.resolve({ id: String(data.id) });
        },
      },
      propertyAgentAccess: {
        create: (args: unknown) => {
          if (this.failOn === 'agent') {
            return Promise.reject(new Error('agent create failed'));
          }
          const data = (args as { data: Row }).data;
          this.agentAccess.push(data);
          return Promise.resolve({ id: String(data.id) });
        },
      },
      migrationSourceRef: {
        create: (args: unknown) => this.migrationSourceRef.create(args),
      },
    };
  }

  async $transaction<T>(fn: (tx: WriterPrismaTx) => Promise<T>): Promise<T> {
    const snapshot = {
      properties: [...this.properties],
      listings: [...this.listings],
      prices: [...this.prices],
      images: [...this.images],
      features: [...this.features],
      agentAccess: [...this.agentAccess],
      refs: new Map(this.refs),
    };
    try {
      return await fn(this.tx());
    } catch (error) {
      this.properties = snapshot.properties;
      this.listings = snapshot.listings;
      this.prices = snapshot.prices;
      this.images = snapshot.images;
      this.features = snapshot.features;
      this.agentAccess = snapshot.agentAccess;
      this.refs = snapshot.refs;
      throw error;
    }
  }
}

function makeTransform(): PublishTransformResult {
  return {
    property: {
      title: 'Lote comercial',
      slug: 'lote-comercial-5312',
      description: null,
      propertyType: 'LAND',
      isActive: true,
      city: 'CABA',
      province: 'Ciudad Autónoma de Buenos Aires',
      country: 'AR',
      neighborhood: 'Palermo',
      street: null,
      streetNumber: null,
      latitude: null,
      longitude: null,
      geocodeSource: null,
      totalArea: 202,
      coveredArea: null,
      rooms: null,
      bedrooms: null,
      bathrooms: null,
      halfBathrooms: null,
      parkingSpaces: null,
      internalCode: 'WP-5312',
    },
    listing: { listingType: 'SALE', status: 'ACTIVE' },
    price: { amount: 195000, currency: 'USD', isPrimary: true },
    featureNames: ['Uso Comercial'],
    inferences: [],
    warnings: [],
    blockers: [],
  };
}

function makeOwner(): OwnerResolution {
  return {
    ok: true,
    tenantId: 'tenant-demo',
    tenantSlug: 'demo',
    userId: 'user-admin',
    email: 'admin@demo.valorar.dev',
    role: 'ADMIN',
    errors: [],
  };
}

function makeCatalogs(): CatalogResolution[] {
  return [
    {
      key: 'feature:Uso Comercial',
      status: 'resolved',
      value: { id: 'feat-uso-comercial', slug: 'uso-comercial' },
      detail: 'ok',
    },
    {
      key: 'countryId',
      status: 'resolved',
      value: { id: 'country-ar', iso2: 'AR' },
      detail: 'ok',
    },
  ];
}

function makeDryRun(images: ImagePlanEntry[], plannedCount = 12): DryRunReport {
  const manifest = loadBundledDatasetManifest();
  const base: Omit<DryRunReport, 'reportFingerprint'> = {
    mode: 'dry-run',
    batchId: 'batch-test',
    wpId: 5312,
    sourceSystem: HOUZEZ_SOURCE_SYSTEM,
    tenantSlug: 'demo',
    ownerEmail: 'admin@demo.valorar.dev',
    safety: {
      migrationTarget: 'staging-houzez',
      dbHostMasked: '***',
      gatesSatisfied: true,
      dbAccessEnabled: true,
      skipDb: false,
    },
    datasetManifest: {
      manifestId: manifest.manifestId,
      ok: true,
      fragmentDigests: manifest.fragments.map((f) => ({
        fileName: f.fileName,
        sha256: f.sha256,
        bytes: f.bytes,
      })),
    },
    preflight: {
      performed: true,
      propertyTreeEmpty: true,
      importBaselineMode: 'initial-empty-tree',
      importBaselineDetail: 'test fixture empty tree',
      propertyTreeCounts: {
        Property: 0,
        PropertyListing: 0,
        PropertyPrice: 0,
        PropertyImage: 0,
        PropertyFeatureAssignment: 0,
        PropertyAgentAccess: 0,
      },
      pilotFeaturePresent: true,
      geoOk: true,
      migrationSourceRefExists: true,
      baseline: { userCount: 5, developmentCount: 1 },
      pilotBlockers: [],
      informativeWarnings: [],
      importBlockers: [],
    },
    owner: makeOwner(),
    source: null,
    transformed: null,
    inferences: [],
    catalogs: makeCatalogs(),
    images: images.map((img) => ({ ...img, absolutePath: null })),
    imageSummary: {
      galleryCount: 6,
      uniqueCount: images.length,
      coverAttachmentId: images[0]?.attachmentId ?? null,
      coverInGallery: false,
      coverPrepended: true,
      allOriginalsExist: true,
      exceedsImageLimit: false,
      imageLimit: 30,
    },
    oldUrl: {
      status: 'verified',
      oldSlug: 'x',
      postDate: null,
      oldUrl: null,
      components: {},
      notes: [],
    },
    plannedEntities: Array.from({ length: plannedCount }, (_, i) => ({
      entityType: 'property' as const,
      provisionalKey: 'p:' + String(i),
      sourceId: '5312',
      payload: {},
    })),
    idempotency: {
      schema: { available: true },
      existingPropertyRef: null,
      note: 'ok',
      idempotencySchemaAvailable: true,
      idempotencyDbCheckPerformed: true,
    },
    warnings: [],
    blockers: [],
    wouldWrite: false,
  };
  return {
    ...base,
    reportFingerprint: computeDryRunFingerprint({
      ...base,
      reportFingerprint: '',
    }),
  };
}

async function makeImages(
  tmpDir: string,
  count = 7,
): Promise<{ source: ImagePlanEntry[]; optimized: ImagePlanEntry[] }> {
  const source: ImagePlanEntry[] = [];
  for (let i = 0; i < count; i++) {
    const file = path.join(tmpDir, 'img-' + i + '.jpg');
    const buf = await sharp({
      create: {
        width: 120 + i * 10,
        height: 90 + i * 5,
        channels: 3,
        background: { r: 40 + i * 20, g: 80, b: 120 },
      },
    })
      .jpeg({ quality: 90 })
      .toBuffer();
    fs.writeFileSync(file, buf);
    source.push({
      sortOrder: i,
      attachmentId: 5315 + i,
      isCover: i === 0,
      relativePath: 'img-' + i + '.jpg',
      absolutePath: file,
      exists: true,
      mimeType: 'image/jpeg',
      width: 120 + i * 10,
      height: 90 + i * 5,
      fileSizeBytes: buf.length,
      sha256: null,
      sourceSha256: null,
      proposedStorageKeyPattern: 'x',
      proposedFilename:
        String(i).padStart(2, '0') + '-wp' + String(5315 + i) + '.jpg',
    });
  }
  const optimized = await applyImageOptimizationPlan({
    images: source,
    tenantId: 'tenant-demo',
    sourceId: '5312',
  });
  return { source, optimized: optimized.images };
}

describe('writeOneHouzezProperty', () => {
  let tmpDir: string;
  let prisma: FakeWriterPrisma;
  let store: InMemoryMigrationObjectStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'houzez-writer-'));
    prisma = new FakeWriterPrisma();
    store = new InMemoryMigrationObjectStore();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  async function runHappy() {
    const { source, optimized } = await makeImages(tmpDir, 7);
    return writeOneHouzezProperty({
      prisma,
      objectStore: store,
      dryRun: makeDryRun(optimized, 12),
      transform: makeTransform(),
      catalogs: makeCatalogs(),
      images: source,
      owner: makeOwner(),
      batchId: 'batch-happy',
      fingerprint: 'abc',
    });
  }

  it('imports optimized WebP bytes with ordered cover images + control ref', async () => {
    const report = await runHappy();
    expect(report.wrote).toBe(true);
    expect(report.error).toBeNull();
    expect(prisma.properties).toHaveLength(1);
    expect(prisma.listings).toHaveLength(1);
    expect(prisma.prices).toHaveLength(1);
    expect(prisma.images).toHaveLength(7);
    expect(prisma.features).toHaveLength(1);
    expect(prisma.agentAccess).toHaveLength(1);
    expect(prisma.refs.size).toBe(1);
    expect(report.domainEntityCount).toBe(12);
    expect(report.controlEntityCount).toBe(1);
    expect(prisma.images[0].isCover).toBe(true);
    expect(prisma.images.map((i) => i.sortOrder)).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ]);
    expect(store.objects.size).toBe(7);
    for (const key of store.objects.keys()) {
      expect(key.endsWith('.webp')).toBe(true);
    }
    for (const [, obj] of store.objects) {
      expect(obj.contentType).toBe('image/webp');
    }
    expect(JSON.stringify(report)).not.toMatch(
      /C:\\|HOUZEZ_STAGING_DATABASE_URL|postgresql:\/\//,
    );
  });

  it('blocks when MigrationSourceRef schema is absent', async () => {
    prisma.schemaAvailable = false;
    const report = await runHappy();
    expect(report.wrote).toBe(false);
    expect(report.error).toBe('IDEMPOTENCY_SCHEMA_REQUIRED_FOR_IMPORT');
    expect(store.objects.size).toBe(0);
  });

  it('blocks on preexisting source ref (idempotency pre-check)', async () => {
    prisma.refs.set('tenant-demo|wordpress-houzez|5312|property', {
      entityId: 'existing-prop',
      migrationBatchId: 'old',
      entityType: 'property',
      metadata: null,
    });
    const report = await runHappy();
    expect(report.wrote).toBe(false);
    expect(report.error).toBe('SOURCE_ALREADY_IMPORTED');
    expect(store.objects.size).toBe(0);
  });

  it('treats concurrent unique violation as already imported and rolls back', async () => {
    prisma.uniqueOnCreate = true;
    const report = await runHappy();
    expect(report.wrote).toBe(false);
    expect(report.error).toBe('SOURCE_ALREADY_IMPORTED');
    expect(prisma.properties).toHaveLength(0);
    expect(store.objects.size).toBe(0);
    expect(report.compensation.compensatedKeys.length).toBe(7);
  });

  it('rolls back DB and compensates uploads when a DB stage fails', async () => {
    for (const stage of [
      'property',
      'listing',
      'price',
      'image',
      'feature',
      'agent',
    ] as const) {
      prisma = new FakeWriterPrisma();
      store = new InMemoryMigrationObjectStore();
      prisma.failOn = stage;
      const { source, optimized } = await makeImages(tmpDir, 7);
      const report = await writeOneHouzezProperty({
        prisma,
        objectStore: store,
        dryRun: makeDryRun(optimized, 12),
        transform: makeTransform(),
        catalogs: makeCatalogs(),
        images: source,
        owner: makeOwner(),
        batchId: 'batch-' + stage,
        fingerprint: 'abc',
      });
      expect(report.wrote).toBe(false);
      expect(report.error).toBe('DB_TRANSACTION_FAILED');
      expect(prisma.properties).toHaveLength(0);
      expect(prisma.refs.size).toBe(0);
      expect(store.objects.size).toBe(0);
      expect(report.compensation.compensatedKeys.length).toBe(7);
    }
  });

  it('does not open DB transaction when an upload fails; compensates wrote keys', async () => {
    const { source, optimized } = await makeImages(tmpDir, 7);
    const failKey = buildHouzezMigrationImageKey({
      tenantId: 'tenant-demo',
      sourceId: '5312',
      sortOrder: 2,
      attachmentId: source[2].attachmentId,
      extension: 'webp',
    });
    store.failPutOnKey = failKey;
    const report = await writeOneHouzezProperty({
      prisma,
      objectStore: store,
      dryRun: makeDryRun(optimized, 12),
      transform: makeTransform(),
      catalogs: makeCatalogs(),
      images: source,
      owner: makeOwner(),
      batchId: 'batch-upload-fail',
      fingerprint: 'abc',
    });
    expect(report.wrote).toBe(false);
    expect(report.error).toBe('UPLOAD_FAILED');
    expect(prisma.properties).toHaveLength(0);
    expect(store.objects.size).toBe(0);
  });

  it('aborts before PutObject when approved dry-run hashes disagree', async () => {
    const { source, optimized } = await makeImages(tmpDir, 7);
    const tampered = optimized.map((img, i) =>
      i === 0 ? { ...img, sha256: '0'.repeat(64) } : img,
    );
    const report = await writeOneHouzezProperty({
      prisma,
      objectStore: store,
      dryRun: makeDryRun(tampered, 12),
      transform: makeTransform(),
      catalogs: makeCatalogs(),
      images: source,
      owner: makeOwner(),
      batchId: 'batch-hash-mismatch',
      fingerprint: 'abc',
    });
    expect(report.wrote).toBe(false);
    expect(report.error).toBe('IMAGE_PREPARE_FAILED');
    expect(
      report.blockers.some((b) => b.code === 'IMAGE_OPTIMIZE_PLAN_MISMATCH'),
    ).toBe(true);
    expect(store.objects.size).toBe(0);
    expect(prisma.properties).toHaveLength(0);
  });

  it('reports pending keys when compensation fails after DB error', async () => {
    prisma.failOn = 'listing';
    const { source, optimized } = await makeImages(tmpDir, 2);
    const key0 = buildHouzezMigrationImageKey({
      tenantId: 'tenant-demo',
      sourceId: '5312',
      sortOrder: 0,
      attachmentId: source[0].attachmentId,
      extension: 'webp',
    });
    store.failDeleteOnKey = key0;
    const report = await writeOneHouzezProperty({
      prisma,
      objectStore: store,
      dryRun: makeDryRun(optimized, 12),
      transform: makeTransform(),
      catalogs: makeCatalogs(),
      images: source,
      owner: makeOwner(),
      batchId: 'batch-comp-fail',
      fingerprint: 'abc',
    });
    expect(report.wrote).toBe(false);
    expect(report.error).toBe('COMPENSATION_FAILED_AFTER_DB');
    expect(report.compensation.pendingKeys).toContain(key0);
    expect(report.compensation.compensationFailed).toBe(true);
    expect(store.objects.has(key0)).toBe(true);
  });

  it('does not delete preexisting R2 objects on retry', async () => {
    const { source, optimized } = await makeImages(tmpDir, 2);
    const key0 = buildHouzezMigrationImageKey({
      tenantId: 'tenant-demo',
      sourceId: '5312',
      sortOrder: 0,
      attachmentId: source[0].attachmentId,
      extension: 'webp',
    });
    store.seedPreexisting(key0, Buffer.from('old'), 'image/webp');
    prisma.failOn = 'property';
    const report = await writeOneHouzezProperty({
      prisma,
      objectStore: store,
      dryRun: makeDryRun(optimized, 12),
      transform: makeTransform(),
      catalogs: makeCatalogs(),
      images: source,
      owner: makeOwner(),
      batchId: 'batch-preexisting',
      fingerprint: 'abc',
    });
    expect(report.wrote).toBe(false);
    expect(store.objects.has(key0)).toBe(true);
    expect(store.deletedKeys).not.toContain(key0);
    expect(report.compensation.uploadedKeys).not.toContain(key0);
    expect(
      report.warnings.some((w) => w.code === 'R2_PREEXISTING_KEYS_REUSED'),
    ).toBe(true);
  });
});
