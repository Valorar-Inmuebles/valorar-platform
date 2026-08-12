import {
  ALLOWED_TENANT_SLUG,
  EXECUTE_CONFIRM_TOKEN,
  type CleanupClassification,
  type CleanupImageStatus,
} from './constants';

export type CleanupMode = 'dry-run' | 'execute';

export type ParsedCleanupArgs = {
  mode: CleanupMode | null;
  tenantSlug: string | null;
  confirmToken: string | null;
  confirmTarget: string | null;
  manifestPath: string | null;
  approvedHash: string | null;
  allowAnomalousKey: boolean;
  help: boolean;
  unknownFlags: string[];
};

export type TenantCounts = {
  Property: number;
  PropertyListing: number;
  PropertyPrice: number;
  PropertyImage: number;
  PropertyFeatureAssignment: number;
  PropertyAgentAccess: number;
};

export type PropertyImageManifestRow = {
  id: string;
  propertyId: string;
  storageKey: string;
  url: string | null;
  mimeType: string | null;
  fileSize: number | null;
  isCover: boolean;
  sortOrder: number;
  r2: {
    exists: boolean | null;
    etag: string | null;
    error: string | null;
  };
  classification: CleanupClassification;
  status: CleanupImageStatus;
  isAnomalousKey: boolean;
  deleteAuthorized: boolean;
  authorizationReason: string;
};

export type CleanupSemantics = {
  /**
   * Dry-run finished its planned read path (DB counts + HeadObject loop).
   * Does not imply readyForExecute.
   */
  dryRunCompleted: boolean;
  databaseCountsMatch: boolean;
  /** True only when every image got a HeadObject result without fatal auth/config/network errors. */
  storageChecksCompleted: boolean;
  /** True when classification counts match the approved policy exactly. */
  storagePolicySatisfied: boolean;
  /**
   * Technical readiness of the manifest for a future execute.
   * Does NOT replace --execute, confirm token, host/target gates, hash check,
   * or manual owner authorization.
   */
  readyForExecute: boolean;
  remoteWrites: {
    database: false;
    storage: false;
  };
};

export type CleanupManifest = {
  procedureVersion: string;
  mode: CleanupMode;
  generatedAtUtc: string;
  tenantSlug: string;
  tenantId: string;
  dbHostMasked: string;
  preCountsByTenant: TenantCounts;
  imageRecordCount: number;
  storageKeyCount: number;
  uniqueStorageKeyCount: number;
  headObjectChecksPerformed: number;
  classificationSummary: Record<string, number>;
  statusSummary: Record<string, number>;
  existingCount: number;
  expectedSeedNotFoundCount: number;
  expectedUploadNotFoundCount: number;
  unexpectedNotFoundCount: number;
  anomalousCount: number;
  accessOrNetworkFailureCount: number;
  authorizedDeleteCount: number;
  excludedFromDeleteCount: number;
  semantics: CleanupSemantics;
  /**
   * Legacy aggregate: true iff dryRunCompleted && databaseCountsMatch &&
   * storageChecksCompleted && storagePolicySatisfied.
   * Never use alone to authorize execute — require readyForExecute + manual approval.
   */
  ok: boolean;
  stableHash: string;
  errorSummary: string[];
  cascadeCoverage: readonly string[];
  images: PropertyImageManifestRow[];
};

export type SafetyGateResult =
  | { ok: true; connectionUrl: string; dbHost: string; dbHostMasked: string }
  | { ok: false; errors: string[] };

export const REQUIRED_CONFIRM_TOKEN = EXECUTE_CONFIRM_TOKEN;
export const REQUIRED_TENANT = ALLOWED_TENANT_SLUG;
