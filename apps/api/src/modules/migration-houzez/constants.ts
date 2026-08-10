export const HOUZEZ_SOURCE_SYSTEM = 'wordpress-houzez' as const;

/** Staging Neon branch / procedure target (distinct from cleanup target env var name). */
export const STAGING_MIGRATION_TARGET = 'staging-houzez' as const;

/**
 * Production Neon branch target (owner-confirmed: Neon project valorar-db, branch production).
 * Distinct from staging-houzez. Never silently reuse staging env vars.
 */
export const PRODUCTION_MIGRATION_TARGET = 'production' as const;

export type HouzezMigrationTarget =
  | typeof STAGING_MIGRATION_TARGET
  | typeof PRODUCTION_MIGRATION_TARGET;

export const ALLOWED_MIGRATION_TARGETS: readonly HouzezMigrationTarget[] = [
  STAGING_MIGRATION_TARGET,
  PRODUCTION_MIGRATION_TARGET,
] as const;

/**
 * @deprecated Prefer {@link STAGING_MIGRATION_TARGET}. Kept as staging default for
 * older call sites; production must use PRODUCTION_MIGRATION_TARGET explicitly.
 */
export const REQUIRED_MIGRATION_TARGET = STAGING_MIGRATION_TARGET;

/**
 * Audited Neon GUCs from E.5 against the habitual DATABASE_URL / production branch.
 * Production gates must match these exactly (also via env confirmation).
 */
export const PRODUCTION_NEON_IDENTITY = {
  projectId: 'square-lab-71259415',
  branchId: 'br-rapid-bread-acsu0836',
  endpointId: 'ep-mute-sun-ac6nva0v',
} as const;

export const HOUZEZ_SQL_FRAGMENTS = [
  'valorar-houzez-001.sql',
  'valorar-houzez-002.sql',
  'valorar-houzez-003.sql',
  'valorar-houzez-004.sql',
  'valorar-houzez-005.sql',
  'valorar-houzez-006.sql',
] as const;

/** Versioned dataset manifest id (SQL fragments only; dumps not stored in git). */
export const HOUZEZ_DATASET_MANIFEST_ID = 'houzez-sql-dump-v1' as const;

/** Matches apps/api storage.constants MAX_PROPERTY_IMAGES — do not raise here without product approval. */
export const MIGRATION_MAX_PROPERTY_IMAGES = 30;

/** Known publish properties blocked until MAX_PROPERTY_IMAGES is raised. */
export const GALLERY_LIMIT_BLOCKED_WP_IDS = [12559, 11928] as const;

export const PILOT_WP_ID = 5312;

export const DEFAULT_OWNER_EMAIL = 'admin@demo.valorar.dev';
export const DEFAULT_TENANT_SLUG = 'demo';

/** Staging import `--confirm-write` (must not be reused for production). */
export const IMPORT_CONFIRM_WRITE_STAGING =
  'IMPORT_ONE_HOUZEZ_PROPERTY' as const;

/** Production import `--confirm-write` (distinct from staging). */
export const IMPORT_CONFIRM_WRITE_PRODUCTION =
  'IMPORT_ONE_HOUZEZ_PROPERTY_PRODUCTION' as const;

/** @deprecated Prefer {@link IMPORT_CONFIRM_WRITE_STAGING}. */
export const IMPORT_CONFIRM_WRITE = IMPORT_CONFIRM_WRITE_STAGING;

/** @deprecated Prefer explicit staging/production confirm-target. */
export const IMPORT_CONFIRM_TARGET = STAGING_MIGRATION_TARGET;

export function isHouzezMigrationTarget(
  value: string | undefined | null,
): value is HouzezMigrationTarget {
  return (
    value === STAGING_MIGRATION_TARGET || value === PRODUCTION_MIGRATION_TARGET
  );
}

export function confirmWriteForTarget(target: HouzezMigrationTarget): string {
  return target === PRODUCTION_MIGRATION_TARGET
    ? IMPORT_CONFIRM_WRITE_PRODUCTION
    : IMPORT_CONFIRM_WRITE_STAGING;
}

export function confirmTargetForTarget(target: HouzezMigrationTarget): string {
  return target;
}

/** MigrationSourceRef.entityType for the Property root identity. */
export const MIGRATION_ENTITY_TYPE_PROPERTY = 'property' as const;

export type MigrationEntityType =
  | 'property'
  | 'property_listing'
  | 'property_price'
  | 'property_image'
  | 'property_feature_assignment'
  | 'batch_manifest';

export const MIGRATION_ENTITY_TYPES: MigrationEntityType[] = [
  'property',
  'property_listing',
  'property_price',
  'property_image',
  'property_feature_assignment',
  'batch_manifest',
];

/**
 * Expected pilot object keys under the deterministic migration prefix (relative).
 * All outputs are WebP after houzez-webp-v1 optimization (no JPEG/PNG finals).
 */
export const PILOT_5312_EXPECTED_RELATIVE_KEYS = [
  '00-wp5315.webp',
  '01-wp6927.webp',
  '02-wp8967.webp',
  '03-wp8966.webp',
  '04-wp5314.webp',
  '05-wp6928.webp',
  '06-wp8965.webp',
] as const;
