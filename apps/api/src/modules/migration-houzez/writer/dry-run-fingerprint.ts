import * as crypto from 'node:crypto';
import type {
  CatalogResolution,
  DryRunReport,
  ImagePlanEntry,
  OwnerResolution,
  PlannedEntity,
} from '../types';
import type { PublishTransformResult } from '../transform/publish-rules';

/**
 * Canonical subset of a dry-run report used for tamper detection.
 * Excludes ephemeral fields (safety host masks, absolute paths).
 * Includes batch_manifest content but import live-compare reuses the approved report batchId.
 */
export type DryRunFingerprintPayload = {
  v: 1;
  mode: 'dry-run';
  wpId: number;
  sourceSystem: string;
  tenantSlug: string;
  ownerEmail: string;
  wouldWrite: false;
  pilotBlockers: Array<{ code: string; message: string }>;
  blockers: Array<{ code: string; message: string }>;
  datasetManifest: {
    manifestId: string;
    ok: boolean;
    datasetId?: string;
    version?: number;
    fragmentDigests?: Array<{
      fileName: string;
      sha256: string;
      bytes: number;
    }>;
  };
  transformed: DryRunReport['transformed'];
  plannedEntities: Array<{
    entityType: string;
    provisionalKey: string;
    sourceId: string;
    payload: Record<string, unknown>;
  }>;
  imageSummary: DryRunReport['imageSummary'];
  images: Array<{
    sortOrder: number;
    attachmentId: number;
    isCover: boolean;
    sha256: string | null;
    proposedFilename: string;
  }>;
  catalogs: Array<{
    key: string;
    status: string;
    detail: string;
    value?: unknown;
  }>;
  owner: {
    ok: boolean;
    tenantId?: string;
    tenantSlug?: string;
    userId?: string;
    email?: string;
  };
};

export function buildDryRunFingerprintPayload(
  report: DryRunReport,
): DryRunFingerprintPayload {
  return {
    v: 1,
    mode: 'dry-run',
    wpId: report.wpId,
    sourceSystem: report.sourceSystem,
    tenantSlug: report.tenantSlug,
    ownerEmail: report.ownerEmail,
    wouldWrite: false,
    pilotBlockers: (report.preflight.pilotBlockers ?? []).map((b) => ({
      code: b.code,
      message: b.message,
    })),
    blockers: (report.blockers ?? []).map((b) => ({
      code: b.code,
      message: b.message,
    })),
    datasetManifest: {
      manifestId: report.datasetManifest.manifestId,
      ok: report.datasetManifest.ok,
      datasetId: report.datasetManifest.datasetId,
      version: report.datasetManifest.version,
      fragmentDigests: report.datasetManifest.fragmentDigests,
    },
    transformed: report.transformed,
    plannedEntities: report.plannedEntities.map((e) => ({
      entityType: e.entityType,
      provisionalKey: e.provisionalKey,
      sourceId: e.sourceId,
      payload: e.payload,
    })),
    imageSummary: report.imageSummary,
    images: report.images.map((img) => ({
      sortOrder: img.sortOrder,
      attachmentId: img.attachmentId,
      isCover: img.isCover,
      sha256: img.sha256,
      proposedFilename: img.proposedFilename,
    })),
    catalogs: report.catalogs.map((c) => ({
      key: c.key,
      status: c.status,
      detail: c.detail,
      value: c.value,
    })),
    owner: {
      ok: report.owner.ok,
      tenantId: report.owner.tenantId,
      tenantSlug: report.owner.tenantSlug,
      userId: report.owner.userId,
      email: report.owner.email,
    },
  };
}

/** Stable JSON stringify: sorted object keys, no whitespace variance. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sortKeys);
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    out[key] = sortKeys(obj[key]);
  }
  return out;
}

export function hashFingerprintPayload(
  payload: DryRunFingerprintPayload,
): string {
  return crypto
    .createHash('sha256')
    .update(stableStringify(payload), 'utf8')
    .digest('hex');
}

export function computeDryRunFingerprint(report: DryRunReport): string {
  return hashFingerprintPayload(buildDryRunFingerprintPayload(report));
}

export type LivePlanForFingerprint = {
  wpId: number;
  sourceSystem: string;
  tenantSlug: string;
  ownerEmail: string;
  /** Reuse approved report batchId so ephemeral id does not break binding. */
  batchId: string;
  owner: OwnerResolution;
  transform: PublishTransformResult;
  catalogs: CatalogResolution[];
  images: ImagePlanEntry[];
  imageSummary: DryRunReport['imageSummary'];
  oldUrl: DryRunReport['oldUrl'];
  datasetManifest: DryRunReport['datasetManifest'];
  /** Live blockers discovered during import rebuild (must be empty). */
  blockers: Array<{ code: string; message: string }>;
  pilotBlockers: Array<{ code: string; message: string }>;
};

/**
 * Build the same plannedEntities shape dry-run uses (including batch_manifest planning artifact).
 */
