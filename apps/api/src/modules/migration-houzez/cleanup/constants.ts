/** Procedure id for manifests / reports (bump on contract changes). */
export const CLEANUP_PROCEDURE_VERSION = 'houzez-cleanup-demo-properties-v2';

export const ALLOWED_TENANT_SLUG = 'demo' as const;

export const REQUIRED_CLEANUP_TARGET = 'staging-houzez' as const;

export const EXECUTE_CONFIRM_TOKEN = 'DELETE-DEMO-PROPERTIES-STAGING' as const;

export const ANOMALOUS_STORAGE_KEY = 'demo/key.jpg' as const;

/** Exact prefix for demo seed PropertyImage storage keys (closed match). */
export const SEED_STORAGE_KEY_PREFIX = 'tenants/demo/properties/' as const;

/** Exact prefix for demo seed relative URLs (closed match). */
export const SEED_URL_PATH_PREFIX = '/seed/properties/' as const;

/** Tenant-scoped counts that must match before any execute path. */
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
 */
export const EXPECTED_STORAGE_POLICY = {
  r2ObjectsAuthorized: 8,
  expectedSeedNotFound: 120,
  anomalousBlocked: 1,
  unexpectedNotFound: 0,
  accessOrNetworkFailures: 0,
} as const;

/**
 * Documented CASCADE coverage for DELETE FROM "Property" WHERE tenantId = …
 * Verified against prisma/schema.prisma (Property children onDelete: Cascade;
 * PropertyPrice via PropertyListing).
 */
export const PROPERTY_TREE_CASCADE_COVERAGE = [
  'PropertyListing',
  'PropertyPrice (via PropertyListing)',
  'PropertyImage',
  'PropertyFeatureAssignment',
  'PropertyAgentAccess',
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
  'anomalous',
  'unexpected_not_found',
  'access_or_network_failure',
] as const;

export type CleanupClassification = (typeof CLEANUP_CLASSIFICATIONS)[number];
