import { CLI_EXIT } from '../constants';
import type { AuditReport, DryRunReport } from '../types';

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
