import {
  ALLOWED_TENANT_SLUG,
  ANOMALOUS_STORAGE_KEY,
  EXPECTED_STORAGE_POLICY,
  SEED_STORAGE_KEY_PREFIX,
  SEED_URL_PATH_PREFIX,
  type CleanupClassification,
  type CleanupImageStatus,
} from './constants';
import type { HeadObjectResult } from './r2-verify';
import type {
  CleanupSemantics,
  PropertyImageManifestRow,
  TenantCounts,
} from './types';

export type ClassifyImageInput = {
  id: string;
  propertyId: string;
  storageKey: string;
  url: string | null;
  mimeType: string | null;
  fileSize: number | null;
  isCover: boolean;
  sortOrder: number;
};

/**
 * Conservative closed-match seed detector.
 * Requires ALL of:
 * - tenant slug exactly "demo"
 * - storageKey starts with exact prefix tenants/demo/properties/
 * - url is a relative path starting with exact /seed/properties/
 * - not anomalous key
 * Does NOT classify solely because HeadObject returned not_found.
 */
export function isExpectedSeedReference(input: {
  tenantSlug: string;
  storageKey: string;
  url: string | null;
  isAnomalousKey: boolean;
}): boolean {
  if (input.isAnomalousKey) return false;
  if (input.tenantSlug !== ALLOWED_TENANT_SLUG) return false;
  if (!input.storageKey.startsWith(SEED_STORAGE_KEY_PREFIX)) return false;
  // Reject weaker / accidental matches (must be under properties/, not just tenants/demo/)
  if (input.storageKey === SEED_STORAGE_KEY_PREFIX) return false;
  const url = input.url?.trim() ?? '';
  if (!url.startsWith(SEED_URL_PATH_PREFIX)) return false;
  // Relative URL only — reject absolute URLs even if path happens to match.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) return false;
  return true;
}

export function classifyPropertyImage(input: {
  image: ClassifyImageInput;
  tenantSlug: string;
  head: HeadObjectResult;
}): PropertyImageManifestRow {
  const { image, tenantSlug, head } = input;
  const isAnomalousKey = image.storageKey === ANOMALOUS_STORAGE_KEY;

  const base = {
    id: image.id,
    propertyId: image.propertyId,
    storageKey: image.storageKey,
    url: image.url,
    mimeType: image.mimeType,
    fileSize: image.fileSize,
    isCover: image.isCover,
    sortOrder: image.sortOrder,
  };

  if (isAnomalousKey) {
    const r2 = headToR2(head);
    return {
      ...base,
      r2,
      classification: 'anomalous',
      status: 'blocked_anomalous',
      isAnomalousKey: true,
      deleteAuthorized: false,
      authorizationReason:
        'Blocked anomalous placeholder key; DeleteObject never authorized. CASCADE may still remove the PropertyImage row with the Property tree.',
    };
  }

  if (!head.ok) {
    return {
      ...base,
      r2: { exists: null, etag: null, error: head.error },
      classification: 'access_or_network_failure',
      status: 'failed',
      isAnomalousKey: false,
      deleteAuthorized: false,
      authorizationReason: `HeadObject access/network/config failure: ${head.error}`,
    };
  }

  if (head.exists) {
    return {
      ...base,
      r2: { exists: true, etag: head.etag, error: null },
      classification: 'r2_object',
      status: 'storage_verified',
      isAnomalousKey: false,
      deleteAuthorized: true,
      authorizationReason:
        'HeadObject confirmed object exists; authorized for future DeleteObject under allowlist policy.',
    };
  }

  // not_found — only accept as expected seed when closed attributes match.
  const seed = isExpectedSeedReference({
    tenantSlug,
    storageKey: image.storageKey,
    url: image.url,
    isAnomalousKey: false,
  });

  if (seed) {
    return {
      ...base,
      r2: { exists: false, etag: null, error: 'not_found' },
      classification: 'expected_seed_not_found',
      // status remains not_found; classification marks absence as expected (no DeleteObject).
      status: 'not_found',
      isAnomalousKey: false,
      deleteAuthorized: false,
      authorizationReason:
        'Expected demo seed metadata (tenants/demo/properties/ + /seed/properties/); object never uploaded to R2. No DeleteObject required; CASCADE removes the DB row.',
    };
  }

  return {
    ...base,
    r2: { exists: false, etag: null, error: 'not_found' },
    classification: 'unexpected_not_found',
    status: 'not_found',
    isAnomalousKey: false,
    deleteAuthorized: false,
    authorizationReason:
      'not_found without closed seed attributes; blocked from DeleteObject allowlist and fails storage policy.',
  };
}

