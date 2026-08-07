export const HOUZEZ_SOURCE_SYSTEM = 'wordpress-houzez' as const;

/** Neon branch / procedure target for migration CLI (distinct from HOUZEZ_CLEANUP_TARGET). */
export const REQUIRED_MIGRATION_TARGET = 'staging-houzez' as const;

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

/** Required exact value for CLI `--confirm-write` on import. */
export const IMPORT_CONFIRM_WRITE = 'IMPORT_ONE_HOUZEZ_PROPERTY' as const;

/** Required exact value for CLI `--confirm-target` on import (same as migration target). */
export const IMPORT_CONFIRM_TARGET = REQUIRED_MIGRATION_TARGET;

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