export function buildPlannedEntitiesForPlan(input: {
  wpId: number;
  batchId: string;
  owner: OwnerResolution;
  transform: PublishTransformResult;
  catalogs: CatalogResolution[];
  images: ImagePlanEntry[];
  oldUrl: DryRunReport['oldUrl'];
  blockersEmpty: boolean;
}): PlannedEntity[] {
  if (!input.blockersEmpty) return [];
  const planned: PlannedEntity[] = [];
  const { wpId, batchId, owner, transform, catalogs, images, oldUrl } = input;

  planned.push({
    entityType: 'property',
    provisionalKey: `property:${wpId}`,
    sourceId: String(wpId),
    payload: {
      ...transform.property,
      createdById: owner.userId,
      assignedToId: owner.userId,
      tenantId: owner.tenantId,
    },
  });
  planned.push({
    entityType: 'property_listing',
    provisionalKey: `listing:${wpId}:SALE`,
    sourceId: String(wpId),
    payload: transform.listing,
  });
  if (transform.price) {
    planned.push({
      entityType: 'property_price',
      provisionalKey: `price:${wpId}:primary`,
      sourceId: String(wpId),
      payload: transform.price,
    });
  }
  for (const image of images) {
    planned.push({
      entityType: 'property_image',
      provisionalKey: `image:${wpId}:${image.attachmentId}`,
      sourceId: String(image.attachmentId),
      payload: {
        sortOrder: image.sortOrder,
        isCover: image.isCover,
        proposedFilename: image.proposedFilename,
        sha256: image.sha256,
      },
    });
  }
  for (const cat of catalogs) {
    if (cat.key.startsWith('feature:') && cat.status === 'resolved') {
      planned.push({
        entityType: 'property_feature_assignment',
        provisionalKey: `feature:${wpId}:${cat.key}`,
        sourceId: String(wpId),
        payload: cat.value as Record<string, unknown>,
      });
    }
  }
  planned.push({
    entityType: 'batch_manifest',
    provisionalKey: `batch:${batchId}`,
    sourceId: batchId,
    payload: {
      wpId,
      oldUrl,
      inferences: transform.inferences,
    },
  });
  return planned;
}

/**
 * Independent fingerprint from live SQL/transform/images — not from the report blob.
 * Must equal the approved reportFingerprint.
 */
export function computeLivePlanFingerprint(
  live: LivePlanForFingerprint,
): string {
  const plannedEntities = buildPlannedEntitiesForPlan({
    wpId: live.wpId,
    batchId: live.batchId,
    owner: live.owner,
    transform: live.transform,
    catalogs: live.catalogs,
    images: live.images,
    oldUrl: live.oldUrl,
    blockersEmpty:
      live.blockers.length === 0 && live.pilotBlockers.length === 0,
  });

  const synthetic: DryRunReport = {
    mode: 'dry-run',
    batchId: live.batchId,
    wpId: live.wpId,
    sourceSystem: live.sourceSystem,
    tenantSlug: live.tenantSlug,
    ownerEmail: live.ownerEmail,
    reportFingerprint: '',
    safety: {
      migrationTarget: null,
      dbHostMasked: null,
      gatesSatisfied: true,
      dbAccessEnabled: true,
      skipDb: false,
    },
    datasetManifest: live.datasetManifest,
    preflight: {
      performed: true,
      propertyTreeEmpty: true,
      propertyTreeCounts: {
        Property: 0,
        PropertyListing: 0,
        PropertyPrice: 0,
        PropertyImage: 0,
        PropertyFeatureAssignment: 0,
        PropertyAgentAccess: 0,
      },
      pilotFeaturePresent: true,
      geoOk: true,
      migrationSourceRefExists: true,
      baseline: { userCount: 0, developmentCount: 0 },
      pilotBlockers: live.pilotBlockers,
      informativeWarnings: [],
      importBlockers: [],
    },
    owner: live.owner,
    source: null,
    transformed: {
      property: live.transform.property,
      listing: live.transform.listing,
      price: live.transform.price,
      featureNames: live.transform.featureNames,
    },
    inferences: live.transform.inferences,
    catalogs: live.catalogs,
    images: live.images.map((img) => ({
      ...img,
      absolutePath: null,
    })),
    imageSummary: live.imageSummary,
    oldUrl: live.oldUrl,
    plannedEntities,
    idempotency: {
      schema: { available: true },
      existingPropertyRef: null,
      note: 'live',
      idempotencySchemaAvailable: true,
      idempotencyDbCheckPerformed: true,
    },
    warnings: [],
    blockers: live.blockers,
    wouldWrite: false,
  };

  return computeDryRunFingerprint(synthetic);
}

export function assertLiveFingerprintMatchesApprovedReport(input: {
  approvedFingerprint: string;
  live: LivePlanForFingerprint;
}): { ok: true } | { ok: false; errors: string[] } {
  const liveFingerprint = computeLivePlanFingerprint(input.live);
  if (liveFingerprint !== input.approvedFingerprint) {
    return {
      ok: false,
      errors: [
        'Live plan fingerprint (recomputed from current SQL/images/catalogs) does not match approved dry-run reportFingerprint. Refusing import — report may be stale or source files changed.',
      ],
    };
  }
  return { ok: true };
}
