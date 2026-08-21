import * as fs from 'node:fs';
import {
  DEVELOPMENT_ENTITY_TYPE,
  DEVELOPMENT_IMAGE_ENTITY_TYPE,
} from '../constants';
import {
  MINI_PNG,
  makeTempDir,
  writeFolder,
} from '../__fixtures__/temp-source';
import { inspectFolder } from '../discovery/discover-source';
import { planDevelopment } from '../planning/plan-development';
import type { DevelopmentPlan } from '../types';
import { InMemoryMigrationObjectStore } from './object-store';
import { buildDevelopmentImageStorageKey } from './storage-keys';
import {
  writeOneDevelopment,
  type WriterPrisma,
  type WriterPrismaTx,
} from './development-writer';

type Row = Record<string, unknown>;

function rowId(data: Row, fallback: string): string {
  return typeof data.id === 'string' ? data.id : fallback;
}

class FakeWriterPrisma implements WriterPrisma {
  developments: Row[] = [];
  images: Row[] = [];
  features: Row[] = [];
  typologies: Row[] = [];
  properties: Row[] = [];
  refs = new Map<string, Row>();
  propertyCreateCount = 0;
  typologyCreateCount = 0;

  private refLookupKey(where: Row): string | null {
    const compound = where.tenantId_sourceSystem_sourceId_entityType as
      | {
          tenantId: string;
          sourceSystem: string;
          sourceId: string;
          entityType: string;
        }
      | undefined;
    if (!compound) return null;
    return `${compound.tenantId}|${compound.sourceSystem}|${compound.sourceId}|${compound.entityType}`;
  }

  development = {
    findUnique: (args: unknown) => {
      const where = (args as { where: Row }).where;
      if (where.id) {
        return Promise.resolve(
          (this.developments.find((row) => row.id === where.id) as {
            id: string;
            slug: string;
            internalCode: string | null;
          } | null) ?? null,
        );
      }
      const slugKey = where.tenantId_slug as
        | { tenantId: string; slug: string }
        | undefined;
      if (slugKey) {
        const hit = this.developments.find(
          (row) =>
            row.tenantId === slugKey.tenantId && row.slug === slugKey.slug,
        );
        return Promise.resolve(
          hit
            ? {
                id: String(hit.id),
                slug: String(hit.slug),
                internalCode: (hit.internalCode as string | null) ?? null,
              }
            : null,
        );
      }
      const codeKey = where.tenantId_internalCode as
        | { tenantId: string; internalCode: string }
        | undefined;
      if (codeKey) {
        const hit = this.developments.find(
          (row) =>
            row.tenantId === codeKey.tenantId &&
            row.internalCode === codeKey.internalCode,
        );
        return Promise.resolve(
          hit
            ? {
                id: String(hit.id),
                slug: String(hit.slug),
                internalCode: (hit.internalCode as string | null) ?? null,
              }
            : null,
        );
      }
      return Promise.resolve(null);
    },
  };

  migrationSourceRef = {
    findUnique: (args: unknown) => {
      const where = (args as { where: Row }).where;
      const key = this.refLookupKey(where);
      if (!key) return Promise.resolve(null);
      const hit = this.refs.get(key);
      return Promise.resolve(
        hit
          ? {
              entityId: String(hit.entityId),
              entityType: String(hit.entityType),
              metadata: hit.metadata,
            }
          : null,
      );
    },
    create: (args: unknown) => {
      const data = (args as { data: Row }).data;
      const id = rowId(data, `ref-${this.refs.size + 1}`);
      const key = `${String(data.tenantId)}|${String(data.sourceSystem)}|${String(data.sourceId)}|${String(data.entityType)}`;
      if (this.refs.has(key)) {
        const err = new Error('Unique constraint failed') as Error & {
          code: string;
        };
        err.code = 'P2002';
        return Promise.reject(err);
      }
      const row = { ...data, id };
      this.refs.set(key, row);
      return Promise.resolve({ id });
    },
  };

  private tx(): WriterPrismaTx {
    return {
      development: {
        create: (args: unknown) => {
          const data = (args as { data: Row }).data;
          const id = rowId(data, `dev-${this.developments.length + 1}`);
          this.developments.push({ ...data, id });
          return Promise.resolve({ id });
        },
      },
      developmentImage: {
        create: (args: unknown) => {
          const data = (args as { data: Row }).data;
          const id = rowId(data, `img-${this.images.length + 1}`);
          this.images.push({ ...data, id });
          return Promise.resolve({ id });
        },
      },
      developmentFeatureAssignment: {
        create: (args: unknown) => {
          const data = (args as { data: Row }).data;
          const id = rowId(data, `feat-${this.features.length + 1}`);
          this.features.push({ ...data, id });
          return Promise.resolve({ id });
        },
      },
      developmentTypology: {
        create: (args: unknown) => {
          this.typologyCreateCount += 1;
          const data = (args as { data: Row }).data;
          this.typologies.push(data);
          return Promise.resolve({ id: 'typology-1' });
        },
      },
      property: {
        create: (args: unknown) => {
          this.propertyCreateCount += 1;
          const data = (args as { data: Row }).data;
          this.properties.push(data);
          return Promise.resolve({ id: 'property-1' });
        },
      },
      migrationSourceRef: {
        create: (args: unknown) => this.migrationSourceRef.create(args),
      },
    };
  }

