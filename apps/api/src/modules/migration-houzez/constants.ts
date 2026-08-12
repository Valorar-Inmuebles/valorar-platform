export const HOUZEZ_SOURCE_SYSTEM = 'wordpress-houzez' as const;

/** Staging Neon branch / procedure target (distinct from cleanup target env var name). */
export const STAGING_MIGRATION_TARGET = 'staging-houzez' as const;

/**
 * Production Neon branch target (owner-confirmed: Neon project valorar-db, branch production).
 * Distinct from staging-houzez. Never silently reuse staging env vars.
 */
export const PRODUCTION_MIGRATION_TARGET = 'production' as const;

/**
 * Operational status of the approved WordPress `publish` wave for the current dump.
 * Informational / documentation guardrail — does **not** hard-block CLI import
 * (drafts/pending may be authorized later with a fresh audit + explicit request).
 */
export const PUBLISH_WAVE_OPERATIONAL_STATUS =
  'PUBLISH_MIGRATION_COMPLETED' as const;

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

/**
 * Operational image limit for Houzez migration dry-run/import only.
 * Product upload limit remains `storage.constants.MAX_PROPERTY_IMAGES` (30).
 * Raised to 60 to import oversized publish galleries (WP 12559=33, 11928=40).
 * Prefer reverting to 30 after the blocked-publish wave, or keep scoped here.
 */
export const MIGRATION_MAX_PROPERTY_IMAGES = 60;

/**
 * Historically gallery-blocked publish WP IDs (pre limit=60).
 * Kept for audit/reporting context; no longer hard-blocked solely by this list.
 */
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
 * All outputs are WebP after houzez-webp-v2 optimization (no JPEG/PNG finals).
 * Natural aspect retained; conservative edge-fill trim may remove letterbox padding.
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

/**
 * Production pilot image upgrade (houzez-webp-v2 letterbox trim).
 * Only WP 5312; only attachments that changed under edge-fill-v1.
 */
export const PILOT_IMAGE_UPGRADE_CONFIRM_WRITE_PRODUCTION =
  'UPGRADE_PILOT_IMAGES_WEBP_V2_PRODUCTION' as const;

/** Attachment IDs authorized for the controlled pilot image upgrade. */
export const PILOT_5312_UPGRADE_ATTACHMENT_IDS = [5315, 5314] as const;

/**
 * SHA-256 of the approved local preparation-manifest.json for
 * migration-data/prepared/wp-5312/2026-08-11T21-00-33-562Z/
 */
export const PILOT_5312_APPROVED_V2_MANIFEST_SHA256 =
  '3813083d41e9e1e1ad636a7984b66449e638f2f2b7e45d52b3318851380f91a1' as const;

/** Expected production property / MSR identities for the pilot upgrade gate. */
export const PILOT_5312_PRODUCTION_PROPERTY_ID =
  'c35d3eba98ddb956f5bfeb156' as const;
export const PILOT_5312_PRODUCTION_MSR_ID =
  'ca29ce3e88ded145ecb30e9e1' as const;
