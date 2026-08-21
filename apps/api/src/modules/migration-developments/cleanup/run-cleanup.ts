import {
  AUTHORIZED_PRODUCTION_TENANT_SLUG,
  DEFAULT_TENANT_SLUG,
  DEVELOPMENT_ENTITY_TYPE,
  DEVELOPMENTS_SOURCE_SYSTEM,
} from '../constants';
import type { CleanupCounts, CleanupReport, GateIssue } from '../types';
import {
  resolveTenantAndCreator,
  type ActorPrisma,
} from '../identity/resolve-actor';
import {
  expectedCleanupConfirmToken,
  isProductionTarget,
  validateDevelopmentEnvironment,
  type NeonIdentity,
} from '../safety/environment';
import { storagePrefixForTenant } from '../writer/storage-keys';
import type { MigrationObjectStore } from '../writer/object-store';
import { inspectMigrations } from '../preflight/run-preflight';

const PROPERTY_ENTITY_PREFIX = 'property';
const FORBIDDEN_KEY_MARKERS = ['wordpress-houzez', '/properties/'] as const;

export type CleanupPrisma = ActorPrisma & {
  $queryRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown>;
  migrationSourceRef: {
    findMany: (args: unknown) => Promise<
      Array<{
        id: string;
        tenantId: string;
        entityType: string;
        entityId: string;
        sourceSystem: string;
        sourceId: string;
      }>
    >;
    deleteMany: (args: unknown) => Promise<{ count: number }>;
  };
  development: {
    findMany: (
      args: unknown,
    ) => Promise<
      Array<{ id: string; tenantId: string; slug: string; title: string }>
    >;
    deleteMany: (args: unknown) => Promise<{ count: number }>;
  };
  developmentImage: {
    findMany: (
      args: unknown,
    ) => Promise<
      Array<{ id: string; developmentId: string; storageKey: string }>
    >;
  };
  developmentFeatureAssignment: {
    count: (args: unknown) => Promise<number>;
  };
  developmentTypology: {
    count: (args: unknown) => Promise<number>;
  };
};

function emptyCounts(): CleanupCounts {
  return {
    developments: 0,
    images: 0,
    featureAssignments: 0,
    typologies: 0,
    sourceRefs: 0,
    storageObjects: 0,
  };
}

function failedCleanup(input: {
  mode: 'dry-run' | 'execute';
  environment: CleanupReport['environment'];
  tenantSlug: string;
  tenantId?: string | null;
  blockers: GateIssue[];
  warnings?: GateIssue[];
  storagePrefix?: string | null;
}): CleanupReport {
  return {
    command: 'cleanup',
    mode: input.mode,
    ok: false,
    executed: false,
    environment: input.environment,
    tenant: { id: input.tenantId ?? null, slug: input.tenantSlug },
    sourceSystem: DEVELOPMENTS_SOURCE_SYSTEM,
    storagePrefix: input.storagePrefix ?? null,
    counts: emptyCounts(),
    deleted: emptyCounts(),
    blockers: input.blockers,
    warnings: input.warnings ?? [],
    writes: { database: false, storage: false },
  };
}

function forbiddenStorageReason(key: string, prefix: string): string | null {
  if (!key.startsWith(prefix)) {
    return `Storage key is outside ${prefix}`;
  }
  for (const marker of FORBIDDEN_KEY_MARKERS) {
    if (key.includes(marker)) {
      return `Storage key contains forbidden marker ${marker}`;
    }
  }
  return null;
}

