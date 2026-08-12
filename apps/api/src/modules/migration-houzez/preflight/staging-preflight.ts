import type { BlockerRecord, OwnerResolution, WarningRecord } from '../types';
import type { TraceabilitySchemaStatus } from '../types';
import {
  resolveOwner,
  type OwnerPrisma,
} from '../services/owner-resolution.service';
import { detectTraceabilitySchema } from '../traceability/idempotency';
import {
  evaluatePropertyTreeBaseline,
  type ImportBaselineMode,
  type PropertyTreeBaselinePrisma,
  type PropertyTreeCounts,
} from './property-tree-baseline';

export const PILOT_REQUIRED_FEATURE_SLUG = 'uso-comercial' as const;

export type PreflightPrisma = OwnerPrisma &
  PropertyTreeBaselinePrisma & {
    propertyFeature: {
      findFirst: (
        args: unknown,
      ) => Promise<{ id: string; slug: string; isActive: boolean } | null>;
    };
    country: {
      findFirst: (
        args: unknown,
      ) => Promise<{ id: string; iso2: string } | null>;
    };
    province: { count: (args?: unknown) => Promise<number> };
    locality: { count: (args?: unknown) => Promise<number> };
    user: {
      count: (args?: unknown) => Promise<number>;
      findMany: OwnerPrisma['user']['findMany'];
    };
    development: { count: (args?: unknown) => Promise<number> };
    $queryRawUnsafe?: (q: string) => Promise<unknown>;
  };

export type StagingPreflightResult = {
  performed: boolean;
  tenant: {
    ok: boolean;
    slug?: string;
    status?: string;
    detail: string;
  };
  owner: OwnerResolution;
  propertyTreeCounts: PropertyTreeCounts;
  propertyTreeEmpty: boolean;
  /** initial-empty-tree | post-pilot-controlled | blocked */
  importBaselineMode: ImportBaselineMode;
  importBaselineDetail: string;
  pilotFeature: {
    slug: string;
    present: boolean;
    detail: string;
  };
  geo: {
    countryAr: boolean;
    provinceCount: number;
    localityCount: number;
    detail: string;
  };
  migrationSourceRef: {
    exists: boolean;
    detail: string;
  };
  /** Informative baseline — not a hard gate. */
  baseline: {
    userCount: number;
    developmentCount: number;
    note: string;
  };
  /** Blockers that prevent a successful dry-run/import plan. */
  pilotBlockers: BlockerRecord[];
  /** Non-blocking informational warnings for dry-run. */
  informativeWarnings: WarningRecord[];
  /**
   * Blockers that MUST fail a future import/write mode.
   * Surfaced now for visibility; dry-run does not treat them as hard failure.
   */
  importBlockers: BlockerRecord[];
};

export function evaluateTraceabilityForMode(input: {
  mode: 'dry-run' | 'import' | 'write';
  schema: TraceabilitySchemaStatus;
}): {
  warnings: WarningRecord[];
  blockers: BlockerRecord[];
  importBlockers: BlockerRecord[];
  idempotencySchemaAvailable: boolean;
  idempotencyDbCheckPerformed: boolean;
} {
  const available = input.schema.available;
  if (available) {
    return {
      warnings: [],
      blockers: [],
      importBlockers: [],
      idempotencySchemaAvailable: true,
      idempotencyDbCheckPerformed:
        input.mode === 'dry-run' ||
        input.mode === 'import' ||
        input.mode === 'write',
    };
  }

  const reason =
    'reason' in input.schema
      ? input.schema.reason
      : 'MigrationSourceRef unavailable';

  const warning: WarningRecord = {
    code: 'IDEMPOTENCY_SCHEMA_UNAVAILABLE',
    message: `Idempotency schema not available (${reason}). DB source-ref check omitted. This is allowed for dry-run (no writes) but is a hard blocker before any import/write.`,
  };

  const importBlocker: BlockerRecord = {
    code: 'IDEMPOTENCY_SCHEMA_REQUIRED_FOR_IMPORT',
    message:
      'MigrationSourceRef must exist before import/write. Apply prisma migration 202608070001_migration_source_ref on staging-houzez after approved backup.',
  };

  if (input.mode === 'dry-run') {
    return {
      warnings: [warning],
      blockers: [],
      importBlockers: [importBlocker],
      idempotencySchemaAvailable: false,
      idempotencyDbCheckPerformed: false,
    };
  }

  return {
    warnings: [],
    blockers: [importBlocker],
    importBlockers: [importBlocker],
    idempotencySchemaAvailable: false,
    idempotencyDbCheckPerformed: false,
  };
}

/**
 * Read-only staging preflight for the next dry-run.
 * Never performs DML/DDL. Structure is unit-tested with mocks; remote use is a later phase.
 */