function headToR2(head: HeadObjectResult): PropertyImageManifestRow['r2'] {
  if (!head.ok) {
    return { exists: null, etag: null, error: head.error };
  }
  if (!head.exists) {
    return { exists: false, etag: null, error: 'not_found' };
  }
  return { exists: true, etag: head.etag, error: null };
}

/**
 * Future execute allowlist: ONLY verified existing R2 objects that are authorized.
 * not_found / blocked_anomalous / failed / requires_retry never enter automatically.
 */
export function buildR2DeleteAllowlist(
  images: PropertyImageManifestRow[],
): string[] {
  const keys: string[] = [];
  for (const img of images) {
    if (img.isAnomalousKey) continue;
    if (img.storageKey === ANOMALOUS_STORAGE_KEY) continue;
    if (!img.deleteAuthorized) continue;
    if (img.status !== 'storage_verified') continue;
    if (img.classification !== 'r2_object') continue;
    if (img.r2.exists !== true) continue;
    keys.push(img.storageKey);
  }
  return keys;
}

export function summarizeClassifications(
  images: Pick<PropertyImageManifestRow, 'classification'>[],
): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const row of images) {
    summary[row.classification] = (summary[row.classification] ?? 0) + 1;
  }
  return summary;
}

export function evaluateCleanupSemantics(input: {
  countDiffs: string[];
  images: PropertyImageManifestRow[];
  headObjectChecksPerformed: number;
  fatalHeadErrors: string[];
}): CleanupSemantics & {
  ok: boolean;
  authorizedKeys: string[];
  classificationSummary: Record<string, number>;
} {
  const databaseCountsMatch = input.countDiffs.length === 0;
  const classificationSummary = summarizeClassifications(input.images);

  const accessFailures = classificationSummary.access_or_network_failure ?? 0;
  const storageChecksCompleted =
    input.headObjectChecksPerformed === input.images.length &&
    input.fatalHeadErrors.length === 0 &&
    accessFailures === 0;

  const r2Authorized = buildR2DeleteAllowlist(input.images);
  const expectedSeed = classificationSummary.expected_seed_not_found ?? 0;
  const anomalous = classificationSummary.anomalous ?? 0;
  const unexpected = classificationSummary.unexpected_not_found ?? 0;

  const storagePolicySatisfied =
    storageChecksCompleted &&
    r2Authorized.length === EXPECTED_STORAGE_POLICY.r2ObjectsAuthorized &&
    expectedSeed === EXPECTED_STORAGE_POLICY.expectedSeedNotFound &&
    anomalous === EXPECTED_STORAGE_POLICY.anomalousBlocked &&
    unexpected === EXPECTED_STORAGE_POLICY.unexpectedNotFound &&
    accessFailures === EXPECTED_STORAGE_POLICY.accessOrNetworkFailures;

  const dryRunCompleted = true;
  const readyForExecute =
    databaseCountsMatch && storageChecksCompleted && storagePolicySatisfied;

  const semantics: CleanupSemantics = {
    dryRunCompleted,
    databaseCountsMatch,
    storageChecksCompleted,
    storagePolicySatisfied,
    readyForExecute,
    remoteWrites: { database: false, storage: false },
  };

  return {
    ...semantics,
    ok:
      dryRunCompleted &&
      databaseCountsMatch &&
      storageChecksCompleted &&
      storagePolicySatisfied,
    authorizedKeys: r2Authorized,
    classificationSummary,
  };
}

export function expectedStatusForClassification(
  classification: CleanupClassification,
): CleanupImageStatus {
  switch (classification) {
    case 'r2_object':
      return 'storage_verified';
    case 'expected_seed_not_found':
      return 'not_found';
    case 'anomalous':
      return 'blocked_anomalous';
    case 'unexpected_not_found':
      return 'not_found';
    case 'access_or_network_failure':
      return 'failed';
  }
}

export type { TenantCounts };
