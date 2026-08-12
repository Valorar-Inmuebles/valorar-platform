import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  classifyPropertyImage,
  evaluateCleanupSemantics,
  extractPublicUrlHost,
} from './classify';
import {
  CLEANUP_PROCEDURE_VERSION,
  EXPECTED_DEMO_COUNTS,
  EXPECTED_STORAGE_POLICY,
  PROPERTY_TREE_CASCADE_COVERAGE,
} from './constants';
import {
  countPropertyTreeByTenant,
  loadDemoPropertyImages,
  resolveExactDemoTenant,
  type CleanupPrisma,
} from './db';
import {
  computeManifestStableHash,
  diffExpectedCounts,
  summarizeStatuses,
} from './manifest';
import type { CleanupR2Reader } from './r2-verify';
import { getStorageConfig } from '../../storage/storage.config';
import type {
  CleanupManifest,
  CleanupSemantics,
  PropertyImageManifestRow,
  TenantCounts,
} from './types';

export type DryRunResult = {
  /** Legacy aggregate — see manifest.ok / semantics for precise meaning. */
  ok: boolean;
  semantics: CleanupSemantics;
  outputDir: string;
  manifestPath: string;
  reportPath: string;
  manifest: CleanupManifest;
  countDiffs: string[];
  authorizedDeleteCount: number;
  classificationSummary: Record<string, number>;
  r2Summary: {
    headObjectChecksPerformed: number;
    existing: number;
    expectedSeedNotFound: number;
    unexpectedNotFound: number;
    anomalous: number;
    accessOrNetworkFailures: number;
    authorizedForDelete: number;
    excludedFromDelete: number;
    fatalErrors: string[];
    deleteObjectExecuted: 0;
  };
  anomalousKey: PropertyImageManifestRow | null;
};

