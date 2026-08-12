import { HOUZEZ_DATASET_MANIFEST_ID, HOUZEZ_SOURCE_SYSTEM } from '../constants';
import type { DryRunReport } from '../types';
import { computeDryRunFingerprint } from './dry-run-fingerprint';
import { loadBundledDatasetManifest } from '../dataset/validate-dataset-manifest';

export type DryRunReportValidation =
  | { ok: true; report: DryRunReport; fingerprint: string }
  | { ok: false; errors: string[] };

/**
 * Bind import to an approved dry-run report.
 * Recalculates fingerprint and checks identity / safety fields.
 */
export function validateDryRunReportForImport(input: {
  report: DryRunReport;
  wpId: number;
  tenantSlug: string;
  ownerEmail: string;
  /** Current CLI/env migration target — must match the report. */
  migrationTarget: string;
}): DryRunReportValidation {
  const errors: string[] = [];
  const { report } = input;

  if (report.mode !== 'dry-run') {
    errors.push(
      `Dry-run report mode must be "dry-run" (got "${String(report.mode)}").`,
    );
  }
  if (report.wouldWrite !== false) {
    errors.push('Dry-run report must have wouldWrite=false.');
  }
  if (report.wpId !== input.wpId) {
    errors.push(
      `Dry-run report wpId=${report.wpId} does not match --wp-id=${input.wpId}.`,
    );
  }
  if (report.sourceSystem !== HOUZEZ_SOURCE_SYSTEM) {
    errors.push(
      `Dry-run report sourceSystem must be "${HOUZEZ_SOURCE_SYSTEM}".`,
    );
  }
  if (report.tenantSlug !== input.tenantSlug) {
    errors.push(
      `Dry-run report tenantSlug="${report.tenantSlug}" does not match --tenant=${input.tenantSlug}.`,
    );
  }
  if (report.ownerEmail !== input.ownerEmail) {
    errors.push(`Dry-run report ownerEmail does not match --owner-email.`);
  }
  if (report.owner.email && report.owner.email !== input.ownerEmail) {
    errors.push('Dry-run report owner.email does not match --owner-email.');
  }
  if (report.owner.tenantSlug && report.owner.tenantSlug !== input.tenantSlug) {
    errors.push('Dry-run report owner.tenantSlug does not match --tenant.');
  }

  const reportTarget = report.safety?.migrationTarget ?? null;
  if (!reportTarget) {
    errors.push(
      'Dry-run report is missing safety.migrationTarget (staging reports without a target cannot authorize production import).',
    );
  } else if (reportTarget !== input.migrationTarget) {
    errors.push(
      `Dry-run report target "${reportTarget}" does not match current migration target "${input.migrationTarget}". Cross-target import refused.`,
    );
  }

  if (!report.datasetManifest?.ok) {
    errors.push('Dry-run report datasetManifest.ok must be true.');
  }
  if (report.datasetManifest?.manifestId !== HOUZEZ_DATASET_MANIFEST_ID) {
    errors.push(
      `Dry-run report manifestId must be "${HOUZEZ_DATASET_MANIFEST_ID}".`,
    );
  }

  const bundled = loadBundledDatasetManifest();
  const digests = report.datasetManifest?.fragmentDigests;
  if (!digests?.length) {
    errors.push('Dry-run report is missing datasetManifest.fragmentDigests.');
  } else {
    for (const expected of bundled.fragments) {
      const found = digests.find((d) => d.fileName === expected.fileName);
      if (!found) {
        errors.push(`Missing fragment digest for ${expected.fileName}.`);
        continue;
      }
      if (found.sha256.toLowerCase() !== expected.sha256.toLowerCase()) {
        errors.push(`Fragment digest mismatch for ${expected.fileName}.`);
      }
      if (found.bytes !== expected.bytes) {
        errors.push(`Fragment bytes mismatch for ${expected.fileName}.`);
      }
    }
  }

  const pilotBlockers = report.preflight?.pilotBlockers ?? [];
  if (pilotBlockers.length > 0) {
    errors.push(
      `Dry-run report has pilotBlockers=${JSON.stringify(pilotBlockers.map((b) => b.code))}; import requires [].`,
    );
  }
  if ((report.blockers ?? []).length > 0) {
    errors.push(
      `Dry-run report has blockers=${JSON.stringify(report.blockers.map((b) => b.code))}; import requires [].`,
    );
  }

  if (
    !report.reportFingerprint ||
    typeof report.reportFingerprint !== 'string'
  ) {
    errors.push('Dry-run report is missing reportFingerprint.');
  } else {
    const recalculated = computeDryRunFingerprint(report);
    if (recalculated !== report.reportFingerprint) {
      errors.push(
        'Dry-run report fingerprint mismatch — report appears altered or incompatible.',
      );
    }
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    report,
    fingerprint: report.reportFingerprint,
  };
}
