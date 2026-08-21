import { discoverSourceFolders } from '../discovery/discover-source';
import type { OfflineGeoCatalog } from '../catalog/caba-geo-catalog';
import { planDevelopment } from '../planning/plan-development';
import type { DryRunReport, MissingCatalogEntry } from '../types';

function collectMissingCatalogEntries(
  developments: ReturnType<typeof planDevelopment>[],
): MissingCatalogEntry[] {
  const grouped = new Map<string, MissingCatalogEntry>();

  for (const development of developments) {
    if (!development.catalogGap) {
      continue;
    }
    const gap = development.catalogGap;
    const key = `${gap.model}:${gap.provinceName}:${gap.requiredName}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.sourceIds.push(development.sourceId);
      continue;
    }
    grouped.set(key, {
      ...gap,
      sourceIds: [development.sourceId],
    });
  }

  return [...grouped.values()].sort((left, right) =>
    left.requiredName.localeCompare(right.requiredName, 'es'),
  );
}

export function runDryRun(
  sourcePath: string,
  options: {
    now?: Date;
    tenantId?: string;
    geoCatalog?: OfflineGeoCatalog;
  } = {},
): DryRunReport {
  const folders = discoverSourceFolders(sourcePath, options.tenantId);
  const developments = folders.map((folder) =>
    planDevelopment(folder, {
      now: options.now,
      tenantId: options.tenantId,
      geoCatalog: options.geoCatalog,
    }),
  );

  return {
    command: 'dry-run',
    sourcePath,
    sourceSystem: 'local-developments-v1',
    folderCount: developments.length,
    txtCount: folders.filter((folder) => folder.txtFiles.length > 0).length,
    imageCount: developments.reduce(
      (sum, development) => sum + development.gallery.length,
      0,
    ),
    readyCount: developments.filter((item) => item.planStatus === 'ready')
      .length,
    readyWithWarningsCount: developments.filter(
      (item) => item.planStatus === 'ready_with_warnings',
    ).length,
    blockedCount: developments.filter((item) => item.planStatus === 'blocked')
      .length,
    developments,
    missingCatalogEntries: collectMissingCatalogEntries(developments),
    writes: { database: false, storage: false },
  };
}
