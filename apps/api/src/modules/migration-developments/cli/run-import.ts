import {
  ALLOWED_MIGRATION_TARGET,
  DEFAULT_TENANT_SLUG,
  SORT_ORDER_MIGRATION,
} from '../constants';
import type {
  DevelopmentPlan,
  ImportRecordResult,
  ImportReport,
} from '../types';
import {
  resolveTenantAndCreator,
  type ActorPrisma,
} from '../identity/resolve-actor';
import {
  resolveLiveGeo,
  type LiveGeoPrisma,
} from '../catalog/resolve-live-geo';
import { runPreflight, type PreflightPrisma } from '../preflight/run-preflight';
import {
  writeOneDevelopment,
  type WriterPrisma,
} from '../writer/development-writer';
import type { MigrationObjectStore } from '../writer/object-store';

export type ImportPrisma = PreflightPrisma &
  WriterPrisma &
  ActorPrisma &
  LiveGeoPrisma;

export async function runImport(input: {
  prisma: ImportPrisma;
  objectStore: MigrationObjectStore;
  plans: DevelopmentPlan[];
  target: string;
  confirm: string;
  tenantSlug?: string;
  createdBy?: string;
  databaseUrl?: string;
  storageBucket?: string;
  storageEndpoint?: string;
  storagePublicUrl?: string;
  allowedDbHost?: string;
  allowedStorageBucket?: string;
  migrationsDir: string;
  batchId: string;
}): Promise<ImportReport> {
  const preflight = await runPreflight({
    prisma: input.prisma,
    objectStore: input.objectStore,
    plans: input.plans,
    target: input.target || ALLOWED_MIGRATION_TARGET,
    confirm: input.confirm,
    requireConfirm: true,
    tenantSlug: input.tenantSlug ?? DEFAULT_TENANT_SLUG,
    createdBy: input.createdBy,
    databaseUrl: input.databaseUrl,
    storageBucket: input.storageBucket,
    storageEndpoint: input.storageEndpoint,
    storagePublicUrl: input.storagePublicUrl,
    allowedDbHost: input.allowedDbHost,
    allowedStorageBucket: input.allowedStorageBucket,
    migrationsDir: input.migrationsDir,
  });

  if (!preflight.ok) {
    return {
      command: 'import',
      ok: false,
      environment: preflight.environment,
      tenant: {
        id: preflight.tenant.id ?? '',
        slug: preflight.tenant.slug ?? input.tenantSlug ?? DEFAULT_TENANT_SLUG,
      },
      creator: {
        id: preflight.creator.id ?? '',
        email: preflight.creator.email ?? '',
        role: preflight.creator.role ?? '',
      },
      planned: input.plans.length,
      alreadyImported: 0,
      created: 0,
      skipped: 0,
      conflicts: 0,
      blocked: input.plans.length,
      errors: preflight.blockers.length,
      warnings: preflight.warnings.length,
      imagesUploaded: 0,
      imagesReused: 0,
      databaseWrites: 0,
      storageWrites: 0,
      records: [],
      blockers: preflight.blockers,
      writes: { database: false, storage: false },
    };
  }

  if (!preflight.migrations.sortOrderColumnExists) {
    return {
      command: 'import',
      ok: false,
      environment: preflight.environment,
      tenant: {
        id: preflight.tenant.id ?? '',
        slug: preflight.tenant.slug ?? DEFAULT_TENANT_SLUG,
      },
      creator: {
        id: preflight.creator.id ?? '',
        email: preflight.creator.email ?? '',
        role: preflight.creator.role ?? '',
      },
      planned: input.plans.length,
      alreadyImported: 0,
      created: 0,
      skipped: 0,
      conflicts: 0,
      blocked: input.plans.length,
      errors: 1,
      warnings: preflight.warnings.length,
      imagesUploaded: 0,
      imagesReused: 0,
      databaseWrites: 0,
      storageWrites: 0,
      records: [],
      blockers: [
        {
          code: 'SORT_ORDER_MIGRATION_REQUIRED',
          message: `Apply Prisma migration ${SORT_ORDER_MIGRATION} with migrate deploy before import.`,
          blocking: true,
        },
      ],
      writes: { database: false, storage: false },
    };
  }

  const actor = await resolveTenantAndCreator({
    prisma: input.prisma,
    tenantSlug: input.tenantSlug ?? DEFAULT_TENANT_SLUG,
    createdBy: input.createdBy,
  });
  if (!actor.ok) {
    return {
      command: 'import',
      ok: false,
      environment: preflight.environment,
      tenant: {
        id: preflight.tenant.id ?? '',
        slug: preflight.tenant.slug ?? DEFAULT_TENANT_SLUG,
      },
      creator: {
        id: '',
        email: '',
        role: '',
      },
      planned: input.plans.length,
      alreadyImported: 0,
      created: 0,
      skipped: 0,
      conflicts: 0,
      blocked: input.plans.length,
      errors: actor.blockers.length,
      warnings: preflight.warnings.length,
      imagesUploaded: 0,
      imagesReused: 0,
      databaseWrites: 0,
      storageWrites: 0,
      records: [],
      blockers: actor.blockers,
      writes: { database: false, storage: false },
    };
  }

  const presentFeatures = await input.prisma.propertyFeature.findMany({
    where: {
      slug: {
        in: [
          ...new Set(
            input.plans.flatMap((plan) =>
              plan.matchedFeatures.map((feature) => feature.slug),
            ),
          ),
        ],
      },
      isActive: true,
    },
  });
  const featureIdsBySlug = new Map(
    presentFeatures.map((feature) => [feature.slug, feature.id]),
  );

  const records: ImportRecordResult[] = [];
  for (const plan of input.plans) {
    const geo = await resolveLiveGeo({
      prisma: input.prisma,
      location: plan.location,
    });
    if (!geo.ok || !geo.provinceId || !geo.localityId) {
      records.push({
        sourceId: plan.sourceId,
        title: plan.title,
        status: 'blocked',
        developmentId: null,
        imagesCreated: 0,
        imagesUploaded: 0,
        imagesReused: 0,
        featuresAssigned: 0,
        refsCreated: 0,
        warnings: plan.warnings,
        errors: geo.errors,
        orphanStorageKeys: [],
      });
      continue;
    }

    const result = await writeOneDevelopment({
      prisma: input.prisma,
      objectStore: input.objectStore,
      plan,
      tenantId: actor.actor.tenantId,
      createdById: actor.actor.userId,
      batchId: input.batchId,
      countryId: geo.countryId,
      provinceId: geo.provinceId,
      localityId: geo.localityId,
      featureIdsBySlug,
    });
    records.push(result);
  }

  const created = records.filter((row) => row.status === 'created').length;
  const alreadyImported = records.filter(
    (row) => row.status === 'already_imported',
  ).length;
  const skipped = records.filter((row) => row.status === 'skipped').length;
  const conflicts = records.filter((row) => row.status === 'conflict').length;
  const blocked = records.filter((row) => row.status === 'blocked').length;
  const errors = records.filter((row) => row.status === 'error').length;
  const imagesUploaded = records.reduce(
    (sum, row) => sum + row.imagesUploaded,
    0,
  );
  const imagesReused = records.reduce((sum, row) => sum + row.imagesReused, 0);
  const databaseWrites = records.reduce(
    (sum, row) =>
      sum +
      (row.status === 'created'
        ? 1 + row.imagesCreated + row.featuresAssigned + row.refsCreated
        : 0),
    0,
  );

  return {
    command: 'import',
    ok: errors === 0 && conflicts === 0 && blocked === 0,
    environment: preflight.environment,
    tenant: {
      id: actor.actor.tenantId,
      slug: actor.actor.tenantSlug,
    },
    creator: {
      id: actor.actor.userId,
      email: actor.actor.email,
      role: actor.actor.role,
    },
    planned: input.plans.length,
    alreadyImported,
    created,
    skipped,
    conflicts,
    blocked,
    errors,
    warnings: records.reduce((sum, row) => sum + row.warnings.length, 0),
    imagesUploaded,
    imagesReused,
    databaseWrites,
    storageWrites: imagesUploaded,
    records,
    blockers: records
      .filter((row) => row.status === 'error' || row.status === 'conflict')
      .flatMap((row) =>
        row.errors.map((message) => ({
          code:
            row.status === 'conflict' ? 'IDENTITY_CONFLICT' : 'IMPORT_ERROR',
          message: `${row.sourceId}: ${message}`,
          blocking: true,
        })),
      ),
    writes: {
      database: databaseWrites > 0,
      storage: imagesUploaded > 0,
    },
  };
}