export async function runStagingPreflight(input: {
  prisma: PreflightPrisma;
  tenantSlug: string;
  ownerEmail: string;
  requiredFeatureSlug?: string;
}): Promise<StagingPreflightResult> {
  const featureSlug = input.requiredFeatureSlug ?? PILOT_REQUIRED_FEATURE_SLUG;
  const pilotBlockers: BlockerRecord[] = [];
  const informativeWarnings: WarningRecord[] = [];
  const importBlockers: BlockerRecord[] = [];

  const owner = await resolveOwner({
    prisma: input.prisma,
    tenantSlug: input.tenantSlug,
    ownerEmail: input.ownerEmail,
  });

  const tenantStatusDetail = owner.ok
    ? `Tenant slug="${input.tenantSlug}" resolved ACTIVE and owner validated.`
    : owner.errors.join('; ');

  if (!owner.ok) {
    for (const err of owner.errors) {
      pilotBlockers.push({ code: 'OWNER_RESOLUTION', message: err });
    }
  }

  const treeBaseline = await evaluatePropertyTreeBaseline({
    prisma: input.prisma,
    tenantId: owner.tenantId ?? null,
  });
  const propertyTreeCounts = treeBaseline.propertyTreeCounts;
  const propertyTreeEmpty = treeBaseline.propertyTreeEmpty;
  for (const b of treeBaseline.blockers) {
    pilotBlockers.push(b);
  }
  for (const w of treeBaseline.warnings) {
    informativeWarnings.push(w);
  }

  const feature = await input.prisma.propertyFeature.findFirst({
    where: { slug: featureSlug, isActive: true },
  });
  if (!feature) {
    pilotBlockers.push({
      code: 'PILOT_FEATURE_MISSING',
      message: `Required pilot feature slug="${featureSlug}" not found (active) in PropertyFeature.`,
    });
  }

  const country = await input.prisma.country.findFirst({
    where: { iso2: 'AR' },
  });
  const provinceCount = await input.prisma.province.count();
  const localityCount = await input.prisma.locality.count();
  if (!country) {
    pilotBlockers.push({
      code: 'GEO_COUNTRY_MISSING',
      message: 'Country iso2=AR not found in geo catalog.',
    });
  }
  if (provinceCount < 1 || localityCount < 1) {
    pilotBlockers.push({
      code: 'GEO_CATALOG_INCOMPLETE',
      message: `Geo catalog insufficient (provinces=${provinceCount}, localities=${localityCount}).`,
    });
  }

  const schema = await detectTraceabilitySchema(input.prisma);
  const traceability = evaluateTraceabilityForMode({
    mode: 'dry-run',
    schema,
  });
  informativeWarnings.push(...traceability.warnings);
  importBlockers.push(...traceability.importBlockers);

  const userCount = await input.prisma.user.count();
  const developmentCount = await input.prisma.development.count();
  informativeWarnings.push({
    code: 'STAGING_BASELINE_INFO',
    message: `Informative staging baseline: User=${userCount}, Development=${developmentCount} (accepted provisionally; not a hard gate).`,
  });

  return {
    performed: true,
    tenant: {
      ok:
        Boolean(owner.tenantId) && !owner.errors.some((e) => /Tenant/i.test(e)),
      slug: owner.tenantSlug ?? input.tenantSlug,
      status: owner.ok ? 'ACTIVE' : undefined,
      detail: tenantStatusDetail,
    },
    owner,
    propertyTreeCounts,
    propertyTreeEmpty,
    importBaselineMode: treeBaseline.mode,
    importBaselineDetail: treeBaseline.detail,
    pilotFeature: {
      slug: featureSlug,
      present: Boolean(feature),
      detail: feature
        ? `Active PropertyFeature slug=${featureSlug} present.`
        : `Active PropertyFeature slug=${featureSlug} missing.`,
    },
    geo: {
      countryAr: Boolean(country),
      provinceCount,
      localityCount,
      detail: country
        ? `Geo OK (AR, provinces=${provinceCount}, localities=${localityCount}).`
        : 'Geo incomplete.',
    },
    migrationSourceRef: {
      exists: schema.available,
      detail: schema.available
        ? 'MigrationSourceRef table present.'
        : `MigrationSourceRef absent — dry-run warning; import blocker. ${'reason' in schema ? schema.reason : ''}`,
    },
    baseline: {
      userCount,
      developmentCount,
      note: 'Informational only; Users=5 / Development=1 accepted provisionally by owner.',
    },
    pilotBlockers,
    informativeWarnings,
    importBlockers,
  };
}

/** Empty preflight when DB access is skipped. */
export function skippedStagingPreflight(): StagingPreflightResult {
  return {
    performed: false,
    tenant: {
      ok: false,
      detail: 'Preflight skipped (--skip-db).',
    },
    owner: {
      ok: false,
      errors: ['Database lookup skipped (--skip-db).'],
    },
    propertyTreeCounts: {
      Property: 0,
      PropertyListing: 0,
      PropertyPrice: 0,
      PropertyImage: 0,
      PropertyFeatureAssignment: 0,
      PropertyAgentAccess: 0,
    },
    propertyTreeEmpty: false,
    importBaselineMode: 'blocked',
    importBaselineDetail:
      'Preflight skipped (--skip-db) — baseline unclassified.',
    pilotFeature: {
      slug: PILOT_REQUIRED_FEATURE_SLUG,
      present: false,
      detail: 'Skipped.',
    },
    geo: {
      countryAr: false,
      provinceCount: 0,
      localityCount: 0,
      detail: 'Skipped.',
    },
    migrationSourceRef: {
      exists: false,
      detail: 'Skipped (--skip-db).',
    },
    baseline: {
      userCount: 0,
      developmentCount: 0,
      note: 'Skipped (--skip-db).',
    },
    pilotBlockers: [
      {
        code: 'PREFLIGHT_SKIPPED',
        message: 'Staging preflight skipped because --skip-db was set.',
      },
    ],
    informativeWarnings: [],
    importBlockers: [
      {
        code: 'IDEMPOTENCY_SCHEMA_REQUIRED_FOR_IMPORT',
        message:
          'MigrationSourceRef must exist before import/write (not verified in --skip-db mode).',
      },
    ],
  };
}
