import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildR2DeleteAllowlist } from './classify';
import {
  ANOMALOUS_STORAGE_KEY,
  CLEANUP_PROCEDURE_VERSION,
  EXPECTED_DEMO_COUNTS,
  EXPECTED_STORAGE_POLICY,
  WORDPRESS_HOUZEZ_KEY_MARKER,
} from './constants';
import {
  countPropertyTreeByTenant,
  loadDemoPropertyIds,
  loadDemoPropertyImages,
  resolveExactDemoTenant,
  type CleanupPrisma,
} from './db';
import { computeManifestStableHash, diffExpectedCounts } from './manifest';
import type { CleanupR2Deleter } from './r2-delete';
import type { CleanupR2Reader } from './r2-verify';
import type { CleanupManifest, TenantCounts } from './types';

export type ExecuteR2ObjectResult = {
  storageKey: string;
  deleteAttempted: boolean;
  deleteOk: boolean;
  deleteError: string | null;
  postHeadExists: boolean | null;
  postHeadError: string | null;
  outcome: 'storage_deleted' | 'requires_retry' | 'skipped';
};

export type ExecuteResult = {
  ok: boolean;
  finalStatus: 'completed' | 'requires_retry' | 'failed';
  messages: string[];
  reportPath: string | null;
  report: ExecuteReport | null;
};

export type ExecuteReport = {
  procedureVersion: string;
  mode: 'execute';
  generatedAtUtc: string;
  manifestPath: string;
  manifestHashValidated: string;
  approvedHash: string;
  target: string;
  tenantSlug: string;
  tenantId: string;
  dbHostMasked: string;
  preCountsByTenant: TenantCounts;
  postCountsByTenant: TenantCounts | null;
  dbTransaction: {
    attempted: boolean;
    succeeded: boolean;
    skippedAlreadyEmpty: boolean;
    error: string | null;
    propertiesDeleted: number;
    relatedDeleted: {
      PropertyListing: number;
      PropertyPrice: number;
      PropertyImage: number;
      PropertyFeatureAssignment: number;
      PropertyAgentAccess: number;
    } | null;
  };
  allowlistCount: number;
  r2Results: ExecuteR2ObjectResult[];
  r2DeletedCount: number;
  r2RequiresRetryCount: number;
  seedSkippedCount: number;
  anomalousSkippedCount: number;
  deleteObjectAttempts: number;
  listObjectsUsed: false;
  putObjectUsed: false;
  remoteWrites: {
    database: boolean;
    storage: boolean;
  };
  finalStatus: 'completed' | 'requires_retry' | 'failed';
  errors: string[];
  note: string;
};

function imageFingerprint(row: {
  id: string;
  propertyId: string;
  storageKey: string;
  url: string | null;
  mimeType: string | null;
  fileSize: number | null;
  isCover: boolean;
  sortOrder: number;
}): string {
  return [
    row.id,
    row.propertyId,
    row.storageKey,
    row.url ?? '',
    row.mimeType ?? '',
    row.fileSize ?? '',
    row.isCover ? '1' : '0',
    String(row.sortOrder),
  ].join('|');
}

/**
 * Execute path — protected and NOT invoked by dry-run.
 * Validates live staging against the approved dry-run manifest before any write.
 */
