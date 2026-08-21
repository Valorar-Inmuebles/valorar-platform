import * as path from 'node:path';
import {
  CLEANUP_CONFIRM_TOKEN,
  DEFAULT_CREATOR_EMAIL,
  DEFAULT_TENANT_SLUG,
  DEVELOPMENT_ENTITY_TYPE,
  DEVELOPMENT_IMAGE_ENTITY_TYPE,
  DEVELOPMENTS_SOURCE_SYSTEM,
} from '../constants';
import { InMemoryMigrationObjectStore } from '../writer/object-store';
import { storagePrefixForTenant } from '../writer/storage-keys';
import { runCleanup, type CleanupPrisma } from './run-cleanup';

type RefRow = {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  sourceSystem: string;
  sourceId: string;
};

class FakeCleanupPrisma implements CleanupPrisma {
  tenantId = 'tenant-demo';
  developments: Array<{
    id: string;
    tenantId: string;
    slug: string;
    title: string;
  }> = [];
  images: Array<{ id: string; developmentId: string; storageKey: string }> = [];
  featureAssignments = 2;
  typologies = 0;
  refs: RefRow[] = [];
  propertyCreateAttempted = false;

  tenant = {
    findUnique: () =>
      Promise.resolve({
        id: this.tenantId,
        slug: DEFAULT_TENANT_SLUG,
        status: 'ACTIVE',
      }),
    findMany: () =>
      Promise.resolve([
        { id: this.tenantId, slug: DEFAULT_TENANT_SLUG, status: 'ACTIVE' },
      ]),
  };

  user = {
    findMany: () =>
      Promise.resolve([
        {
          id: 'user-admin',
          email: DEFAULT_CREATOR_EMAIL,
          tenantId: this.tenantId,
          isActive: true,
          role: 'TENANT_ADMIN',
        },
      ]),
  };

  migrationSourceRef = {
    findMany: (args: unknown) => {
      const where = (
        args as { where: { tenantId: string; sourceSystem: string } }
      ).where;
      return Promise.resolve(
        this.refs.filter(
          (ref) =>
            ref.tenantId === where.tenantId &&
            ref.sourceSystem === where.sourceSystem,
        ),
      );
    },
    deleteMany: (args: unknown) => {
      const where = (
        args as { where: { tenantId: string; sourceSystem: string } }
      ).where;
      const before = this.refs.length;
      this.refs = this.refs.filter(
        (ref) =>
          !(
            ref.tenantId === where.tenantId &&
            ref.sourceSystem === where.sourceSystem
          ),
      );
      return Promise.resolve({ count: before - this.refs.length });
    },
  };

  development = {
    findMany: (args: unknown) => {
      const where = (args as { where: { id: { in: string[] } } }).where;
      const ids = new Set(where.id.in);
      return Promise.resolve(
        this.developments.filter((row) => ids.has(row.id)),
      );
    },
    deleteMany: (args: unknown) => {
      const where = (
        args as { where: { tenantId: string; id: { in: string[] } } }
      ).where;
      const ids = new Set(where.id.in);
      const before = this.developments.length;
      this.developments = this.developments.filter(
        (row) => !(row.tenantId === where.tenantId && ids.has(row.id)),
      );
      this.images = this.images.filter((image) =>
        this.developments.some((row) => row.id === image.developmentId),
      );
      return Promise.resolve({ count: before - this.developments.length });
    },
  };

  developmentImage = {
    findMany: (args: unknown) => {
      const where = (
        args as {
          where: { tenantId: string; developmentId: { in: string[] } };
        }
      ).where;
      const ids = new Set(where.developmentId.in);
      return Promise.resolve(
        this.images.filter((image) => ids.has(image.developmentId)),
      );
    },
  };

  developmentFeatureAssignment = {
    count: () => Promise.resolve(this.featureAssignments),
  };

  developmentTypology = {
    count: () => Promise.resolve(this.typologies),
  };

  $queryRawUnsafe = (query: string) => {
    if (query.includes('neon.project_id')) {
      return Promise.resolve([
        {
          project: 'dev-project',
          branch: 'br-dev-branch',
          endpoint: 'ep-dev-endpoint',
        },
      ]);
    }
    return Promise.resolve([]);
  };
}

