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
 *
 * v3: binds the WebP optimization pipeline (params + source/output hashes + storage keys).
 */
export type DryRunFingerprintPayload = {
  v: 3;
  mode: 'dry-run';
  /** Bound target — staging-houzez | production. Prevents cross-target import. */
  migrationTarget: string;
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
  imageOptimizePipeline: {
    version: string | null;
    format: string;
    quality: number | null;
    maxWidth: number | null;
    maxHeight: number | null;
    resizeFit: string | null;
    withoutEnlargement: boolean | null;
    orientationPolicy: string | null;
    metadataPolicy: string | null;
  };
  images: Array<{
    sortOrder: number;
    attachmentId: number;
    isCover: boolean;
    sourceSha256: string | null;
    /** Output (WebP) SHA-256 — bytes that will be uploaded. */
    sha256: string | null;
    proposedFilename: string;
    mimeType: string | null;
    width: number | null;
    height: number | null;
    fileSizeBytes: number | null;
    storageKey: string | null;
    hasAlphaSource: boolean | null;
    hasAlphaOutput: boolean | null;
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
  const firstOpt = report.images.find((i) => i.optimization)?.optimization;
  return {
    v: 3,
    mode: 'dry-run',
    migrationTarget: report.safety?.migrationTarget ?? '',
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
    imageOptimizePipeline: {
      version: firstOpt?.pipelineVersion ?? null,
      format: 'webp',
      quality: firstOpt?.quality ?? null,
      maxWidth: firstOpt?.maxWidth ?? null,
      maxHeight: firstOpt?.maxHeight ?? null,
      resizeFit: firstOpt?.resizeFit ?? null,
      withoutEnlargement: firstOpt?.withoutEnlargement ?? null,
      orientationPolicy: firstOpt?.orientationPolicy ?? null,
      metadataPolicy: firstOpt?.metadataPolicy ?? null,
    },
    images: report.images.map((img) => ({
      sortOrder: img.sortOrder,
      attachmentId: img.attachmentId,
      isCover: img.isCover,
      sourceSha256: img.sourceSha256 ?? img.optimization?.source.sha256 ?? null,
      sha256: img.sha256,
      proposedFilename: img.proposedFilename,
      mimeType: img.mimeType,
      width: img.width,
      height: img.height,
      fileSizeBytes: img.fileSizeBytes,
      storageKey:
        img.optimization?.output.storageKey ??
        img.proposedStorageKeyPattern ??
        null,
      hasAlphaSource: img.optimization?.source.hasAlpha ?? null,
      hasAlphaOutput: img.optimization?.output.hasAlpha ?? null,
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
  /** Must match dry-run safety.migrationTarget (staging-houzez | production). */
  migrationTarget: string;
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
        mimeType: image.mimeType,
        storageKey:
          image.optimization?.output.storageKey ??
          image.proposedStorageKeyPattern,
        fileSizeBytes: image.fileSizeBytes,
        width: image.width,
        height: image.height,
        sourceSha256: image.sourceSha256 ?? null,
        sha256: image.sha256,
        pipelineVersion: image.optimization?.pipelineVersion ?? null,
        quality: image.optimization?.quality ?? null,
        trimApplied: image.optimization?.trim.trimApplied ?? false,
        trimReason: image.optimization?.trim.reason ?? null,
        trimPixelsRemoved: image.optimization?.trim.pixelsRemoved ?? null,
        trimOriginalWidth: image.optimization?.trim.originalWidth ?? null,
        trimOriginalHeight: image.optimization?.trim.originalHeight ?? null,
        trimmedWidth: image.optimization?.trim.trimmedWidth ?? null,
        trimmedHeight: image.optimization?.trim.trimmedHeight ?? null,
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
      migrationTarget: live.migrationTarget,
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