export async function runCleanupDryRun(options: {
  prisma: CleanupPrisma;
  r2: CleanupR2Reader;
  tenantSlug: string;
  dbHostMasked: string;
  backupsRoot: string;
  expectedCounts?: TenantCounts;
}): Promise<DryRunResult> {
  const expected = options.expectedCounts ?? { ...EXPECTED_DEMO_COUNTS };
  const tenant = await resolveExactDemoTenant(
    options.prisma,
    options.tenantSlug,
  );
  const preCountsByTenant = await countPropertyTreeByTenant(
    options.prisma,
    tenant.id,
  );
  const countDiffs = diffExpectedCounts(preCountsByTenant, expected);

  const publicUrlHost = extractPublicUrlHost(getStorageConfig().publicUrl);
  const imagesRaw = await loadDemoPropertyImages(options.prisma, tenant.id);
  const rows: PropertyImageManifestRow[] = [];
  const fatalErrors: string[] = [];

  for (const image of imagesRaw) {
    const head = await options.r2.headObject(image.storageKey);
    if (!head.ok && head.fatal) {
      fatalErrors.push(`${image.storageKey}: ${head.error}`);
    }
    rows.push(
      classifyPropertyImage({
        image,
        tenantSlug: tenant.slug,
        tenantId: tenant.id,
        publicUrlHost,
        head,
      }),
    );
  }

  const evaluation = evaluateCleanupSemantics({
    countDiffs,
    images: rows,
    headObjectChecksPerformed: rows.length,
    fatalHeadErrors: fatalErrors,
  });

  const uniqueKeys = new Set(rows.map((r) => r.storageKey));
  const anomalous = rows.filter((r) => r.isAnomalousKey);
  const statusSummary = summarizeStatuses(rows);
  const stableHash = computeManifestStableHash(rows);

  const errorSummary: string[] = [...countDiffs, ...fatalErrors];
  if (!evaluation.storagePolicySatisfied) {
    errorSummary.push(
      `Storage policy not satisfied (expected r2=${EXPECTED_STORAGE_POLICY.r2ObjectsAuthorized}, seed_nf=${EXPECTED_STORAGE_POLICY.expectedSeedNotFound}, upload_nf=${EXPECTED_STORAGE_POLICY.expectedUploadNotFound}, anomalous=${EXPECTED_STORAGE_POLICY.anomalousBlocked}, unexpected_nf=${EXPECTED_STORAGE_POLICY.unexpectedNotFound}).`,
    );
  }

  const generatedAtUtc = new Date().toISOString();
  const stamp = generatedAtUtc.replace(/[:.]/g, '-');
  const outputDir = path.join(options.backupsRoot, stamp);
  fs.mkdirSync(outputDir, { recursive: true });

  const semantics: CleanupSemantics = {
    dryRunCompleted: evaluation.dryRunCompleted,
    databaseCountsMatch: evaluation.databaseCountsMatch,
    storageChecksCompleted: evaluation.storageChecksCompleted,
    storagePolicySatisfied: evaluation.storagePolicySatisfied,
    readyForExecute: evaluation.readyForExecute,
    remoteWrites: { database: false, storage: false },
  };

  const existingCount = evaluation.classificationSummary.r2_object ?? 0;
  const expectedSeedNotFoundCount =
    evaluation.classificationSummary.expected_seed_not_found ?? 0;
  const expectedUploadNotFoundCount =
    evaluation.classificationSummary.expected_upload_not_found ?? 0;
  const unexpectedNotFoundCount =
    evaluation.classificationSummary.unexpected_not_found ?? 0;
  const anomalousCount = evaluation.classificationSummary.anomalous ?? 0;
  const accessOrNetworkFailureCount =
    evaluation.classificationSummary.access_or_network_failure ?? 0;
  const authorizedDeleteCount = evaluation.authorizedKeys.length;
  const excludedFromDeleteCount = rows.length - authorizedDeleteCount;

  const manifest: CleanupManifest = {
    procedureVersion: CLEANUP_PROCEDURE_VERSION,
    mode: 'dry-run',
    generatedAtUtc,
    tenantSlug: tenant.slug,
    tenantId: tenant.id,
    dbHostMasked: options.dbHostMasked,
    preCountsByTenant,
    imageRecordCount: rows.length,
    storageKeyCount: rows.length,
    uniqueStorageKeyCount: uniqueKeys.size,
    headObjectChecksPerformed: rows.length,
    classificationSummary: evaluation.classificationSummary,
    statusSummary,
    existingCount,
    expectedSeedNotFoundCount,
    expectedUploadNotFoundCount,
    unexpectedNotFoundCount,
    anomalousCount,
    accessOrNetworkFailureCount,
    authorizedDeleteCount,
    excludedFromDeleteCount,
    semantics,
    ok: evaluation.ok,
    stableHash,
    errorSummary,
    cascadeCoverage: PROPERTY_TREE_CASCADE_COVERAGE,
    images: rows,
  };

  const manifestPath = path.join(outputDir, 'manifest.json');
  const reportPath = path.join(outputDir, 'report.json');

  const report = {
    procedureVersion: CLEANUP_PROCEDURE_VERSION,
    mode: 'dry-run' as const,
    generatedAtUtc,
    tenantSlug: tenant.slug,
    tenantId: tenant.id,
    dbHostMasked: options.dbHostMasked,
    ok: evaluation.ok,
    okMeaning:
      'ok is true only when dryRunCompleted && databaseCountsMatch && storageChecksCompleted && storagePolicySatisfied. It does not authorize execute by itself.',
    semantics,
    readyForExecuteNote:
      'readyForExecute=true is a technical manifest readiness signal only. Still requires --execute, confirm token, host/target gates, hash validation, and manual owner authorization.',
    remoteWrites: semantics.remoteWrites,
    cascadeCoverage: PROPERTY_TREE_CASCADE_COVERAGE,
    preCountsByTenant,
    expectedCounts: expected,
    countDiffs,
    expectedStoragePolicy: EXPECTED_STORAGE_POLICY,
    classificationSummary: evaluation.classificationSummary,
    statusSummary,
    imageRecordCount: rows.length,
    uniqueStorageKeyCount: uniqueKeys.size,
    headObjectChecksPerformed: rows.length,
    existingCount,
    expectedSeedNotFoundCount,
    expectedUploadNotFoundCount,
    unexpectedNotFoundCount,
    anomalousCount,
    accessOrNetworkFailureCount,
    authorizedDeleteCount,
    excludedFromDeleteCount,
    deleteObjectExecuted: 0,
    stableHash,
    errorSummary,
    anomalousKey: anomalous[0]
      ? {
          storageKey: anomalous[0].storageKey,
          classification: anomalous[0].classification,
          status: anomalous[0].status,
          isAnomalousKey: true,
          deleteAuthorized: false,
          r2Exists: anomalous[0].r2.exists,
          etagPresent: Boolean(anomalous[0].r2.etag),
          authorizationReason: anomalous[0].authorizationReason,
        }
      : null,
    note: 'Dry-run performed read-only DB queries and HeadObject checks only. No DELETE/UPDATE/INSERT/DDL and no DeleteObject/PutObject.',
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  return {
    ok: evaluation.ok,
    semantics,
    outputDir,
    manifestPath,
    reportPath,
    manifest,
    countDiffs,
    authorizedDeleteCount,
    classificationSummary: evaluation.classificationSummary,
    r2Summary: {
      headObjectChecksPerformed: rows.length,
      existing: existingCount,
      expectedSeedNotFound: expectedSeedNotFoundCount,
      unexpectedNotFound: unexpectedNotFoundCount,
      anomalous: anomalousCount,
      accessOrNetworkFailures: accessOrNetworkFailureCount,
      authorizedForDelete: authorizedDeleteCount,
      excludedFromDelete: excludedFromDeleteCount,
      fatalErrors,
      deleteObjectExecuted: 0,
    },
    anomalousKey: anomalous[0] ?? null,
  };
}
