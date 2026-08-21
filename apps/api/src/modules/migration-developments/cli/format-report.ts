import { CLI_EXIT } from '../constants';
import type {
  AuditReport,
  DryRunReport,
  ImportReport,
  PreflightReport,
} from '../types';

export function exitCodeForAudit(report: AuditReport): number {
  if (report.errors.length > 0 || report.invalidFolders > 0) {
    return CLI_EXIT.blocked;
  }
  if (report.warnings.length > 0) {
    return CLI_EXIT.warnings;
  }
  return CLI_EXIT.ok;
}

export function exitCodeForDryRun(report: DryRunReport): number {
  if (report.blockedCount > 0) {
    return CLI_EXIT.blocked;
  }
  if (report.readyWithWarningsCount > 0) {
    return CLI_EXIT.warnings;
  }
  return CLI_EXIT.ok;
}

export function formatAuditReport(report: AuditReport): string {
  const lines = [
    `Audit — ${report.sourcePath}`,
    `Folders: ${report.folderCount}  TXT: ${report.txtCount}  Images: ${report.imageCount}  Covers: ${report.coverCount}`,
    `Valid: ${report.validFolders}  Invalid: ${report.invalidFolders}`,
    `Writes: database=${report.writes.database} storage=${report.writes.storage}`,
    '',
  ];

  for (const folder of report.folders) {
    const flag = folder.valid ? 'OK' : 'INVALID';
    lines.push(
      `[${flag}] ${folder.sourceId ?? '???'} ${folder.publicName ?? folder.folderName} — images=${folder.imageCount} cover=${folder.coverImage ?? 'none'} txt=${folder.txtFile ?? 'none'}`,
    );
    for (const issue of [...folder.errors, ...folder.warnings]) {
      lines.push(`  - ${issue.severity}: ${issue.code} ${issue.message}`);
    }
  }

  return lines.join('\n');
}

export function formatDryRunReport(report: DryRunReport): string {
  const lines = [
    `Dry-run — ${report.sourcePath}`,
    `sourceSystem=${report.sourceSystem}`,
    `Folders: ${report.folderCount}  TXT: ${report.txtCount}  Images: ${report.imageCount}`,
    `ready=${report.readyCount}  ready_with_warnings=${report.readyWithWarningsCount}  blocked=${report.blockedCount}`,
    `Writes: database=${report.writes.database} storage=${report.writes.storage}`,
    `missingCatalogEntries=${report.missingCatalogEntries.length}`,
    '',
  ];

  if (report.missingCatalogEntries.length > 0) {
    lines.push('Missing catalog entries:');
    for (const entry of report.missingCatalogEntries) {
      lines.push(
        `  - ${entry.model} "${entry.requiredName}" province=${entry.provinceName} slug=${entry.provinceSlug ?? 'n/a'} sourceIds=${entry.sourceIds.join(',')}`,
      );
      lines.push(`    ${entry.officialCreateMechanism}`);
    }
    lines.push('');
  }

  for (const development of report.developments) {
    lines.push(
      `[${development.planStatus}] ${development.sourceId} ${development.title} sortOrder=${development.sortOrder} status=${development.status ?? 'null'} locality=${development.location.localityName ?? 'unresolved'} localitySlug=${development.location.localitySlug ?? 'n/a'} province=${development.location.provinceName ?? 'n/a'} images=${development.gallery.length} features=${development.matchedFeatures.map((feature) => feature.slug).join(',') || 'none'}`,
    );
    if (development.editorialCorrections.length > 0) {
      for (const correction of development.editorialCorrections) {
        lines.push(
          `  correction ${correction.field}: "${correction.original}" → "${correction.normalized}" (${correction.reason})`,
        );
      }
    }
    for (const issue of [
      ...development.blockers,
      ...development.errors,
      ...development.warnings,
    ]) {
      lines.push(
        `  - ${issue.severity}${issue.blocking ? '/blocking' : ''}: ${issue.code} ${issue.message}`,
      );
    }
  }

  return lines.join('\n');
}

export function exitCodeForPreflight(report: PreflightReport): number {
  if (!report.ok || report.blockers.length > 0) {
    return CLI_EXIT.blocked;
  }
  if (report.warnings.length > 0) {
    return CLI_EXIT.warnings;
  }
  return CLI_EXIT.ok;
}

export function exitCodeForImport(report: ImportReport): number {
  if (!report.ok || report.blockers.length > 0 || report.errors > 0) {
    return CLI_EXIT.blocked;
  }
  if (report.warnings > 0) {
    return CLI_EXIT.warnings;
  }
  return CLI_EXIT.ok;
}

