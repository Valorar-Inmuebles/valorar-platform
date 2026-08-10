/** Procedure id for manifests / reports (bump on contract changes). */
export const CLEANUP_PROCEDURE_VERSION = 'houzez-cleanup-demo-properties-v4';

export const ALLOWED_TENANT_SLUG = 'demo' as const;

export const STAGING_CLEANUP_TARGET = 'staging-houzez' as const;
export const PRODUCTION_CLEANUP_TARGET = 'production' as const;

export type HouzezCleanupTarget =
  | typeof STAGING_CLEANUP_TARGET
  | typeof PRODUCTION_CLEANUP_TARGET;

/** @deprecated Prefer STAGING_CLEANUP_TARGET / PRODUCTION_CLEANUP_TARGET. */
export const REQUIRED_CLEANUP_TARGET = STAGING_CLEANUP_TARGET;

export const EXECUTE_CONFIRM_TOKEN_STAGING =
  'DELETE-DEMO-PROPERTIES-STAGING' as const;
export const EXECUTE_CONFIRM_TOKEN_PRODUCTION =
  'DELETE-DEMO-PROPERTIES-PRODUCTION' as const;

/** @deprecated Prefer EXECUTE_CONFIRM_TOKEN_STAGING. */
export const EXECUTE_CONFIRM_TOKEN = EXECUTE_CONFIRM_TOKEN_STAGING;

export function isHouzezCleanupTarget(
  value: string | undefined | null,
): value is HouzezCleanupTarget {
  return (
    value === STAGING_CLEANUP_TARGET || value === PRODUCTION_CLEANUP_TARGET
  );
}

export function confirmTokenForCleanupTarget(
  target: HouzezCleanupTarget,
): string {
  return target === PRODUCTION_CLEANUP_TARGET
    ? EXECUTE_CONFIRM_TOKEN_PRODUCTION
    : EXECUTE_CONFIRM_TOKEN_STAGING;
}

export const ANOMALOUS_STORAGE_KEY = 'demo/key.jpg' as const;

/** Exact prefix for demo seed PropertyImage storage keys (closed match). */
export const SEED_STORAGE_KEY_PREFIX = 'tenants/demo/properties/' as const;

/** Exact prefix for demo seed relative URLs (closed match). */
export const SEED_URL_PATH_PREFIX = '/seed/properties/' as const;

/**
 * Tenant-scoped counts that must match before any execute path.
 * Aligned with E.5 production inventory (demo seeds + audit fixtures).
 */
export const EXPECTED_DEMO_COUNTS = {
  Property: 33,
  PropertyListing: 36,
  PropertyPrice: 38,
  PropertyImage: 129,
  PropertyFeatureAssignment: 104,
  PropertyAgentAccess: 0,
} as const;

export type ExpectedDemoCountKey = keyof typeof EXPECTED_DEMO_COUNTS;

/**
 * Approved storage policy counts for this cleanup wave (after HeadObject).
 * Must match exactly for storagePolicySatisfied / readyForExecute.
 * Does NOT include Houzez migration keys under …/migrations/wordpress-houzez/.
 *
 * Wave v4 (STALE_DB_REFERENCES confirmed): the 8 former upload objects are
 * absent from production R2 — classify as expected_upload_not_found (no DeleteObject).
 */
export const EXPECTED_STORAGE_POLICY = {
  r2ObjectsAuthorized: 0,
  expectedSeedNotFound: 120,
  expectedUploadNotFound: 8,
  anomalousBlocked: 1,
  unexpectedNotFound: 0,
  accessOrNetworkFailures: 0,
} as const;

/** Marker substring — never authorize DeleteObject for Houzez pilot keys. */
export const WORDPRESS_HOUZEZ_KEY_MARKER = 'wordpress-houzez/' as const;

/**
 * Closed pattern for stale admin-upload keys:
 * `{tenantId}/properties/{propertyId}/{uuid}.jpg`
 */
export const STALE_UPLOAD_KEY_UUID_JPG =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/i;

/**
 * Documented CASCADE coverage for DELETE FROM "Property" WHERE tenantId = …
 * Verified against prisma/schema.prisma (Property children onDelete: Cascade;
 * PropertyPrice via PropertyListing). Does not touch MigrationSourceRef rows
 * (table may be absent until E.7) and never deletes wordpress-houzez R2 keys.
 */
export const PROPERTY_TREE_CASCADE_COVERAGE = [
  'PropertyListing',
  'PropertyPrice (via PropertyListing)',
  'PropertyImage',
  'PropertyFeatureAssignment',
  'PropertyAgentAccess',
] as const;

export const CLEANUP_PRESERVES = [
  'Tenant',
  'User',
  'Country',
  'Province',
  'Locality',
  'Neighborhood',
  'PropertyFeature',
  'TenantSetting',
] as const;

export const CLEANUP_IMAGE_STATUSES = [
  'planned',
  'storage_verified',
  'db_deleted',
  'storage_deleted',
  'completed',
  'failed',
  'requires_retry',
  'pending_delete',
  'not_found',
  'blocked_anomalous',
] as const;

export type CleanupImageStatus = (typeof CLEANUP_IMAGE_STATUSES)[number];

export const CLEANUP_CLASSIFICATIONS = [
  'r2_object',
  'expected_seed_not_found',
  'expected_upload_not_found',
  'anomalous',
  'unexpected_not_found',
  'access_or_network_failure',
] as const;

export type CleanupClassification = (typeof CLEANUP_CLASSIFICATIONS)[number];