export async function runCleanupExecute(options: {
  prisma: CleanupPrisma;
  r2Delete: CleanupR2Deleter;
  r2Head: CleanupR2Reader;
  tenantSlug: string;
  manifestPath: string;
  approvedHash: string;
  dbHostMasked: string;
  cleanupTarget: string;
  reportRoot: string;
  allowAnomalousKey?: boolean;
}): Promise<ExecuteResult> {
  const messages: string[] = [];
  const errors: string[] = [];

  const fail = (
    finalStatus: 'failed' | 'requires_retry',
    extraMessages: string[],
    report: ExecuteReport | null,
  ): ExecuteResult => ({
    ok: false,
    finalStatus,
    messages: [...messages, ...extraMessages],
    reportPath: report ? writeExecuteReport(options.reportRoot, report) : null,
    report,
  });

  if (options.allowAnomalousKey) {
    return fail(
      'failed',
      ['Refusing: --allow-anomalous-key is not authorized in this version.'],
      null,
    );
  }

  if (!fs.existsSync(options.manifestPath)) {
    return fail(
      'failed',
      [`Manifest not found: ${options.manifestPath}`],
      null,
    );
  }

  const manifest = JSON.parse(
    fs.readFileSync(options.manifestPath, 'utf8'),
  ) as CleanupManifest;

  if (manifest.procedureVersion !== CLEANUP_PROCEDURE_VERSION) {
    return fail(
      'failed',
      [`Unexpected procedureVersion: ${manifest.procedureVersion}`],
      null,
    );
  }
  if (manifest.mode !== 'dry-run') {
    return fail(
      'failed',
      [`Manifest mode must be dry-run (got ${manifest.mode}).`],
      null,
    );
  }
  if (manifest.tenantSlug !== 'demo') {
    return fail('failed', ['Manifest tenant must be demo.'], null);
  }

  const recomputed = computeManifestStableHash(manifest.images);
  if (recomputed !== manifest.stableHash) {
    return fail(
      'failed',
      ['Manifest hash mismatch vs on-disk stableHash — refusing to delete.'],
      null,
    );
  }
  if (recomputed !== options.approvedHash) {
    return fail(
      'failed',
      [
        'Manifest hash does not match owner-approved hash — refusing to delete.',
      ],
      null,
    );
  }

  if (
    !manifest.semantics?.readyForExecute ||
    !manifest.semantics.databaseCountsMatch ||
    !manifest.semantics.storageChecksCompleted ||
    !manifest.semantics.storagePolicySatisfied
  ) {
    return fail(
      'failed',
      [
        'Manifest semantics not readyForExecute / policy flags incomplete — refusing.',
      ],
      null,
    );
  }

  const allowlist = buildR2DeleteAllowlist(manifest.images);
  if (allowlist.length !== EXPECTED_STORAGE_POLICY.r2ObjectsAuthorized) {
    return fail(
      'failed',
      [
        `Allowlist size must be exactly ${EXPECTED_STORAGE_POLICY.r2ObjectsAuthorized} (got ${allowlist.length}).`,
      ],
      null,
    );
  }
  if (allowlist.some((k) => k.includes(WORDPRESS_HOUZEZ_KEY_MARKER))) {
    return fail(
      'failed',
      ['wordpress-houzez keys must never enter DeleteObject allowlist.'],
      null,
    );
  }
  if (
    manifest.images.some((img) =>
      img.storageKey.includes(WORDPRESS_HOUZEZ_KEY_MARKER),
    )
  ) {
    return fail(
      'failed',
      [
        'Manifest contains wordpress-houzez storage keys — refusing cleanup of migration pilot objects.',
      ],
      null,
    );
  }
  const seedRows = manifest.images.filter(
    (img) => img.classification === 'expected_seed_not_found',
  );
  if (seedRows.length !== 120 || seedRows.some((r) => r.deleteAuthorized)) {
    return fail(
      'failed',
      [
        'Seed policy mismatch: expected 120 unauthorized expected_seed_not_found.',
      ],
      null,
    );
  }
  const uploadNotFoundRows = manifest.images.filter(
    (img) => img.classification === 'expected_upload_not_found',
  );
  if (
    uploadNotFoundRows.length !==
      EXPECTED_STORAGE_POLICY.expectedUploadNotFound ||
    uploadNotFoundRows.some((r) => r.deleteAuthorized)
  ) {
    return fail(
      'failed',
      [
        `Upload not_found policy mismatch: expected ${EXPECTED_STORAGE_POLICY.expectedUploadNotFound} unauthorized expected_upload_not_found.`,
      ],
      null,
    );
  }
  const anomalous = manifest.images.filter(
    (img) => img.storageKey === ANOMALOUS_STORAGE_KEY || img.isAnomalousKey,
  );
  if (
    anomalous.length !== 1 ||
    anomalous.some((r) => r.deleteAuthorized) ||
    anomalous[0]?.storageKey !== ANOMALOUS_STORAGE_KEY
  ) {
    return fail(
      'failed',
      [
        'Anomalous key policy mismatch: expected exactly demo/key.jpg unauthorized.',
      ],
      null,
    );
  }
  if (allowlist.includes(ANOMALOUS_STORAGE_KEY)) {
    return fail('failed', ['Anomalous key must never enter allowlist.'], null);
  }
  if (allowlist.some((k) => seedRows.some((s) => s.storageKey === k))) {
    return fail('failed', ['Seed not_found key leaked into allowlist.'], null);
  }
  if (
    allowlist.some((k) => uploadNotFoundRows.some((s) => s.storageKey === k))
  ) {
    return fail(
      'failed',
      ['Upload not_found key leaked into allowlist.'],
      null,
    );
  }

  const tenant = await resolveExactDemoTenant(
    options.prisma,
    options.tenantSlug,
  );
  if (tenant.id !== manifest.tenantId || tenant.slug !== manifest.tenantSlug) {
    return fail(
      'failed',
      ['Tenant identity does not match manifest. Aborting.'],
      null,
    );
  }

  const preCounts = await countPropertyTreeByTenant(options.prisma, tenant.id);
  const countDiffs = diffExpectedCounts(preCounts, {
    ...EXPECTED_DEMO_COUNTS,
  });
  if (countDiffs.length) {
    return fail(
      'failed',
      ['Live staging counts differ from approved baseline:', ...countDiffs],
      null,
    );
  }

  // Exact image identity check vs manifesto.
  const liveImages = await loadDemoPropertyImages(options.prisma, tenant.id);
  if (liveImages.length !== manifest.images.length) {
    return fail(
      'failed',
      [
        `Live PropertyImage count ${liveImages.length} != manifest ${manifest.images.length}.`,
      ],
      null,
    );
  }
  const manifestById = new Map(manifest.images.map((i) => [i.id, i]));
  for (const live of liveImages) {
    const m = manifestById.get(live.id);
    if (!m) {
      return fail(
        'failed',
        [
          `Live PropertyImage id not in manifesto (id prefix ${live.id.slice(0, 8)}).`,
        ],
        null,
      );
    }
    if (
      imageFingerprint(live) !==
      imageFingerprint({
        id: m.id,
        propertyId: m.propertyId,
        storageKey: m.storageKey,
        url: m.url,
        mimeType: m.mimeType,
        fileSize: m.fileSize,
        isCover: m.isCover,
        sortOrder: m.sortOrder,
      })
    ) {
      return fail(
        'failed',
        [
          `PropertyImage drift vs manifesto (id prefix ${live.id.slice(0, 8)}).`,
        ],
        null,
      );
    }
  }

  const manifestPropertyIds = [
    ...new Set(manifest.images.map((i) => i.propertyId)),
  ].sort((a, b) => a.localeCompare(b));
  if (manifestPropertyIds.length !== 33) {
    return fail(
      'failed',
      [
        `Manifest unique propertyIds must be 33 (got ${manifestPropertyIds.length}).`,
      ],
      null,
    );
  }
  const livePropertyIds = await loadDemoPropertyIds(options.prisma, tenant.id);
  if (livePropertyIds.length !== 33) {
    return fail(
      'failed',
      [`Live Property count ids must be 33 (got ${livePropertyIds.length}).`],
      null,
    );
  }
  for (let i = 0; i < 33; i++) {
    if (livePropertyIds[i] !== manifestPropertyIds[i]) {
      return fail(
        'failed',
        ['Live Property ID set differs from manifesto property IDs.'],
        null,
      );
    }
  }

  messages.push(
    `Preflight OK: target matches manifesto (33 properties, 129 images, allowlist=${allowlist.length}).`,
  );

  const relatedDeleted = {
    PropertyListing: preCounts.PropertyListing,
    PropertyPrice: preCounts.PropertyPrice,
    PropertyImage: preCounts.PropertyImage,
    PropertyFeatureAssignment: preCounts.PropertyFeatureAssignment,
    PropertyAgentAccess: preCounts.PropertyAgentAccess,
  };

  let dbAttempted = false;
  let dbSucceeded = false;
  let dbSkippedEmpty = false;
  let dbError: string | null = null;
  let propertiesDeleted = 0;
  let relatedDeletedActual: typeof relatedDeleted | null = null;

  if (preCounts.Property === 0) {
    dbSkippedEmpty = true;
    messages.push(
      'Property count is already 0 — skipping DB DELETE; storage retry only for authorized keys.',
    );
  } else {
    if (!options.prisma.$transaction || !options.prisma.$executeRawUnsafe) {
      return fail(
        'failed',
        ['Prisma transaction API unavailable. Aborting.'],
        null,
      );
    }
    dbAttempted = true;
    try {
      await options.prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe!(
          `DELETE FROM "Property" WHERE "tenantId" = $1`,
          tenant.id,
        );
      });
      dbSucceeded = true;
      propertiesDeleted = 33;
      relatedDeletedActual = relatedDeleted;
      messages.push(
        'DB DELETE FROM Property completed inside explicit transaction (CASCADE applied).',
      );
    } catch (error) {
      dbError = error instanceof Error ? error.message : String(error);
      errors.push(`DB transaction failed: ${dbError}`);
      const postCounts = await countPropertyTreeByTenant(
        options.prisma,
        tenant.id,
      );
      const report: ExecuteReport = {
        procedureVersion: CLEANUP_PROCEDURE_VERSION,
        mode: 'execute',
        generatedAtUtc: new Date().toISOString(),
        manifestPath: options.manifestPath,
        manifestHashValidated: recomputed,
        approvedHash: options.approvedHash,
        target: options.cleanupTarget,
        tenantSlug: tenant.slug,
        tenantId: tenant.id,
        dbHostMasked: options.dbHostMasked,
        preCountsByTenant: preCounts,
        postCountsByTenant: postCounts,
        dbTransaction: {
          attempted: true,
          succeeded: false,
          skippedAlreadyEmpty: false,
          error: dbError,
          propertiesDeleted: 0,
          relatedDeleted: null,
        },
        allowlistCount: allowlist.length,
        r2Results: [],
        r2DeletedCount: 0,
        r2RequiresRetryCount: 0,
        seedSkippedCount: seedRows.length,
        anomalousSkippedCount: 1,
        deleteObjectAttempts: 0,
        listObjectsUsed: false,
        putObjectUsed: false,
        remoteWrites: { database: false, storage: false },
        finalStatus: 'failed',
        errors,
        note: 'DB transaction failed; no R2 deletes attempted. Confirm rollback via post counts.',
      };
      return fail('failed', messages.concat(errors), report);
    }
  }

  // R2 phase — only exact allowlist literals.
  const r2Results: ExecuteR2ObjectResult[] = [];
  let deleteObjectAttempts = 0;
  for (const storageKey of allowlist) {
    deleteObjectAttempts += 1;
    let deleteOk = false;
    let deleteError: string | null = null;
    try {
      await options.r2Delete.deleteObject(storageKey);
      deleteOk = true;
    } catch (error) {
      deleteError = error instanceof Error ? error.message : String(error);
    }

    let postHeadExists: boolean | null = null;
    let postHeadError: string | null = null;
    try {
      const head = await options.r2Head.headObject(storageKey);
      if (!head.ok) {
        postHeadError = head.error;
        postHeadExists = null;
      } else {
        postHeadExists = head.exists;
      }
    } catch (error) {
      postHeadError = error instanceof Error ? error.message : String(error);
    }

    let outcome: ExecuteR2ObjectResult['outcome'] = 'requires_retry';
    if (deleteOk && postHeadExists === false) {
      outcome = 'storage_deleted';
    } else {
      outcome = 'requires_retry';
      errors.push(
        `R2 requires_retry for key ending ...${storageKey.slice(-24)} (deleteOk=${deleteOk}, postHeadExists=${String(postHeadExists)})`,
      );
    }

    r2Results.push({
      storageKey,
      deleteAttempted: true,
      deleteOk,
      deleteError,
      postHeadExists,
      postHeadError,
      outcome,
    });
  }

  const r2DeletedCount = r2Results.filter(
    (r) => r.outcome === 'storage_deleted',
  ).length;
  const r2RequiresRetryCount = r2Results.filter(
    (r) => r.outcome === 'requires_retry',
  ).length;

  messages.push(
    `R2 phase: deleted=${r2DeletedCount}, requires_retry=${r2RequiresRetryCount}, seed_skipped=${seedRows.length}, upload_nf_skipped=${uploadNotFoundRows.length}, anomalous_skipped=1, DeleteObject attempts=${deleteObjectAttempts}.`,
  );

  const postCounts = await countPropertyTreeByTenant(options.prisma, tenant.id);
  const remainingProps = await loadDemoPropertyIds(options.prisma, tenant.id);
  if (remainingProps.length > 0) {
    errors.push(
      `Unexpected remaining Property rows after execute: ${remainingProps.length}`,
    );
  }

  const dbClean =
    postCounts.Property === 0 &&
    postCounts.PropertyListing === 0 &&
    postCounts.PropertyPrice === 0 &&
    postCounts.PropertyImage === 0 &&
    postCounts.PropertyFeatureAssignment === 0 &&
    postCounts.PropertyAgentAccess === 0;

  let finalStatus: ExecuteReport['finalStatus'] = 'failed';
  if (
    dbClean &&
    r2RequiresRetryCount === 0 &&
    r2DeletedCount === allowlist.length &&
    deleteObjectAttempts === allowlist.length
  ) {
    finalStatus = 'completed';
  } else if (dbClean && r2RequiresRetryCount > 0) {
    finalStatus = 'requires_retry';
  } else {
    finalStatus = 'failed';
  }

  const report: ExecuteReport = {
    procedureVersion: CLEANUP_PROCEDURE_VERSION,
    mode: 'execute',
    generatedAtUtc: new Date().toISOString(),
    manifestPath: options.manifestPath,
    manifestHashValidated: recomputed,
    approvedHash: options.approvedHash,
    target: options.cleanupTarget,
    tenantSlug: tenant.slug,
    tenantId: tenant.id,
    dbHostMasked: options.dbHostMasked,
    preCountsByTenant: preCounts,
    postCountsByTenant: postCounts,
    dbTransaction: {
      attempted: dbAttempted,
      succeeded: dbSucceeded || dbSkippedEmpty,
      skippedAlreadyEmpty: dbSkippedEmpty,
      error: dbError,
      propertiesDeleted: dbSucceeded ? propertiesDeleted : 0,
      relatedDeleted: relatedDeletedActual,
    },
    allowlistCount: allowlist.length,
    r2Results: r2Results.map((r) => ({
      ...r,
      // Keep key for audit of exact allowlist; no signed URLs.
    })),
    r2DeletedCount,
    r2RequiresRetryCount,
    seedSkippedCount: seedRows.length,
    anomalousSkippedCount: 1,
    deleteObjectAttempts,
    listObjectsUsed: false,
    putObjectUsed: false,
    remoteWrites: {
      database: dbSucceeded,
      storage: deleteObjectAttempts > 0,
    },
    finalStatus,
    errors,
    note: 'Execute used approved dry-run manifesto only. Seed not_found, upload not_found, and anomalous keys were not DeleteObject targets. No ListObjects/PutObject.',
  };

  const reportPath = writeExecuteReport(options.reportRoot, report);
  messages.push(`Execute report written (ignored path).`);

  return {
    ok: finalStatus === 'completed',
    finalStatus,
    messages,
    reportPath,
    report,
  };
}

function writeExecuteReport(reportRoot: string, report: ExecuteReport): string {
  const stamp = report.generatedAtUtc.replace(/[:.]/g, '-');
  const dir = path.join(reportRoot, `execute-${stamp}`);
  fs.mkdirSync(dir, { recursive: true });
  const reportPath = path.join(dir, 'execute-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  return reportPath;
}