export function formatPreflightReport(report: PreflightReport): string {
  const env = report.environment;
  const lines = [
    'Preflight — local-developments-v1',
    `target=${env.target}`,
    `dbHost=${env.dbHostMasked ?? 'n/a'}  dbName=${env.dbName ?? 'n/a'}`,
    `neonProject=${env.neonProjectMasked ?? 'n/a'}  neonBranch=${env.neonBranchMasked ?? 'n/a'}  neonEndpoint=${env.neonEndpointMasked ?? 'n/a'}`,
    `storageBucket=${env.storageBucket ?? 'n/a'}  storageEndpoint=${env.storageEndpointHostMasked ?? 'n/a'}`,
    `tenant=${report.tenant.slug ?? 'n/a'} id=${report.tenant.id ?? 'n/a'} status=${report.tenant.status ?? 'n/a'}`,
    `creator=${report.creator.email ?? 'n/a'} active=${report.creator.isActive ?? 'n/a'} role=${report.creator.role ?? 'n/a'}`,
    `connectivity db=${report.connectivity.database} storage=${report.connectivity.storage}`,
    `planned developments=${report.planned.developments} images=${report.planned.images} covers=${report.planned.covers} blocked=${report.planned.blocked}`,
    `existingSourceRefs=${report.existingSourceRefs} conflicts=${report.conflicts.length}`,
    `migrations applied=${report.migrations.applied.length} pending=${report.migrations.pending.length} failed=${report.migrations.failed.length} unexpected=${report.migrations.unexpected.length} drift=${report.migrations.drift}`,
    `migrationSourceRef=${report.migrations.migrationSourceRefExists} sortOrderColumn=${report.migrations.sortOrderColumnExists}`,
    `geo province=${report.catalog.province ?? 'n/a'} localities=${report.catalog.localityCount}/${report.catalog.requiredLocalities.length}`,
    `features planned=${report.features.planned.length} present=${report.features.present.length} missing=${report.features.missing.length}`,
    `ok=${report.ok}  Writes: database=${report.writes.database} storage=${report.writes.storage}`,
    '',
  ];
  if (report.migrations.pending.length) {
    lines.push(`Pending migrations: ${report.migrations.pending.join(', ')}`);
  }
  if (report.catalog.missingLocalities.length) {
    lines.push(
      `Missing localities: ${report.catalog.missingLocalities.join(', ')}`,
    );
  }
  for (const conflict of report.conflicts) {
    lines.push(
      `  conflict ${conflict.kind}=${conflict.value} sourceId=${conflict.sourceId}`,
    );
  }
  for (const issue of [...report.blockers, ...report.warnings]) {
    lines.push(
      `  - ${issue.blocking ? 'blocker' : 'warning'}: ${issue.code} ${issue.message}`,
    );
  }
  return lines.join('\n');
}

export function formatImportReport(report: ImportReport): string {
  const env = report.environment;
  const lines = [
    'Import — local-developments-v1',
    `target=${env.target}  dbHost=${env.dbHostMasked ?? 'n/a'}  dbName=${env.dbName ?? 'n/a'}  bucket=${env.storageBucket ?? 'n/a'}`,
    `tenant=${report.tenant.slug}  creator=${report.creator.email}  role=${report.creator.role}`,
    `planned=${report.planned} alreadyImported=${report.alreadyImported} created=${report.created} skipped=${report.skipped} conflicts=${report.conflicts} blocked=${report.blocked} errors=${report.errors} warnings=${report.warnings}`,
    `imagesUploaded=${report.imagesUploaded} imagesReused=${report.imagesReused}`,
    `databaseWrites=${report.databaseWrites} storageWrites=${report.storageWrites}`,
    `Writes: database=${report.writes.database} storage=${report.writes.storage}`,
    '',
  ];
  for (const record of report.records) {
    lines.push(
      `[${record.status}] ${record.sourceId} ${record.title} developmentId=${record.developmentId ?? 'n/a'} images=${record.imagesCreated} uploaded=${record.imagesUploaded} reused=${record.imagesReused} features=${record.featuresAssigned} refs=${record.refsCreated}`,
    );
    for (const error of record.errors) {
      lines.push(`  - error: ${error}`);
    }
    if (record.orphanStorageKeys.length) {
      lines.push(
        `  - potential orphan objects: ${record.orphanStorageKeys.length} (not deleted)`,
      );
    }
  }
  for (const issue of report.blockers) {
    lines.push(`  - blocker: ${issue.code} ${issue.message}`);
  }
  return lines.join('\n');
}
