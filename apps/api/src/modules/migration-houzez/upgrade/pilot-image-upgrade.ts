import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  DEFAULT_OWNER_EMAIL,
  DEFAULT_TENANT_SLUG,
  HOUZEZ_SOURCE_SYSTEM,
  MIGRATION_ENTITY_TYPE_PROPERTY,
  PILOT_5312_APPROVED_V2_MANIFEST_SHA256,
  PILOT_5312_EXPECTED_RELATIVE_KEYS,
  PILOT_5312_PRODUCTION_MSR_ID,
  PILOT_5312_PRODUCTION_PROPERTY_ID,
  PILOT_5312_UPGRADE_ATTACHMENT_IDS,
  PILOT_WP_ID,
  PRODUCTION_MIGRATION_TARGET,
} from '../constants';
import {
  IMAGE_OPTIMIZE_PIPELINE_VERSION,
  hashBufferSha256,
} from '../images/optimize-pipeline';
import { assertProductionNeonIdentity } from '../safety/neon-identity';
import {
  checkPropertyIdempotency,
  detectTraceabilitySchema,
} from '../traceability/idempotency';
import { compensateUploadedKeys } from '../writer/houzez-property-writer';
import type { MigrationObjectStore } from '../writer/migration-object-store';
import {
  buildHouzezMigrationImageKey,
  buildHouzezMigrationImageKeyWithPipeline,
} from '../writer/storage-keys';

export type ApprovedV2ManifestImage = {
  sortOrder: number;
  attachmentId: number;
  isCover: boolean;
  sourcePath: string | null;
  sourceSha256: string;
  outputSha256: string;
  outputWidth: number;
  outputHeight: number;
  outputBytes: number;
  outputMimeType: string;
  outputFilename: string;
  trimApplied: boolean;
  trimReason: string;
  trimPixelsRemoved: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  trimOriginalWidth: number;
  trimOriginalHeight: number;
  trimTrimmedWidth: number;
  trimTrimmedHeight: number;
  storageKey: string;
};

export type ApprovedV2Manifest = {
  status: string;
  wpId: number;
  tenant: string;
  owner: string;
  tenantId: string;
  pipelineVersion: string;
  imageCount: number;
  images: ApprovedV2ManifestImage[];
};

export type PropertyImageRow = {
  id: string;
  tenantId: string;
  propertyId: string;
  storageKey: string;
  url: string | null;
  altText: string | null;
  mimeType: string | null;
  fileSize: number | null;
  sortOrder: number;
  isCover: boolean;
};

export type UpgradePrisma = {
  $queryRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown>;
  $transaction: <T>(fn: (tx: UpgradePrismaTx) => Promise<T>) => Promise<T>;
  tenant: {
    findUnique: (args: unknown) => Promise<{
      id: string;
      slug: string;
      status: string;
    } | null>;
  };
  user: {
    findFirst: (args: unknown) => Promise<{
      id: string;
      email: string;
      isActive: boolean;
      role: string;
    } | null>;
  };
  property: {
    findUnique: (args: unknown) => Promise<{
      id: string;
      tenantId: string;
      isActive: boolean;
    } | null>;
    count: (args: unknown) => Promise<number>;
  };
  propertyListing: { count: (args: unknown) => Promise<number> };
  propertyPrice: { count: (args: unknown) => Promise<number> };
  propertyImage: {
    findMany: (args: unknown) => Promise<PropertyImageRow[]>;
    count: (args: unknown) => Promise<number>;
  };
  propertyFeatureAssignment: { count: (args: unknown) => Promise<number> };
  propertyAgentAccess: { count: (args: unknown) => Promise<number> };
  migrationSourceRef: {
    findUnique: (args: unknown) => Promise<{
      id: string;
      entityId: string;
      entityType: string;
      sourceSystem: string;
      sourceId: string;
      tenantId: string;
      migrationBatchId: string;
      metadata: unknown;
    } | null>;
    findMany: (args: unknown) => Promise<
      Array<{
        entityId: string;
        entityType: string;
        sourceId: string;
        migrationBatchId: string;
        metadata: unknown;
        updatedAt: Date;
        createdAt: Date;
      }>
    >;
    count: (args: unknown) => Promise<number>;
  };
};

