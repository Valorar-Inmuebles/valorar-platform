import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  ALLOWED_MIGRATION_TARGET,
  DEFAULT_TENANT_SLUG,
  DEVELOPMENTS_SOURCE_SYSTEM,
  REQUIRED_LOCALITY_NAMES,
  SORT_ORDER_MIGRATION,
  TRACEABILITY_MIGRATION,
} from '../constants';
import type {
  DevelopmentPlan,
  GateIssue,
  MigrationInspection,
  PreflightReport,
} from '../types';
import {
  resolveTenantAndCreator,
  type ActorPrisma,
} from '../identity/resolve-actor';
import {
  resolveLiveGeo,
  type LiveGeoPrisma,
} from '../catalog/resolve-live-geo';
import {
  validateDevelopmentEnvironment,
  type NeonIdentity,
} from '../safety/environment';
import type { MigrationObjectStore } from '../writer/object-store';

export type PreflightPrisma = ActorPrisma &
  LiveGeoPrisma & {
    propertyFeature: {
      findMany: (args: unknown) => Promise<Array<{ id: string; slug: string }>>;
    };
    migrationSourceRef?: {
      findMany: (args: unknown) => Promise<Array<{ sourceId: string }>>;
      findUnique?: (args: unknown) => Promise<unknown>;
    };
    $queryRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown>;
  };

async function readNeonIdentity(
  prisma: PreflightPrisma,
): Promise<NeonIdentity> {
  const read = async (key: string): Promise<string | null> => {
    try {
      const rows = (await prisma.$queryRawUnsafe(
        `SELECT current_setting('${key}', true) AS v`,
      )) as Array<{ v: string | null }>;
      const value = rows[0]?.v;
      return value && String(value).trim() ? String(value).trim() : null;
    } catch {
      return null;
    }
  };
  const [projectId, branchId, endpointId] = await Promise.all([
    read('neon.project_id'),
    read('neon.branch_id'),
    read('neon.endpoint_id'),
  ]);
  return { projectId, branchId, endpointId };
}

export async function inspectMigrations(input: {
  prisma: PreflightPrisma;
  migrationsDir: string;
}): Promise<MigrationInspection> {
  const files = fs.existsSync(input.migrationsDir)
    ? fs
        .readdirSync(input.migrationsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && /^\d+_/.test(entry.name))
        .map((entry) => entry.name)
        .sort()
    : [];

  let appliedRows: Array<{
    migration_name: string;
    finished_at: Date | string | null;
    rolled_back_at: Date | string | null;
  }> = [];
  try {
    appliedRows = (await input.prisma.$queryRawUnsafe(
      `SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY started_at`,
    )) as typeof appliedRows;
  } catch {
    appliedRows = [];
  }

  const applied = appliedRows
    .filter((row) => row.finished_at && !row.rolled_back_at)
    .map((row) => row.migration_name);
  const failed = appliedRows
    .filter((row) => !row.finished_at && !row.rolled_back_at)
    .map((row) => row.migration_name);
  const unexpected = applied.filter((name) => !files.includes(name));
  const pending = files.filter((name) => !applied.includes(name));

  let migrationSourceRefExists = false;
  try {
    const rows = (await input.prisma.$queryRawUnsafe(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'MigrationSourceRef' LIMIT 1`,
    )) as unknown[];
    migrationSourceRefExists = Array.isArray(rows) && rows.length > 0;
  } catch {
    migrationSourceRefExists = false;
  }

  let sortOrderColumnExists = false;
  try {
    const rows = (await input.prisma.$queryRawUnsafe(
      `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Development' AND column_name = 'sortOrder' LIMIT 1`,
    )) as unknown[];
    sortOrderColumnExists = Array.isArray(rows) && rows.length > 0;
  } catch {
    sortOrderColumnExists = false;
  }

  return {
    applied,
    pending,
    failed,
    unexpected,
    migrationSourceRefExists,
    sortOrderColumnExists,
    drift: failed.length > 0 || unexpected.length > 0,
  };
}

