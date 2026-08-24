import { discoverSourceFolders } from '../discovery/discover-source';
import type { AuditFolderSummary, AuditReport, SourceIssue } from '../types';

export function runAudit(sourcePath: string, tenantId?: string): AuditReport {
  const folders = discoverSourceFolders(sourcePath, tenantId);
  const summaries: AuditFolderSummary[] = folders.map((folder) => {
    const warnings = folder.issues.filter(
      (issue) => issue.severity === 'warning',
    );
    const errors = folder.issues.filter((issue) => issue.severity === 'error');
    const cover = folder.images.find((image) => image.isCover);

    return {
      sourceId: folder.sourceId === '000' ? null : folder.sourceId,
      folderName: folder.folderName,
      publicName: folder.publicNameFromFolder || null,
      txtFile: folder.txtFiles[0]
        ? (folder.txtFiles[0].split(/[/\\]/).pop() ?? null)
        : null,
      imageCount: folder.images.length,
      coverImage: cover?.filename ?? null,
      extensions: [
        ...new Set(folder.images.map((image) => image.extension)),
      ].sort(),
      unexpectedFiles: folder.unexpectedFiles,
      warnings,
      errors,
      valid: errors.length === 0,
    };
  });

  const rollupWarnings: SourceIssue[] = summaries.flatMap(
    (folder) => folder.warnings,
  );
  const rollupErrors: SourceIssue[] = summaries.flatMap(
    (folder) => folder.errors,
  );

  return {
    command: 'audit',
    sourcePath,
    folderCount: summaries.length,
    txtCount: summaries.filter((folder) => folder.txtFile).length,
    imageCount: summaries.reduce((sum, folder) => sum + folder.imageCount, 0),
    coverCount: summaries.filter((folder) => folder.coverImage).length,
    validFolders: summaries.filter((folder) => folder.valid).length,
    invalidFolders: summaries.filter((folder) => !folder.valid).length,
    folders: summaries,
    warnings: rollupWarnings,
    errors: rollupErrors,
    writes: { database: false, storage: false },
  };
}