export type UpgradePrismaTx = {
  propertyImage: {
    updateMany: (args: unknown) => Promise<{ count: number }>;
  };
};

export type HeadCheck = {
  key: string;
  exists: boolean;
  contentType: string | null;
  contentLength: number | null;
};

export type UpgradeTargetPlan = {
  attachmentId: number;
  sortOrder: number;
  isCover: boolean;
  imageId: string;
  previousKey: string;
  previousFileSize: number | null;
  previousUrl: string | null;
  newKey: string;
  approvedOutputSha256: string;
  approvedOutputBytes: number;
  approvedOutputWidth: number;
  approvedOutputHeight: number;
  trimPixelsRemoved: ApprovedV2ManifestImage['trimPixelsRemoved'];
  localArtifactPath: string;
  localArtifactSha256: string;
  localArtifactBytes: number;
};

export type PilotImageUpgradeReport = {
  mode: 'pilot-image-upgrade';
  verdict: string;
  wpId: number;
  propertyId: string | null;
  migrationSourceRefId: string | null;
  tenantSlug: string;
  ownerEmail: string;
  pipelineVersion: typeof IMAGE_OPTIMIZE_PIPELINE_VERSION;
  approvedManifestSha256: string;
  startedAtUtc: string | null;
  finishedAtUtc: string | null;
  executed: boolean;
  singleExecution: true;
  rowsUpdated: number;
  putObjectResults: Array<{
    key: string;
    wrote: boolean;
    preexisting: boolean;
  }>;
  compensation: {
    uploadedKeys: string[];
    compensatedKeys: string[];
    pendingKeys: string[];
    compensationFailed: boolean;
    compensationErrors: string[];
    applicable: boolean;
  };
  rollbackStatus: string;
  headObjectBefore: HeadCheck[];
  headObjectAfter: HeadCheck[];
  baselineCounts: Record<string, number> | null;
  postCounts: Record<string, number> | null;
  targets: UpgradeTargetPlan[];
  unchangedImageIds: string[];
  warnings: string[];
  blockers: string[];
  notes: string[];
  operations: {
    postgresql: string[];
    r2: {
      HeadObject: string[];
      PutObject: string[];
      DeleteObject: string[];
    };
  };
};

