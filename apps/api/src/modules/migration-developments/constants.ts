export const DEVELOPMENTS_SOURCE_SYSTEM = 'local-developments-v1' as const;

export const DEVELOPMENT_ENTITY_TYPE = 'development' as const;

export const DEVELOPMENT_IMAGE_ENTITY_TYPE = 'development_image' as const;

export const DEFAULT_SOURCE_RELATIVE_PATH = 'migration-data/emprendimientos';

export const FOLDER_NAME_PATTERN = /^(\d{3}) - (.+)$/;

export const IMAGE_FILE_PATTERN = /^(\d{3})\.(jpe?g|png|webp|gif)$/i;

export const TXT_EXTENSIONS = ['.txt'] as const;

export const INTERNAL_CODE_PREFIX = 'DEV-';

export const DEFAULT_TENANT_SLUG = 'demo';

export const DEFAULT_CREATOR_EMAIL = 'admin@demo.valorar.dev';

export const DEVELOPMENT_MIGRATION_TARGET = 'development' as const;

export const PRODUCTION_MIGRATION_TARGET = 'production' as const;

export const ALLOWED_MIGRATION_TARGET = DEVELOPMENT_MIGRATION_TARGET;

export const ALLOWED_MIGRATION_TARGETS = [
  DEVELOPMENT_MIGRATION_TARGET,
  PRODUCTION_MIGRATION_TARGET,
] as const;

export const IMPORT_CONFIRM_TOKEN = 'IMPORT_LOCAL_DEVELOPMENTS' as const;

export const IMPORT_PRODUCTION_CONFIRM_TOKEN =
  'IMPORT_LOCAL_DEVELOPMENTS_PRODUCTION' as const;

export const CLEANUP_CONFIRM_TOKEN = 'DELETE_LOCAL_DEVELOPMENTS' as const;

export const CLEANUP_PRODUCTION_CONFIRM_TOKEN =
  'DELETE_LOCAL_DEVELOPMENTS_PRODUCTION' as const;

export const FORBIDDEN_MIGRATION_TARGETS = [
  'prod',
  'staging',
  'preview',
] as const;

export const AUTHORIZED_PRODUCTION_STORAGE_BUCKET =
  'valorarinmuebles-images-prod' as const;

export const AUTHORIZED_PRODUCTION_TENANT_SLUG = DEFAULT_TENANT_SLUG;

export const AUTHORIZED_PRODUCTION_CREATOR_EMAIL = DEFAULT_CREATOR_EMAIL;

/**
 * Audited production Neon fingerprint (Houzez E.5).
 * --target=development treats it as a deny-list.
 * --target=production requires this exact identity plus the production confirm token.
 */
export const AUDITED_PRODUCTION_NEON_IDENTITY = {
  projectId: 'square-lab-71259415',
  branchId: 'br-rapid-bread-acsu0836',
  endpointId: 'ep-mute-sun-ac6nva0v',
} as const;

export const DENIED_PRODUCTION_NEON_IDENTITY = AUDITED_PRODUCTION_NEON_IDENTITY;

export const TRACEABILITY_MIGRATION = '202608070001_migration_source_ref';

export const SORT_ORDER_MIGRATION = '202608210001_development_sort_order';

export const CABA_LOCALITIES_MIGRATION =
  '202608210002_add_villa_luro_floresta_localities';

export const CREATOR_ROLES = [
  'TENANT_ADMIN',
  'SUPER_ADMIN',
  'MANAGER',
] as const;

export const REQUIRED_LOCALITY_NAMES = [
  'Almagro',
  'Caballito',
  'Flores',
  'Villa Luro',
  'Floresta',
  'Villa Urquiza',
] as const;

export const DEFAULT_COUNTRY = 'AR';

export const DEFAULT_PROVINCE_NAME = 'Capital Federal';

export const CANONICAL_CABA_PROVINCE_SLUG = 'capital-federal';

export const CANONICAL_CABA_PROVINCE_ISO_CODE = 'AR-C';

export const OFFICIAL_GEO_CREATE_MECHANISM =
  'Geo catalog is global and read-only at runtime (seeds + occasional Prisma data migrations). There is no admin locality CRUD and the developments importer must not insert Province/Locality. To add a missing CABA barrio, include it in prisma/seed-data/localidades.sql (as `CABA - {Barrio}` under province key C) or add an idempotent data migration under Province.slug = capital-federal, then re-seed or apply that migration in the target environment.';

export const STORAGE_KEY_PREFIX = 'migrations/local-developments-v1';

export const SHORT_DESCRIPTION_MAX_CHARS = 200;

export const CLI_EXIT = {
  ok: 0,
  blocked: 1,
  warnings: 2,
} as const;

export const SUPPORTED_IMAGE_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
] as const;

export type SupportedImageExtension =
  (typeof SUPPORTED_IMAGE_EXTENSIONS)[number];
