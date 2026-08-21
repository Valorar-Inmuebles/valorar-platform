export const DEVELOPMENTS_SOURCE_SYSTEM = 'local-developments-v1' as const;

export const DEVELOPMENT_ENTITY_TYPE = 'development' as const;

export const DEVELOPMENT_IMAGE_ENTITY_TYPE = 'development_image' as const;

export const DEFAULT_SOURCE_RELATIVE_PATH = 'migration-data/emprendimientos';

export const FOLDER_NAME_PATTERN = /^(\d{3}) - (.+)$/;

export const IMAGE_FILE_PATTERN = /^(\d{3})\.(jpe?g|png|webp|gif)$/i;

export const TXT_EXTENSIONS = ['.txt'] as const;

export const INTERNAL_CODE_PREFIX = 'DEV-';

export const DEFAULT_TENANT_SLUG = 'demo';

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