  async $transaction<T>(fn: (tx: WriterPrismaTx) => Promise<T>): Promise<T> {
    const snapshot = {
      developments: [...this.developments],
      images: [...this.images],
      features: [...this.features],
      typologies: [...this.typologies],
      properties: [...this.properties],
      refs: new Map(this.refs),
      propertyCreateCount: this.propertyCreateCount,
      typologyCreateCount: this.typologyCreateCount,
    };
    try {
      return await fn(this.tx());
    } catch (error) {
      this.developments = snapshot.developments;
      this.images = snapshot.images;
      this.features = snapshot.features;
      this.typologies = snapshot.typologies;
      this.properties = snapshot.properties;
      this.refs = snapshot.refs;
      this.propertyCreateCount = snapshot.propertyCreateCount;
      this.typologyCreateCount = snapshot.typologyCreateCount;
      throw error;
    }
  }
}

function makePlan(): { plan: DevelopmentPlan; root: string } {
  const root = makeTempDir();
  const folder = writeFolder(root, '001 - Agrelo 4066', {
    '001.png': MINI_PNG,
    '002.png': MINI_PNG,
    '003.png': MINI_PNG,
    'info.txt':
      'Agrelo 4066\nEdificio en construcción.\nBarrio de Almagro.\nSUM y pileta.\n',
  });
  return { plan: planDevelopment(inspectFolder(folder)), root };
}

async function importOnce(
  prisma: FakeWriterPrisma,
  store: InMemoryMigrationObjectStore,
  plan: DevelopmentPlan,
) {
  return writeOneDevelopment({
    prisma,
    objectStore: store,
    plan,
    tenantId: 'tenant-demo',
    createdById: 'user-admin',
    batchId: 'batch-1',
    countryId: 'country-ar',
    provinceId: 'province-caba',
    localityId: 'locality-almagro',
    featureIdsBySlug: new Map([
      ['pileta', 'feat-pileta'],
      ['sum', 'feat-sum'],
    ]),
  });
}

describe('writeOneDevelopment', () => {
  afterEach(() => {
    // temp dirs are in os.tmpdir; no project files to clean
  });

  it('creates a Development with a single cover and preserved image order', async () => {
    const { plan } = makePlan();
    const prisma = new FakeWriterPrisma();
    const store = new InMemoryMigrationObjectStore();
    const result = await importOnce(prisma, store, plan);

    expect(result.status).toBe('created');
    expect(prisma.developments).toHaveLength(1);
    expect(prisma.developments[0]?.title).toBe('Agrelo 4066');
    expect(prisma.developments[0]?.sortOrder).toBe(1);
    expect(prisma.developments[0]?.isActive).toBe(true);
    expect(prisma.images).toHaveLength(3);
    expect(prisma.images.filter((row) => row.isCover === true)).toHaveLength(1);
    expect(prisma.images[0]?.isCover).toBe(true);
    expect(prisma.images.map((row) => row.sortOrder)).toEqual([0, 1, 2]);
    expect(prisma.propertyCreateCount).toBe(0);
    expect(prisma.typologyCreateCount).toBe(0);
  });

  it('creates root and image migration source refs', async () => {
    const { plan } = makePlan();
    const prisma = new FakeWriterPrisma();
    const result = await importOnce(
      prisma,
      new InMemoryMigrationObjectStore(),
      plan,
    );
    expect(result.refsCreated).toBe(4);
    const entityTypes = [...prisma.refs.values()].map((row) => row.entityType);
    expect(entityTypes).toContain(DEVELOPMENT_ENTITY_TYPE);
    expect(
      entityTypes.filter((type) => type === DEVELOPMENT_IMAGE_ENTITY_TYPE),
    ).toHaveLength(3);
  });

  it('does not duplicate on re-run', async () => {
    const { plan } = makePlan();
    const prisma = new FakeWriterPrisma();
    const store = new InMemoryMigrationObjectStore();
    const first = await importOnce(prisma, store, plan);
    const second = await importOnce(prisma, store, plan);
    expect(first.status).toBe('created');
    expect(second.status).toBe('already_imported');
    expect(prisma.developments).toHaveLength(1);
    expect(prisma.images).toHaveLength(3);
    expect(prisma.features).toHaveLength(first.featuresAssigned);
  });

  it('blocks a slug conflict without a source ref', async () => {
    const { plan } = makePlan();
    const prisma = new FakeWriterPrisma();
    prisma.developments.push({
      id: 'manual-1',
      tenantId: 'tenant-demo',
      slug: plan.slug,
      internalCode: 'MANUAL',
    });
    const result = await importOnce(
      prisma,
      new InMemoryMigrationObjectStore(),
      plan,
    );
    expect(result.status).toBe('conflict');
    expect(prisma.images).toHaveLength(0);
    expect(prisma.refs.size).toBe(0);
  });

  it('does not create Property rows', async () => {
    const { plan } = makePlan();
    const prisma = new FakeWriterPrisma();
    await importOnce(prisma, new InMemoryMigrationObjectStore(), plan);
    expect(prisma.propertyCreateCount).toBe(0);
    expect(prisma.properties).toHaveLength(0);
  });

  it('reuses an existing matching storage object', async () => {
    const { plan } = makePlan();
    const prisma = new FakeWriterPrisma();
    const store = new InMemoryMigrationObjectStore();
    const cover = plan.gallery[0];
    const key = buildDevelopmentImageStorageKey({
      tenantId: 'tenant-demo',
      sourceId: plan.sourceId,
      filename: cover.filename,
    });
    const body = fs.readFileSync(cover.absolutePath);
    store.seedPreexisting(key, body, cover.mimeType ?? 'image/png', {
      sha256: cover.checksumSha256,
    });
    const result = await importOnce(prisma, store, plan);
    expect(result.status).toBe('created');
    expect(result.imagesReused).toBeGreaterThanOrEqual(1);
    expect(result.imagesUploaded).toBe(
      plan.gallery.length - result.imagesReused,
    );
    expect(store.objects.get(key)?.body.equals(body)).toBe(true);
  });
});