function seedLote(
  prisma: FakeCleanupPrisma,
  store: InMemoryMigrationObjectStore,
) {
  const developmentId = 'dev-001';
  const prefix = storagePrefixForTenant(prisma.tenantId);
  const key = `${prefix}001/001.jpg`;
  prisma.developments.push({
    id: developmentId,
    tenantId: prisma.tenantId,
    slug: 'agrelo-4066',
    title: 'Agrelo 4066',
  });
  prisma.images.push({
    id: 'img-001',
    developmentId,
    storageKey: key,
  });
  prisma.refs.push(
    {
      id: 'ref-dev',
      tenantId: prisma.tenantId,
      entityType: DEVELOPMENT_ENTITY_TYPE,
      entityId: developmentId,
      sourceSystem: DEVELOPMENTS_SOURCE_SYSTEM,
      sourceId: '001',
    },
    {
      id: 'ref-img',
      tenantId: prisma.tenantId,
      entityType: DEVELOPMENT_IMAGE_ENTITY_TYPE,
      entityId: 'img-001',
      sourceSystem: DEVELOPMENTS_SOURCE_SYSTEM,
      sourceId: '001:001.jpg',
    },
  );
  store.seedPreexisting(key, Buffer.from('lote'), 'image/jpeg');
  store.seedPreexisting(
    `${prisma.tenantId}/properties/keep.jpg`,
    Buffer.from('property'),
    'image/jpeg',
  );
  store.seedPreexisting(
    `${prisma.tenantId}/migrations/wordpress-houzez/keep.jpg`,
    Buffer.from('houzez'),
    'image/jpeg',
  );
}

const sharedEnv = {
  target: 'development',
  databaseUrl: 'postgresql://u:p@ep-dev-branch.aws.neon.tech/neondb',
  storageBucket: 'valorar-images-dev',
  storageEndpoint: 'https://account.r2.cloudflarestorage.com',
  migrationsDir: path.resolve(__dirname, '../../../../../prisma/migrations'),
};

describe('runCleanup', () => {
  it('dry-run reports lote counts without deleting database or storage', async () => {
    const prisma = new FakeCleanupPrisma();
    const store = new InMemoryMigrationObjectStore();
    seedLote(prisma, store);

    const report = await runCleanup({
      prisma,
      objectStore: store,
      dryRun: true,
      tenantSlug: DEFAULT_TENANT_SLUG,
      createdBy: DEFAULT_CREATOR_EMAIL,
      ...sharedEnv,
    });

    expect(report.ok).toBe(true);
    expect(report.executed).toBe(false);
    expect(report.counts.developments).toBe(1);
    expect(report.counts.images).toBe(1);
    expect(report.counts.sourceRefs).toBe(2);
    expect(report.counts.storageObjects).toBe(1);
    expect(report.deleted.developments).toBe(0);
    expect(prisma.developments).toHaveLength(1);
    expect(store.objects.has(`${prisma.tenantId}/properties/keep.jpg`)).toBe(
      true,
    );
    expect(
      store.objects.has(
        `${prisma.tenantId}/migrations/wordpress-houzez/keep.jpg`,
      ),
    ).toBe(true);
  });

  it('execute deletes only the lote and prefix objects', async () => {
    const prisma = new FakeCleanupPrisma();
    const store = new InMemoryMigrationObjectStore();
    seedLote(prisma, store);
    const loteKey = `${storagePrefixForTenant(prisma.tenantId)}001/001.jpg`;

    const report = await runCleanup({
      prisma,
      objectStore: store,
      dryRun: false,
      confirm: CLEANUP_CONFIRM_TOKEN,
      tenantSlug: DEFAULT_TENANT_SLUG,
      createdBy: DEFAULT_CREATOR_EMAIL,
      ...sharedEnv,
    });

    expect(report.ok).toBe(true);
    expect(report.executed).toBe(true);
    expect(report.deleted.developments).toBe(1);
    expect(report.deleted.sourceRefs).toBe(2);
    expect(report.deleted.storageObjects).toBe(1);
    expect(prisma.developments).toHaveLength(0);
    expect(prisma.refs).toHaveLength(0);
    expect(store.objects.has(loteKey)).toBe(false);
    expect(store.objects.has(`${prisma.tenantId}/properties/keep.jpg`)).toBe(
      true,
    );
    expect(
      store.objects.has(
        `${prisma.tenantId}/migrations/wordpress-houzez/keep.jpg`,
      ),
    ).toBe(true);
  });

  it('refuses to continue if a Property-like source ref is in the lote query', async () => {
    const prisma = new FakeCleanupPrisma();
    const store = new InMemoryMigrationObjectStore();
    seedLote(prisma, store);
    prisma.refs.push({
      id: 'ref-property',
      tenantId: prisma.tenantId,
      entityType: 'property',
      entityId: 'prop-1',
      sourceSystem: DEVELOPMENTS_SOURCE_SYSTEM,
      sourceId: 'should-not-happen',
    });

    const report = await runCleanup({
      prisma,
      objectStore: store,
      dryRun: true,
      tenantSlug: DEFAULT_TENANT_SLUG,
      createdBy: DEFAULT_CREATOR_EMAIL,
      ...sharedEnv,
    });

    expect(report.ok).toBe(false);
    expect(
      report.blockers.some(
        (issue) => issue.code === 'CLEANUP_PROPERTY_REF_REFUSED',
      ),
    ).toBe(true);
    expect(prisma.developments).toHaveLength(1);
  });
});
