/**
 * Developments data migration CLI — audit / dry-run (stage 1).
 *
 * Import, R2 uploads and MigrationSourceRef writes are not authorized yet.
 *
 * Usage (from apps/api):
 *   npm run migration:developments -- audit
 *   npm run migration:developments -- dry-run
 *   npm run migration:developments -- audit --source-path="migration-data/emprendimientos" --json
 *
 * From repo root:
 *   npm run migration:developments -w api -- audit
 */
import { parseCliArgs } from '../src/modules/migration-developments/cli/parse-args';
import {
  exitCodeForAudit,
  exitCodeForDryRun,
  formatAuditReport,
  formatDryRunReport,
} from '../src/modules/migration-developments/cli/format-report';
import { runAudit } from '../src/modules/migration-developments/cli/run-audit';
import { runDryRun } from '../src/modules/migration-developments/cli/run-dry-run';
import { resolveSourcePath } from '../src/modules/migration-developments/path/repo-root';

function printHelp(): void {
  process.stdout.write(`Developments migration (stage 1 — read-only)

Commands:
  audit     Inventory of folders, TXT files and images
  dry-run   Full import plan without database or storage writes

Options:
  --source-path=PATH   Source directory (default: migration-data/emprendimientos)
  --json               Print JSON instead of the text summary
  --tenant-id=ID       Optional tenant id used only in planned storage keys

Import is not available in this stage.
`);
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === 'help' || argv[0] === '--help') {
    printHelp();
    process.exit(0);
  }

  if (argv[0] === 'import') {
    process.stderr.write(
      'The import command is not authorized in this stage. Use audit or dry-run.\n',
    );
    process.exit(1);
  }

  const options = parseCliArgs(argv);
  const sourcePath = resolveSourcePath(options.sourcePath);

  if (options.command === 'audit') {
    const report = runAudit(sourcePath, options.tenantId);
    process.stdout.write(
      options.json
        ? `${JSON.stringify(report, null, 2)}\n`
        : `${formatAuditReport(report)}\n`,
    );
    process.exit(exitCodeForAudit(report));
  }

  const report = runDryRun(sourcePath, { tenantId: options.tenantId });
  process.stdout.write(
    options.json
      ? `${JSON.stringify(report, null, 2)}\n`
      : `${formatDryRunReport(report)}\n`,
  );
  process.exit(exitCodeForDryRun(report));
}

main();
