import type { CliCommand, CliOptions } from '../types';
import {
  assertAllowedTarget,
  assertCleanupConfirm,
  assertImportConfirm,
  expectedCleanupConfirmToken,
  expectedImportConfirmToken,
} from '../safety/environment';

const COMMANDS: CliCommand[] = [
  'audit',
  'dry-run',
  'preflight',
  'import',
  'cleanup',
];

function isCommand(value: string | undefined): value is CliCommand {
  return Boolean(value && COMMANDS.includes(value as CliCommand));
}

export function parseCliArgs(argv: string[]): CliOptions {
  const [command, ...rest] = argv;
  if (!isCommand(command)) {
    throw new Error(
      `Unsupported command "${command ?? ''}". Use audit, dry-run, preflight, import or cleanup.`,
    );
  }

  const options: CliOptions = { command };
  for (const token of rest) {
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (token === '--execute') {
      options.execute = true;
      continue;
    }
    if (!token.startsWith('--')) {
      continue;
    }
    const body = token.slice(2);
    const eq = body.indexOf('=');
    const key = eq === -1 ? body : body.slice(0, eq);
    const value = eq === -1 ? 'true' : body.slice(eq + 1);
    if (key === 'source-path') options.sourcePath = value;
    if (key === 'tenant-id') options.tenantId = value;
    if (key === 'tenant') options.tenant = value;
    if (key === 'created-by') options.createdBy = value;
    if (key === 'target') options.target = value;
    if (key === 'confirm') options.confirm = value;
    if (key === 'dry-run') options.dryRun = value !== 'false';
    if (key === 'execute') options.execute = value !== 'false';
  }

  if (
    command === 'preflight' ||
    command === 'import' ||
    command === 'cleanup'
  ) {
    const target = assertAllowedTarget(options.target);
    if (!target.ok) {
      throw new Error(target.errors.join(' '));
    }
    options.target = target.target;
  }

  if (command === 'import') {
    const confirm = assertImportConfirm(options.confirm, options.target);
    if (!confirm.ok) {
      throw new Error(confirm.errors.join(' '));
    }
    options.confirm = expectedImportConfirmToken(options.target);
  }

  if (command === 'cleanup') {
    if (options.dryRun && options.execute) {
      throw new Error('Cleanup cannot combine --dry-run and --execute.');
    }
    if (!options.dryRun && !options.execute) {
      throw new Error(
        'Cleanup requires --dry-run or --execute with an explicit confirm token.',
      );
    }
    if (options.execute) {
      const confirm = assertCleanupConfirm(options.confirm, options.target);
      if (!confirm.ok) {
        throw new Error(confirm.errors.join(' '));
      }
      options.confirm = expectedCleanupConfirmToken(options.target);
    }
  }

  return options;
}