export async function runPreflight(input: {
  prisma: PreflightPrisma;
  objectStore: MigrationObjectStore | null;
  plans: DevelopmentPlan[];
  target?: string;
  confirm?: string;
  requireConfirm?: boolean;
  tenantSlug?: string;
  createdBy?: string;
  databaseUrl?: string;
  storageBucket?: string;
  storageEndpoint?: string;
  storagePublicUrl?: string;
  allowedDbHost?: string;
  allowedStorageBucket?: string;
  migrationsDir: string;
}): Promise<PreflightReport> {
  const blockers: GateIssue[] = [];
  const warnings: GateIssue[] = [];

  let neon: NeonIdentity | null = null;
  let databaseOk = false;
  try {
    await input.prisma.$queryRawUnsafe('SELECT 1');
    databaseOk = true;
    neon = await readNeonIdentity(input.prisma);
  } catch {
    blockers.push({
      code: 'DATABASE_UNREACHABLE',
      message: 'Could not connect to the database.',
      blocking: true,
    });
  }

  const env = validateDevelopmentEnvironment({
    target: input.target ?? ALLOWED_MIGRATION_TARGET,
    confirm: input.confirm,
    requireConfirm: input.requireConfirm === true,
    databaseUrl: input.databaseUrl,
    storageBucket: input.storageBucket,
    storageEndpoint: input.storageEndpoint,
    storagePublicUrl: input.storagePublicUrl,
    neon,
    allowedDbHost: input.allowedDbHost,
    allowedStorageBucket: input.allowedStorageBucket,
  });
  blockers.push(...(env.ok ? [] : env.blockers));
  warnings.push(...env.warnings);

  let storageOk = false;
  if (input.objectStore) {
    try {
      storageOk = await input.objectStore.ping();
    } catch {
      storageOk = false;
    }
  }
  if (!storageOk) {
    blockers.push({
      code: 'STORAGE_UNREACHABLE',
      message: 'Could not reach the configured development storage bucket.',
      blocking: true,
    });
  }

  const actor = await resolveTenantAndCreator({
    prisma: input.prisma,
    tenantSlug: input.tenantSlug ?? DEFAULT_TENANT_SLUG,
    createdBy: input.createdBy,
  });
  if (!actor.ok) {
    blockers.push(...actor.blockers);
    if (actor.candidates.length) {
      warnings.push({
        code: 'ACTOR_CANDIDATES',
        message: `Candidates: ${actor.candidates.join(', ')}`,
        blocking: false,
      });
    }
  }

  const migrations = await inspectMigrations({
    prisma: input.prisma,
    migrationsDir: input.migrationsDir,
  });
  if (migrations.drift) {
    blockers.push({
      code: 'MIGRATION_DRIFT',
      message:
        'Unexpected or failed Prisma migrations were detected. Refusing to repair automatically.',
      blocking: true,
    });
  }
  if (!migrations.migrationSourceRefExists) {
    blockers.push({
      code: 'MIGRATION_SOURCE_REF_MISSING',
      message: `Table MigrationSourceRef is missing. Required migration ${TRACEABILITY_MIGRATION}.`,
      blocking: true,
    });
  }
  if (!migrations.sortOrderColumnExists) {
    warnings.push({
      code: 'SORT_ORDER_MIGRATION_PENDING',
      message: `Prisma migration ${SORT_ORDER_MIGRATION} is not applied yet.`,
      blocking: false,
    });
  }

  const requiredLocalities = [...REQUIRED_LOCALITY_NAMES];
  const missingLocalities: string[] = [];
  let provinceName: string | null = null;
  if (actor.ok) {
    const sample = input.plans.find(
      (plan) => plan.location.status === 'resolved',
    );
    if (sample) {
      const geo = await resolveLiveGeo({
        prisma: input.prisma,
        location: sample.location,
      });
      provinceName = sample.location.provinceName;
      if (!geo.ok) {
        blockers.push({
          code: 'GEO_CATALOG_UNRESOLVED',
          message: geo.errors.join(' '),
          blocking: true,
        });
      }
    }
    for (const name of requiredLocalities) {
      const plan = input.plans.find(
        (item) => item.location.localityName === name,
      );
      if (!plan) continue;
      const geo = await resolveLiveGeo({
        prisma: input.prisma,
        location: plan.location,
      });
      if (!geo.ok) missingLocalities.push(name);
    }
    if (missingLocalities.length) {
      blockers.push({
        code: 'REQUIRED_LOCALITIES_MISSING',
        message: `Live catalog is missing required localities: ${missingLocalities.join(', ')}.`,
        blocking: true,
      });
    }
  }

  const plannedFeatureSlugs = [
    ...new Set(
      input.plans.flatMap((plan) =>
        plan.matchedFeatures.map((feature) => feature.slug),
      ),
    ),
  ].sort();
  const presentFeatures = plannedFeatureSlugs.length
    ? await input.prisma.propertyFeature.findMany({
        where: { slug: { in: plannedFeatureSlugs }, isActive: true },
      })
    : [];
  const presentSlugs = presentFeatures.map((feature) => feature.slug);
  const missingFeatures = plannedFeatureSlugs.filter(
    (slug) => !presentSlugs.includes(slug),
  );
  if (missingFeatures.length) {
    warnings.push({
      code: 'FEATURES_MISSING',
      message: `Planned features not present in catalog (will not be created): ${missingFeatures.join(', ')}.`,
      blocking: false,
    });
  }

  const conflicts: PreflightReport['conflicts'] = [];
  let existingSourceRefs = 0;
  if (actor.ok) {
    try {
      const existing = (await input.prisma.$queryRawUnsafe(
        'SELECT id, slug, "internalCode" FROM "Development" WHERE "tenantId" = $1',
        actor.actor.tenantId,
      )) as Array<{ id: string; slug: string; internalCode: string | null }>;
      const refs = input.prisma.migrationSourceRef
        ? await input.prisma.migrationSourceRef.findMany({
            where: {
              tenantId: actor.actor.tenantId,
              sourceSystem: DEVELOPMENTS_SOURCE_SYSTEM,
              entityType: 'development',
            },
          })
        : [];
      existingSourceRefs = refs.length;
      const refSourceIds = new Set(refs.map((ref) => ref.sourceId));
      for (const plan of input.plans) {
        if (refSourceIds.has(plan.sourceId)) continue;
        const slugHit = existing.find((row) => row.slug === plan.slug);
        if (slugHit) {
          conflicts.push({
            sourceId: plan.sourceId,
            kind: 'slug',
            value: plan.slug,
          });
        }
        const codeHit = existing.find(
          (row) => row.internalCode === plan.internalCode,
        );
        if (codeHit) {
          conflicts.push({
            sourceId: plan.sourceId,
            kind: 'internalCode',
            value: plan.internalCode,
          });
        }
      }
    } catch (error) {
      blockers.push({
        code: 'CONFLICT_CHECK_FAILED',
        message:
          error instanceof Error
            ? `Could not inspect existing developments (${error.message}).`
            : 'Could not inspect existing developments.',
        blocking: true,
      });
    }
  }
  if (conflicts.length) {
    blockers.push({
      code: 'IDENTITY_CONFLICTS',
      message: `${conflicts.length} slug/internalCode conflict(s) without MigrationSourceRef.`,
      blocking: true,
    });
  }

  const blockedPlans = input.plans.filter(
    (plan) => plan.planStatus === 'blocked',
  ).length;
  if (blockedPlans > 0) {
    blockers.push({
      code: 'PLANS_BLOCKED',
      message: `${blockedPlans} planned development(s) are blocked.`,
      blocking: true,
    });
  }

  return {
    command: 'preflight',
    ok: blockers.length === 0,
    environment: env.environment,
    tenant: {
      id: actor.ok ? actor.actor.tenantId : null,
      slug: actor.ok
        ? actor.actor.tenantSlug
        : (input.tenantSlug ?? DEFAULT_TENANT_SLUG),
      status: actor.ok ? actor.actor.tenantStatus : null,
    },
    creator: {
      id: actor.ok ? actor.actor.userId : null,
      email: actor.ok ? actor.actor.email : null,
      isActive: actor.ok ? actor.actor.isActive : null,
      role: actor.ok ? actor.actor.role : null,
    },
    catalog: {
      province: provinceName,
      localityCount: requiredLocalities.length - missingLocalities.length,
      requiredLocalities,
      missingLocalities,
    },
    features: {
      planned: plannedFeatureSlugs,
      present: presentSlugs,
      missing: missingFeatures,
    },
    migrations,
    conflicts,
    existingSourceRefs,
    connectivity: {
      database: databaseOk,
      storage: storageOk,
    },
    planned: {
      developments: input.plans.length,
      images: input.plans.reduce((sum, plan) => sum + plan.gallery.length, 0),
      covers: input.plans.filter((plan) => plan.coverImage).length,
      blocked: blockedPlans,
    },
    blockers,
    warnings,
    writes: { database: false, storage: false },
  };
}

export function defaultMigrationsDir(startDir = process.cwd()): string {
  return path.resolve(startDir, 'prisma', 'migrations');
}
