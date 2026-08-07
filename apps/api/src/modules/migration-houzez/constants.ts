export const HOUZEZ_SOURCE_SYSTEM = 'wordpress-houzez' as const;

export const HOUZEZ_SQL_FRAGMENTS = [
  'valorar-houzez-001.sql',
  'valorar-houzez-002.sql',
  'valorar-houzez-003.sql',
  'valorar-houzez-004.sql',
  'valorar-houzez-005.sql',
  'valorar-houzez-006.sql',
] as const;

/** Matches apps/api storage.constants MAX_PROPERTY_IMAGES — do not raise here without product approval. */
export const MIGRATION_MAX_PROPERTY_IMAGES = 30;

/** Known publish properties blocked until MAX_PROPERTY_IMAGES is raised. */
export const GALLERY_LIMIT_BLOCKED_WP_IDS = [12559, 11928] as const;

export const PILOT_WP_ID = 5312;

export const DEFAULT_OWNER_EMAIL = 'admin@demo.valorar.dev';
export const DEFAULT_TENANT_SLUG = 'demo';

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
