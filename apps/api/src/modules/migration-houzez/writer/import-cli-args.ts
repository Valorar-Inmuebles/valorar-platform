import {
  IMPORT_CONFIRM_TARGET,
  IMPORT_CONFIRM_WRITE,
  REQUIRED_MIGRATION_TARGET,
} from '../constants';

export type ImportArgParseResult =
  | {
      ok: true;
      wpId: number;
      tenantSlug: string;
      ownerEmail: string;
      sourceDir: string;
      reportDir: string;
      dryRunReportPath: string;
      confirmTarget: string;
      confirmWrite: string;
      batchId?: string;
      statuses?: string[];
    }
  | { ok: false; errors: string[] };

/**
 * Strict import CLI contract: single --wp-id, no defaults for identity fields,
 * dual confirmations, mandatory dry-run report path. Rejects multi/mass selection.
 */
export function parseImportCliArgs(input: {
  args: Record<string, string | boolean>;
  /** Only used when --source-dir is present validation-wise; caller still supplies resolved path. */
  resolvedSourceDir?: string;
  resolvedReportDir?: string;
}): ImportArgParseResult {
  const errors: string[] = [];
  const { args } = input;

  const rejectedMultiKeys = [
    'wp-ids',
    'all',
    'glob',
    'from-id',
    'to-id',
    'range',
    'status',
    'mass',
    'bulk',
  ];
  for (const key of rejectedMultiKeys) {
    if (key in args) {
      errors.push(
        `Import refuses multi/mass selection flag --${key}. Only a single --wp-id is allowed.`,
      );
    }
  }

  if (args['skip-db']) {
    errors.push('Import refuses --skip-db.');
  }

  if (!args['wp-id'] || args['wp-id'] === true) {
    errors.push('Import requires explicit --wp-id (no default).');
  }
  const wpIdRaw = String(args['wp-id'] ?? '');
  if (
    wpIdRaw.includes(',') ||
    (wpIdRaw.includes('-') && /[0-9]-[0-9]/.test(wpIdRaw))
  ) {
    errors.push(
      'Import refuses multiple or ranged WP ids. Provide a single numeric --wp-id.',
    );
  }
  const wpId = Number(wpIdRaw);
  if (!Number.isFinite(wpId) || !Number.isInteger(wpId) || wpId <= 0) {
    errors.push('Import --wp-id must be a positive integer.');
  }

  if (!args.tenant || args.tenant === true) {
    errors.push('Import requires explicit --tenant (no default).');
  }
  if (!args['owner-email'] || args['owner-email'] === true) {
    errors.push('Import requires explicit --owner-email (no default).');
  }
  if (!args['source-dir'] || args['source-dir'] === true) {
    errors.push('Import requires explicit --source-dir (no default).');
  }
  if (!args['dry-run-report'] || args['dry-run-report'] === true) {
    errors.push(
      'Import requires --dry-run-report pointing at an approved dry-run JSON.',
    );
  }
  if (!args['confirm-target'] || args['confirm-target'] === true) {
    errors.push(`Import requires --confirm-target=${IMPORT_CONFIRM_TARGET}.`);
  } else if (String(args['confirm-target']) !== IMPORT_CONFIRM_TARGET) {
    errors.push(
      `--confirm-target must be exactly "${IMPORT_CONFIRM_TARGET}" (same as ${REQUIRED_MIGRATION_TARGET}).`,
    );
  }
  if (!args['confirm-write'] || args['confirm-write'] === true) {
    errors.push(`Import requires --confirm-write=${IMPORT_CONFIRM_WRITE}.`);
  } else if (String(args['confirm-write']) !== IMPORT_CONFIRM_WRITE) {
    errors.push(`--confirm-write must be exactly "${IMPORT_CONFIRM_WRITE}".`);
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  const sourceDir = String(args['source-dir']);
  const reportDir = args['report-dir']
    ? String(args['report-dir'])
    : (input.resolvedReportDir ?? `${sourceDir}/reports`);

  return {
    ok: true,
    wpId,
    tenantSlug: String(args.tenant),
    ownerEmail: String(args['owner-email']),
    sourceDir,
    reportDir,
    dryRunReportPath: String(args['dry-run-report']),
    confirmTarget: String(args['confirm-target']),
    confirmWrite: String(args['confirm-write']),
    batchId: args['batch-id'] ? String(args['batch-id']) : undefined,
    statuses: args.statuses
      ? String(args.statuses)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : ['publish'],
  };
}