export async function runCleanup(input: {
  prisma: CleanupPrisma;
  objectStore: MigrationObjectStore;
  target: string;
  confirm?: string;
  dryRun: boolean;
  tenantSlug?: string;
  createdBy?: string;
  databaseUrl?: string;
  storageBucket?: string;
  storageEndpoint?: string;
  storagePublicUrl?: string;
  allowedDbHost?: string;
  allowedStorageBucket?: string;
  migrationsDir: string;
}): Promise<CleanupReport> {
  const mode = input.dryRun ? 'dry-run' : 'execute';
  const tenantSlug = input.tenantSlug?.trim() || DEFAULT_TENANT_SLUG;
  const warnings: GateIssue[] = [];

  let neon: NeonIdentity | null = null;
  try {
    const rows = (await input.prisma.$queryRawUnsafe(
      `SELECT current_setting('neon.project_id', true) AS project, current_setting('neon.branch_id', true) AS branch, current_setting('neon.endpoint_id', true) AS endpoint`,
    )) as Array<{
      project: string | null;
      branch: string | null;
      endpoint: string | null;
    }>;
    neon = {
      projectId: rows[0]?.project?.trim() || null,
      branchId: rows[0]?.branch?.trim() || null,
      endpointId: rows[0]?.endpoint?.trim() || null,
    };
  } catch {
    neon = null;
  }

  const env = validateDevelopmentEnvironment({
    target: input.target,
    confirm: input.confirm,
    requireConfirm: !input.dryRun,
    expectedConfirmToken: expectedCleanupConfirmToken(input.target),
    databaseUrl: input.databaseUrl,
    storageBucket: input.storageBucket,
    storageEndpoint: input.storageEndpoint,
    storagePublicUrl: input.storagePublicUrl,
    neon,
    allowedDbHost: input.allowedDbHost,
    allowedStorageBucket: input.allowedStorageBucket,
  });
  warnings.push(...env.warnings);

  if (!env.ok) {
    return failedCleanup({
      mode,
      environment: env.environment,
      tenantSlug,
      blockers: env.blockers,
      warnings,
    });
  }

  if (
    isProductionTarget(input.target) &&
    tenantSlug !== AUTHORIZED_PRODUCTION_TENANT_SLUG
  ) {
    return failedCleanup({
      mode,
      environment: env.environment,
      tenantSlug,
      blockers: [
        {
          code: 'PRODUCTION_TENANT_NOT_AUTHORIZED',
          message: `Production cleanup only authorizes tenant slug="${AUTHORIZED_PRODUCTION_TENANT_SLUG}".`,
          blocking: true,
        },
      ],
      warnings,
    });
  }

  const actor = await resolveTenantAndCreator({
    prisma: input.prisma,
    tenantSlug,
    createdBy: input.createdBy,
  });
  if (!actor.ok) {
    return failedCleanup({
      mode,
      environment: env.environment,
      tenantSlug,
      blockers: actor.blockers,
      warnings,
    });
  }

  const migrations = await inspectMigrations({
    prisma: input.prisma as never,
    migrationsDir: input.migrationsDir,
  });
  if (migrations.drift) {
    return failedCleanup({
      mode,
      environment: env.environment,
      tenantSlug,
      tenantId: actor.actor.tenantId,
      blockers: [
        {
          code: 'MIGRATION_DRIFT',
          message:
            'Unexpected or failed Prisma migrations were detected. Refusing cleanup.',
          blocking: true,
        },
      ],
      warnings,
    });
  }

  const refs = await input.prisma.migrationSourceRef.findMany({
    where: {
      tenantId: actor.actor.tenantId,
      sourceSystem: DEVELOPMENTS_SOURCE_SYSTEM,
    },
  });

  const propertyRefs = refs.filter((ref) =>
    ref.entityType.toLowerCase().startsWith(PROPERTY_ENTITY_PREFIX),
  );
  if (propertyRefs.length) {
    return failedCleanup({
      mode,
      environment: env.environment,
      tenantSlug,
      tenantId: actor.actor.tenantId,
      blockers: [
        {
          code: 'CLEANUP_PROPERTY_REF_REFUSED',
          message:
            'Found MigrationSourceRef rows that look like Property entities. Cleanup refuses to continue.',
          blocking: true,
        },
      ],
      warnings,
    });
  }

  const developmentIds = [
    ...new Set(
      refs
        .filter((ref) => ref.entityType === DEVELOPMENT_ENTITY_TYPE)
        .map((ref) => ref.entityId),
    ),
  ];
  const developments = developmentIds.length
    ? await input.prisma.development.findMany({
        where: { id: { in: developmentIds } },
      })
    : [];
  const foreign = developments.filter(
    (row) => row.tenantId !== actor.actor.tenantId,
  );
  if (foreign.length) {
    return failedCleanup({
      mode,
      environment: env.environment,
      tenantSlug,
      tenantId: actor.actor.tenantId,
      blockers: [
        {
          code: 'CLEANUP_TENANT_MISMATCH',
          message:
            'A lote Development belongs to another tenant. Cleanup refuses to continue.',
          blocking: true,
        },
      ],
      warnings,
    });
  }

  const scopedDevelopmentIds = developments.map((row) => row.id);
  const images = scopedDevelopmentIds.length
    ? await input.prisma.developmentImage.findMany({
        where: {
          tenantId: actor.actor.tenantId,
          developmentId: { in: scopedDevelopmentIds },
        },
      })
    : [];
  const featureAssignments = scopedDevelopmentIds.length
    ? await input.prisma.developmentFeatureAssignment.count({
        where: {
          tenantId: actor.actor.tenantId,
          developmentId: { in: scopedDevelopmentIds },
        },
      })
    : 0;
  const typologies = scopedDevelopmentIds.length
    ? await input.prisma.developmentTypology.count({
        where: {
          tenantId: actor.actor.tenantId,
          developmentId: { in: scopedDevelopmentIds },
        },
      })
    : 0;

  const prefix = storagePrefixForTenant(actor.actor.tenantId);
  for (const image of images) {
    const reason = forbiddenStorageReason(image.storageKey, prefix);
    if (reason) {
      return failedCleanup({
        mode,
        environment: env.environment,
        tenantSlug,
        tenantId: actor.actor.tenantId,
        storagePrefix: prefix,
        blockers: [
          {
            code: 'CLEANUP_STORAGE_KEY_OUT_OF_SCOPE',
            message: `${reason}: ${image.storageKey}`,
            blocking: true,
          },
        ],
        warnings,
      });
    }
  }

  let listedKeys: string[] = [];
  try {
    listedKeys = await input.objectStore.listByPrefix(prefix);
  } catch (error) {
    return failedCleanup({
      mode,
      environment: env.environment,
      tenantSlug,
      tenantId: actor.actor.tenantId,
      storagePrefix: prefix,
      blockers: [
        {
          code: 'CLEANUP_STORAGE_LIST_FAILED',
          message:
            error instanceof Error
              ? error.message
              : 'Could not list storage objects for the lote prefix.',
          blocking: true,
        },
      ],
      warnings,
    });
  }

  for (const key of listedKeys) {
    const reason = forbiddenStorageReason(key, prefix);
    if (reason) {
      return failedCleanup({
        mode,
        environment: env.environment,
        tenantSlug,
        tenantId: actor.actor.tenantId,
        storagePrefix: prefix,
        blockers: [
          {
            code: 'CLEANUP_STORAGE_KEY_OUT_OF_SCOPE',
            message: `${reason}: ${key}`,
            blocking: true,
          },
        ],
        warnings,
      });
    }
  }

  const counts: CleanupCounts = {
    developments: developments.length,
    images: images.length,
    featureAssignments,
    typologies,
    sourceRefs: refs.length,
    storageObjects: listedKeys.length,
  };

  if (input.dryRun) {
    return {
      command: 'cleanup',
      mode,
      ok: true,
      executed: false,
      environment: env.environment,
      tenant: { id: actor.actor.tenantId, slug: actor.actor.tenantSlug },
      sourceSystem: DEVELOPMENTS_SOURCE_SYSTEM,
      storagePrefix: prefix,
      counts,
      deleted: emptyCounts(),
      blockers: [],
      warnings,
      writes: { database: false, storage: false },
    };
  }

  const developmentsDeleted = scopedDevelopmentIds.length
    ? await input.prisma.development.deleteMany({
        where: {
          tenantId: actor.actor.tenantId,
          id: { in: scopedDevelopmentIds },
        },
      })
    : { count: 0 };
  const refsDeleted = await input.prisma.migrationSourceRef.deleteMany({
    where: {
      tenantId: actor.actor.tenantId,
      sourceSystem: DEVELOPMENTS_SOURCE_SYSTEM,
    },
  });

  let storageDeleted = 0;
  const storageErrors: string[] = [];
  for (const key of listedKeys) {
    try {
      const deleted = await input.objectStore.deleteObject(key);
      if (deleted) storageDeleted += 1;
    } catch (error) {
      storageErrors.push(
        error instanceof Error ? `${key}: ${error.message}` : key,
      );
    }
  }

  const blockers: GateIssue[] = storageErrors.map((message) => ({
    code: 'CLEANUP_STORAGE_DELETE_FAILED',
    message,
    blocking: true,
  }));

  return {
    command: 'cleanup',
    mode,
    ok: blockers.length === 0,
    executed: true,
    environment: env.environment,
    tenant: { id: actor.actor.tenantId, slug: actor.actor.tenantSlug },
    sourceSystem: DEVELOPMENTS_SOURCE_SYSTEM,
    storagePrefix: prefix,
    counts,
    deleted: {
      developments: developmentsDeleted.count,
      images: images.length,
      featureAssignments,
      typologies,
      sourceRefs: refsDeleted.count,
      storageObjects: storageDeleted,
    },
    blockers,
    warnings,
    writes: {
      database: developmentsDeleted.count > 0 || refsDeleted.count > 0,
      storage: storageDeleted > 0,
    },
  };
}