function sha256File(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export function loadApprovedV2Manifest(manifestPath: string): {
  manifest: ApprovedV2Manifest;
  sha256: string;
  absolutePath: string;
} {
  const absolutePath = path.resolve(manifestPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Approved manifest not found: ${absolutePath}`);
  }
  const sha256 = sha256File(absolutePath);
  if (sha256 !== PILOT_5312_APPROVED_V2_MANIFEST_SHA256) {
    throw new Error(
      `Approved manifest SHA-256 mismatch (expected ${PILOT_5312_APPROVED_V2_MANIFEST_SHA256}, got ${sha256}).`,
    );
  }
  const raw = JSON.parse(
    fs.readFileSync(absolutePath, 'utf8'),
  ) as ApprovedV2Manifest;
  if (raw.wpId !== PILOT_WP_ID) {
    throw new Error(`Manifest wpId must be ${PILOT_WP_ID}.`);
  }
  if (raw.pipelineVersion !== IMAGE_OPTIMIZE_PIPELINE_VERSION) {
    throw new Error(
      `Manifest pipelineVersion must be ${IMAGE_OPTIMIZE_PIPELINE_VERSION}.`,
    );
  }
  if (
    raw.imageCount !== 7 ||
    !Array.isArray(raw.images) ||
    raw.images.length !== 7
  ) {
    throw new Error('Manifest must contain exactly 7 images.');
  }
  return { manifest: raw, sha256, absolutePath };
}

function attachmentIdFromStorageKey(storageKey: string): number | null {
  const match = storageKey.match(/-wp(\d+)(?:\.[a-z0-9._-]+)?\.webp$/i);
  if (!match) return null;
  return Number(match[1]);
}

export function assertPilotImageBaseline(input: {
  images: PropertyImageRow[];
  tenantId: string;
  propertyId: string;
}): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (input.images.length !== 7) {
    errors.push(
      `Expected exactly 7 PropertyImage rows, got ${input.images.length}.`,
    );
  }
  const covers = input.images.filter((i) => i.isCover);
  if (covers.length !== 1) {
    errors.push(`Expected exactly one cover image, got ${covers.length}.`);
  }
  const orders = input.images.map((i) => i.sortOrder).sort((a, b) => a - b);
  if (orders.join(',') !== '0,1,2,3,4,5,6') {
    errors.push(`Expected sortOrder 0–6 unique, got [${orders.join(', ')}].`);
  }
  const byOrder = new Map(input.images.map((i) => [i.sortOrder, i]));
  for (let i = 0; i < PILOT_5312_EXPECTED_RELATIVE_KEYS.length; i++) {
    const expectedRel = PILOT_5312_EXPECTED_RELATIVE_KEYS[i];
    const row = byOrder.get(i);
    if (!row) {
      errors.push(`Missing PropertyImage at sortOrder=${i}.`);
      continue;
    }
    if (!row.storageKey.endsWith(`/${expectedRel}`)) {
      errors.push(
        `sortOrder=${i} storageKey must end with /${expectedRel} (got ${row.storageKey}).`,
      );
    }
    if (
      row.tenantId !== input.tenantId ||
      row.propertyId !== input.propertyId
    ) {
      errors.push(`sortOrder=${i} tenant/property mismatch.`);
    }
    if (row.mimeType !== 'image/webp') {
      errors.push(`sortOrder=${i} mimeType must be image/webp.`);
    }
  }
  const cover = byOrder.get(0);
  if (
    !cover?.isCover ||
    attachmentIdFromStorageKey(cover.storageKey) !== 5315
  ) {
    errors.push('sortOrder=0 must be cover attachment 5315.');
  }
  const img5314 = byOrder.get(4);
  if (
    !img5314 ||
    img5314.isCover ||
    attachmentIdFromStorageKey(img5314.storageKey) !== 5314
  ) {
    errors.push('sortOrder=4 must be non-cover attachment 5314.');
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

function emptyReport(
  partial?: Partial<PilotImageUpgradeReport>,
): PilotImageUpgradeReport {
  return {
    mode: 'pilot-image-upgrade',
    verdict: 'BLOCKED',
    wpId: PILOT_WP_ID,
    propertyId: null,
    migrationSourceRefId: null,
    tenantSlug: DEFAULT_TENANT_SLUG,
    ownerEmail: DEFAULT_OWNER_EMAIL,
    pipelineVersion: IMAGE_OPTIMIZE_PIPELINE_VERSION,
    approvedManifestSha256: PILOT_5312_APPROVED_V2_MANIFEST_SHA256,
    startedAtUtc: null,
    finishedAtUtc: null,
    executed: false,
    singleExecution: true,
    rowsUpdated: 0,
    putObjectResults: [],
    compensation: {
      uploadedKeys: [],
      compensatedKeys: [],
      pendingKeys: [],
      compensationFailed: false,
      compensationErrors: [],
      applicable: false,
    },
    rollbackStatus: 'not_applicable',
    headObjectBefore: [],
    headObjectAfter: [],
    baselineCounts: null,
    postCounts: null,
    targets: [],
    unchangedImageIds: [],
    warnings: [],
    blockers: [],
    notes: [],
    operations: {
      postgresql: [],
      r2: { HeadObject: [], PutObject: [], DeleteObject: [] },
    },
    ...partial,
  };
}

async function countPilotTree(
  prisma: UpgradePrisma,
  propertyId: string,
  tenantId: string,
): Promise<Record<string, number>> {
  const [
    property,
    listing,
    price,
    image,
    featureAssignment,
    agentAccess,
    migrationSourceRef,
  ] = await Promise.all([
    prisma.property.count({ where: { id: propertyId, tenantId } }),
    prisma.propertyListing.count({ where: { propertyId, tenantId } }),
    prisma.propertyPrice.count({
      where: { listing: { propertyId, tenantId } },
    }),
    prisma.propertyImage.count({ where: { propertyId, tenantId } }),
    prisma.propertyFeatureAssignment.count({ where: { propertyId, tenantId } }),
    prisma.propertyAgentAccess.count({ where: { propertyId, tenantId } }),
    prisma.migrationSourceRef.count({
      where: {
        tenantId,
        sourceSystem: HOUZEZ_SOURCE_SYSTEM,
        sourceId: String(PILOT_WP_ID),
        entityType: MIGRATION_ENTITY_TYPE_PROPERTY,
      },
    }),
  ]);
  return {
    property,
    listing,
    price,
    image,
    featureAssignment,
    agentAccess,
    migrationSourceRef,
    logicalTotal:
      property +
      listing +
      price +
      image +
      featureAssignment +
      agentAccess +
      migrationSourceRef,
  };
}

export async function runPilotImageUpgrade(input: {
  prisma: UpgradePrisma;
  objectStore: MigrationObjectStore;
  approvedManifestPath: string;
  execute: boolean;
  tenantSlug?: string;
  ownerEmail?: string;
}): Promise<PilotImageUpgradeReport> {
  const report = emptyReport({
    tenantSlug: input.tenantSlug ?? DEFAULT_TENANT_SLUG,
    ownerEmail: input.ownerEmail ?? DEFAULT_OWNER_EMAIL,
  });
  const ops = report.operations;

  let manifestBundle: ReturnType<typeof loadApprovedV2Manifest>;
  try {
    manifestBundle = loadApprovedV2Manifest(input.approvedManifestPath);
  } catch (error) {
    report.blockers.push(
      error instanceof Error ? error.message : String(error),
    );
    report.verdict = 'BLOCKED';
    return report;
  }
  const { manifest, absolutePath: manifestAbs } = manifestBundle;
  report.notes.push(
    `Approved manifest loaded from ${path.basename(manifestAbs)}.`,
  );

  const neon = await assertProductionNeonIdentity(input.prisma);
  ops.postgresql.push('readNeonIdentity');
  if (!neon.ok) {
    report.blockers.push(...neon.errors);
    report.verdict = 'BLOCKED';
    return report;
  }
  report.notes.push(
    `Neon identity verified: project=${neon.identity.projectId} branch=${neon.identity.branchId} endpoint=${neon.identity.endpointId}.`,
  );

  const tenant = await input.prisma.tenant.findUnique({
    where: { slug: report.tenantSlug },
  });
  ops.postgresql.push('tenant.findUnique');
  if (!tenant || tenant.status !== 'ACTIVE') {
    report.blockers.push('Tenant demo must exist and be ACTIVE.');
    report.verdict = 'BLOCKED';
    return report;
  }
  if (tenant.id !== manifest.tenantId) {
    report.blockers.push(
      'Live tenant id does not match approved preparation manifest tenantId.',
    );
    report.verdict = 'BLOCKED';
    return report;
  }

  const owner = await input.prisma.user.findFirst({
    where: {
      tenantId: tenant.id,
      email: report.ownerEmail,
    },
  });
  ops.postgresql.push('user.findFirst');
  if (!owner || !owner.isActive || owner.role !== 'TENANT_ADMIN') {
    report.blockers.push(
      'Owner admin@demo.valorar.dev must be ACTIVE with role TENANT_ADMIN.',
    );
    report.verdict = 'BLOCKED';
    return report;
  }

  const schema = await detectTraceabilitySchema(input.prisma);
  ops.postgresql.push('detectTraceabilitySchema');
  const idem = await checkPropertyIdempotency({
    prisma: input.prisma,
    schema,
    tenantId: tenant.id,
    sourceId: String(PILOT_WP_ID),
  });
  ops.postgresql.push('checkPropertyIdempotency');
  if (!idem.idempotencySchemaAvailable || !idem.existingPropertyRef) {
    report.blockers.push(
      'Pilot MigrationSourceRef for WP 5312 must exist before image upgrade.',
    );
    report.verdict = 'BLOCKED';
    return report;
  }

  const msr = await input.prisma.migrationSourceRef.findUnique({
    where: {
      tenantId_sourceSystem_sourceId_entityType: {
        tenantId: tenant.id,
        sourceSystem: HOUZEZ_SOURCE_SYSTEM,
        sourceId: String(PILOT_WP_ID),
        entityType: MIGRATION_ENTITY_TYPE_PROPERTY,
      },
    },
  });
  ops.postgresql.push('migrationSourceRef.findUnique');
  if (!msr || msr.id !== PILOT_5312_PRODUCTION_MSR_ID) {
    report.blockers.push(
      `MigrationSourceRef id mismatch (expected ${PILOT_5312_PRODUCTION_MSR_ID}).`,
    );
    report.verdict = 'BLOCKED';
    return report;
  }
  if (msr.entityId !== PILOT_5312_PRODUCTION_PROPERTY_ID) {
    report.blockers.push(
      `MigrationSourceRef.entityId mismatch (expected ${PILOT_5312_PRODUCTION_PROPERTY_ID}).`,
    );
    report.verdict = 'BLOCKED';
    return report;
  }
  report.migrationSourceRefId = msr.id;

  const property = await input.prisma.property.findUnique({
    where: { id: PILOT_5312_PRODUCTION_PROPERTY_ID },
  });
  ops.postgresql.push('property.findUnique');
  if (!property || property.tenantId !== tenant.id || !property.isActive) {
    report.blockers.push('Pilot Property missing, inactive, or wrong tenant.');
    report.verdict = 'BLOCKED';
    return report;
  }
  report.propertyId = property.id;

  const images = await input.prisma.propertyImage.findMany({
    where: { propertyId: property.id, tenantId: tenant.id },
    orderBy: { sortOrder: 'asc' },
  });
  ops.postgresql.push('propertyImage.findMany');
  const baseline = assertPilotImageBaseline({
    images,
    tenantId: tenant.id,
    propertyId: property.id,
  });
  if (!baseline.ok) {
    report.blockers.push(...baseline.errors);
    report.verdict = 'BLOCKED';
    return report;
  }

  report.baselineCounts = await countPilotTree(
    input.prisma,
    property.id,
    tenant.id,
  );
  ops.postgresql.push('countPilotTree:baseline');
  if (report.baselineCounts.logicalTotal !== 13) {
    report.blockers.push(
      `Expected logical pilot total 13, got ${report.baselineCounts.logicalTotal}.`,
    );
    report.verdict = 'BLOCKED';
    return report;
  }

  const upgradeAttachmentSet = new Set<number>(
    PILOT_5312_UPGRADE_ATTACHMENT_IDS,
  );
  const manifestByAttachment = new Map(
    manifest.images.map((img) => [img.attachmentId, img]),
  );
  const imagesDir = path.join(path.dirname(manifestAbs), 'images');
  const targets: UpgradeTargetPlan[] = [];
  const unchangedImageIds: string[] = [];

  for (const row of images) {
    const attachmentId = attachmentIdFromStorageKey(row.storageKey);
    if (attachmentId == null) {
      report.blockers.push(
        `Cannot parse attachment id from ${row.storageKey}.`,
      );
      continue;
    }
    if (!upgradeAttachmentSet.has(attachmentId)) {
      unchangedImageIds.push(row.id);
      continue;
    }
    const approved = manifestByAttachment.get(attachmentId);
    if (!approved) {
      report.blockers.push(
        `Approved manifest missing attachment ${attachmentId}.`,
      );
      continue;
    }
    if (
      approved.sortOrder !== row.sortOrder ||
      approved.isCover !== row.isCover
    ) {
      report.blockers.push(
        `Attachment ${attachmentId} sortOrder/isCover mismatch vs live PropertyImage.`,
      );
      continue;
    }
    const previousKey = buildHouzezMigrationImageKey({
      tenantId: tenant.id,
      sourceId: String(PILOT_WP_ID),
      sortOrder: row.sortOrder,
      attachmentId,
      extension: 'webp',
    });
    if (row.storageKey !== previousKey) {
      report.blockers.push(
        `Live storageKey for attachment ${attachmentId} is not the expected v1 key.`,
      );
      continue;
    }
    const newKey = buildHouzezMigrationImageKeyWithPipeline({
      tenantId: tenant.id,
      sourceId: String(PILOT_WP_ID),
      sortOrder: row.sortOrder,
      attachmentId,
      pipelineVersion: IMAGE_OPTIMIZE_PIPELINE_VERSION,
    });
    if (!newKey.endsWith('.webp')) {
      report.blockers.push(`Proposed v2 key must end with .webp (${newKey}).`);
      continue;
    }
    const localArtifactPath = path.join(imagesDir, approved.outputFilename);
    if (!fs.existsSync(localArtifactPath)) {
      report.blockers.push(
        `Missing local artifact ${approved.outputFilename}.`,
      );
      continue;
    }
    const localBytes = fs.readFileSync(localArtifactPath);
    const localArtifactSha256 = hashBufferSha256(localBytes);
    if (localArtifactSha256 !== approved.outputSha256) {
      report.blockers.push(
        `Local artifact SHA mismatch for attachment ${attachmentId}.`,
      );
      continue;
    }
    if (localBytes.length !== approved.outputBytes) {
      report.blockers.push(
        `Local artifact byte length mismatch for attachment ${attachmentId}.`,
      );
      continue;
    }
    targets.push({
      attachmentId,
      sortOrder: row.sortOrder,
      isCover: row.isCover,
      imageId: row.id,
      previousKey,
      previousFileSize: row.fileSize,
      previousUrl: row.url,
      newKey,
      approvedOutputSha256: approved.outputSha256,
      approvedOutputBytes: approved.outputBytes,
      approvedOutputWidth: approved.outputWidth,
      approvedOutputHeight: approved.outputHeight,
      trimPixelsRemoved: approved.trimPixelsRemoved,
      localArtifactPath,
      localArtifactSha256,
      localArtifactBytes: localBytes.length,
    });
  }

  if (report.blockers.length) {
    report.verdict = 'BLOCKED';
    return report;
  }
  if (targets.length !== PILOT_5312_UPGRADE_ATTACHMENT_IDS.length) {
    report.blockers.push(
      `Expected exactly ${PILOT_5312_UPGRADE_ATTACHMENT_IDS.length} upgrade targets, got ${targets.length}.`,
    );
    report.verdict = 'BLOCKED';
    return report;
  }
  report.targets = targets;
  report.unchangedImageIds = unchangedImageIds;

  // HeadObject: all seven current v1 keys + two proposed v2 keys
  const v1Keys = images.map((i) => i.storageKey);
  const v2Keys = targets.map((t) => t.newKey);
  for (const key of [...v1Keys, ...v2Keys]) {
    const head = await input.objectStore.headObject(key);
    ops.r2.HeadObject.push(key);
    report.headObjectBefore.push({
      key,
      exists: head.exists,
      contentType: head.contentType,
      contentLength: head.contentLength,
    });
  }

  for (const key of v1Keys) {
    const head = report.headObjectBefore.find((h) => h.key === key);
    if (!head?.exists || head.contentType !== 'image/webp') {
      report.blockers.push(`v1 key missing or not image/webp: ${key}`);
    }
    const row = images.find((i) => i.storageKey === key);
    if (
      row?.fileSize != null &&
      head?.contentLength != null &&
      row.fileSize !== head.contentLength
    ) {
      report.blockers.push(
        `fileSize/DB vs R2 mismatch for ${key}: db=${row.fileSize} r2=${head.contentLength}`,
      );
    }
  }
  for (const key of v2Keys) {
    const head = report.headObjectBefore.find((h) => h.key === key);
    if (head?.exists) {
      report.blockers.push(
        `Proposed v2 key already exists (fail-closed, no overwrite): ${key}`,
      );
    }
  }

  if (report.blockers.length) {
    report.verdict = 'BLOCKED';
    return report;
  }

  if (!input.execute) {
    report.verdict = 'BLOCKED';
    report.blockers.push(
      'Preflight passed but --execute was not provided. No writes performed.',
    );
    report.notes.push(
      `Would upgrade attachments ${targets.map((t) => t.attachmentId).join(', ')} on target ${PRODUCTION_MIGRATION_TARGET}.`,
    );
    return report;
  }

  // Immediate pre-put HeadObject on v2 keys again
  report.startedAtUtc = new Date().toISOString();
  for (const target of targets) {
    const head = await input.objectStore.headObject(target.newKey);
    ops.r2.HeadObject.push(`${target.newKey}#pre-put`);
    if (head.exists) {
      report.blockers.push(
        `v2 key appeared before PutObject (abort): ${target.newKey}`,
      );
    }
  }
  if (report.blockers.length) {
    report.finishedAtUtc = new Date().toISOString();
    report.verdict = 'BLOCKED';
    return report;
  }

  const uploadedKeys: string[] = [];
  try {
    for (const target of targets) {
      const body = fs.readFileSync(target.localArtifactPath);
      const put = await input.objectStore.putObject({
        key: target.newKey,
        body,
        contentType: 'image/webp',
      });
      ops.r2.PutObject.push(target.newKey);
      report.putObjectResults.push({
        key: target.newKey,
        wrote: put.wrote,
        preexisting: put.preexisting,
      });
      if (put.preexisting || !put.wrote) {
        throw new Error(
          `PutObject refused or preexisting for ${target.newKey} (wrote=${put.wrote}, preexisting=${put.preexisting}).`,
        );
      }
      uploadedKeys.push(target.newKey);
      const verify = await input.objectStore.headObject(target.newKey);
      ops.r2.HeadObject.push(`${target.newKey}#post-put`);
      if (
        !verify.exists ||
        verify.contentType !== 'image/webp' ||
        verify.contentLength !== target.approvedOutputBytes
      ) {
        throw new Error(
          `Post-put HeadObject validation failed for ${target.newKey}.`,
        );
      }
    }
  } catch (error) {
    const compensation = await compensateUploadedKeys({
      objectStore: input.objectStore,
      uploadedKeys,
    });
    for (const key of compensation.compensatedKeys) {
      ops.r2.DeleteObject.push(key);
    }
    report.compensation = { ...compensation, applicable: true };
    report.executed = true;
    report.finishedAtUtc = new Date().toISOString();
    report.blockers.push(
      error instanceof Error ? error.message : String(error),
    );
    report.verdict = compensation.compensationFailed
      ? 'PILOT_IMAGE_UPGRADE_STATE_UNCERTAIN'
      : 'PILOT_IMAGE_UPGRADE_FAILED_COMPENSATED';
    report.rollbackStatus = 'r2_compensated_db_untouched';
    return report;
  }

  report.compensation.uploadedKeys = [...uploadedKeys];
  report.compensation.applicable = false;

  try {
    const updated = await input.prisma.$transaction(async (tx) => {
      let rows = 0;
      for (const target of targets) {
        const result = await tx.propertyImage.updateMany({
          where: {
            id: target.imageId,
            tenantId: tenant.id,
            propertyId: property.id,
            storageKey: target.previousKey,
            sortOrder: target.sortOrder,
            isCover: target.isCover,
          },
          data: {
            storageKey: target.newKey,
            url: input.objectStore.getPublicUrl(target.newKey),
            mimeType: 'image/webp',
            fileSize: target.approvedOutputBytes,
          },
        });
        if (result.count !== 1) {
          throw new Error(
            `Expected exactly 1 row updated for attachment ${target.attachmentId}, got ${result.count}.`,
          );
        }
        rows += result.count;
      }
      return rows;
    });
    ops.postgresql.push('propertyImage.updateMany×2@transaction');
    report.rowsUpdated = updated;
    if (updated !== targets.length) {
      throw new Error(
        `Transaction updated ${updated} rows; expected ${targets.length}.`,
      );
    }
  } catch (error) {
    const compensation = await compensateUploadedKeys({
      objectStore: input.objectStore,
      uploadedKeys,
    });
    for (const key of compensation.compensatedKeys) {
      ops.r2.DeleteObject.push(key);
    }
    report.compensation = { ...compensation, applicable: true };
    report.executed = true;
    report.finishedAtUtc = new Date().toISOString();
    report.blockers.push(
      error instanceof Error ? error.message : String(error),
    );
    report.rollbackStatus = compensation.compensationFailed
      ? 'db_failed_compensation_uncertain'
      : 'db_rolled_back_r2_compensated';
    report.verdict = compensation.compensationFailed
      ? 'PILOT_IMAGE_UPGRADE_STATE_UNCERTAIN'
      : 'PILOT_IMAGE_UPGRADE_FAILED_ROLLED_BACK_AND_COMPENSATED';
    return report;
  }

  // Post verification
  const postImages = await input.prisma.propertyImage.findMany({
    where: { propertyId: property.id, tenantId: tenant.id },
    orderBy: { sortOrder: 'asc' },
  });
  ops.postgresql.push('propertyImage.findMany:post');
  report.postCounts = await countPilotTree(
    input.prisma,
    property.id,
    tenant.id,
  );
  ops.postgresql.push('countPilotTree:post');

  const postErrors: string[] = [];
  if (report.postCounts.logicalTotal !== 13) {
    postErrors.push(
      `Post logical total expected 13, got ${report.postCounts.logicalTotal}.`,
    );
  }
  if (postImages.length !== 7) {
    postErrors.push(`Post image count expected 7, got ${postImages.length}.`);
  }

  const postById = new Map(postImages.map((i) => [i.id, i]));
  for (const target of targets) {
    const row = postById.get(target.imageId);
    if (!row) {
      postErrors.push(`Missing post row ${target.imageId}.`);
      continue;
    }
    if (row.storageKey !== target.newKey) {
      postErrors.push(
        `Attachment ${target.attachmentId} did not point to v2 key after upgrade.`,
      );
    }
    if (row.fileSize !== target.approvedOutputBytes) {
      postErrors.push(
        `Attachment ${target.attachmentId} fileSize mismatch after upgrade.`,
      );
    }
    if (row.sortOrder !== target.sortOrder || row.isCover !== target.isCover) {
      postErrors.push(
        `Attachment ${target.attachmentId} sortOrder/isCover changed unexpectedly.`,
      );
    }
  }
  for (const id of unchangedImageIds) {
    const before = images.find((i) => i.id === id);
    const after = postById.get(id);
    if (!before || !after) {
      postErrors.push(`Unchanged image missing: ${id}`);
      continue;
    }
    if (
      before.storageKey !== after.storageKey ||
      before.fileSize !== after.fileSize ||
      before.sortOrder !== after.sortOrder ||
      before.isCover !== after.isCover
    ) {
      postErrors.push(`Unchanged image mutated unexpectedly: ${id}`);
    }
  }

  const activeKeys = postImages.map((i) => i.storageKey);
  const retainedV1 = targets.map((t) => t.previousKey);
  for (const key of [...activeKeys, ...retainedV1]) {
    const head = await input.objectStore.headObject(key);
    ops.r2.HeadObject.push(`${key}#post`);
    report.headObjectAfter.push({
      key,
      exists: head.exists,
      contentType: head.contentType,
      contentLength: head.contentLength,
    });
    if (!head.exists || head.contentType !== 'image/webp') {
      postErrors.push(`Post HeadObject failed for ${key}.`);
    }
  }
  for (const target of targets) {
    const head = report.headObjectAfter.find((h) => h.key === target.newKey);
    if (head?.contentLength !== target.approvedOutputBytes) {
      postErrors.push(`Active v2 R2 size mismatch for ${target.newKey}.`);
    }
    const oldHead = report.headObjectAfter.find(
      (h) => h.key === target.previousKey,
    );
    if (!oldHead?.exists) {
      postErrors.push(
        `v1 rollback key missing after upgrade: ${target.previousKey}`,
      );
    }
  }

  const idemPost = await checkPropertyIdempotency({
    prisma: input.prisma,
    schema,
    tenantId: tenant.id,
    sourceId: String(PILOT_WP_ID),
  });
  ops.postgresql.push('checkPropertyIdempotency:post');
  if (!idemPost.existingPropertyRef) {
    postErrors.push('Idempotency ref missing after upgrade.');
  }

  report.executed = true;
  report.finishedAtUtc = new Date().toISOString();
  report.rollbackStatus = 'v1_keys_retained_for_manual_rollback';
  report.notes.push(
    'v1 R2 keys were intentionally retained; no DeleteObject after success.',
  );
  report.notes.push('Import CLI was not used.');
  report.notes.push(
    `Single transaction updated exactly ${report.rowsUpdated} PropertyImage rows.`,
  );

  if (postErrors.length) {
    report.blockers.push(...postErrors);
    report.verdict = 'POST_UPGRADE_VERIFICATION_FAILED';
    return report;
  }

  report.verdict = 'PILOT_IMAGE_UPGRADE_COMPLETED_AND_VERIFIED';
  return report;
}
