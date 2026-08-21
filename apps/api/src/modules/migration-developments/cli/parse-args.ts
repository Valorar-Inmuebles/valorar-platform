import { ALLOWED_MIGRATION_TARGET, IMPORT_CONFIRM_TOKEN } from '../constants';
import type { CliCommand, CliOptions } from '../types';
import {
  assertAllowedTarget,
  assertImportConfirm,
} from '../safety/environment';

const COMMANDS: CliCommand[] = ['audit', 'dry-run', 'preflight', 'import'];

function isCommand(value: string | undefined): value is CliCommand {
  return Boolean(value && COMMANDS.includes(value as CliCommand));
}

export function parseCliArgs(argv: string[]): CliOptions {
  const [command, ...rest] = argv;
  if (!isCommand(command)) {
    throw new Error(
      `Unsupported command "${command ?? ''}". Use audit, dry-run, preflight or import.`,
    );
  }

  const options: CliOptions = { command };
  for (const token of rest) {
    if (token === '--json') {
      options.json = true;
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
  }

  if (command === 'preflight' || command === 'import') {
    const target = assertAllowedTarget(options.target);
    if (!target.ok) {
      throw new Error(target.errors.join(' '));
    }
    options.target = ALLOWED_MIGRATION_TARGET;
  }

  if (command === 'import') {
    const confirm = assertImportConfirm(options.confirm);
    if (!confirm.ok) {
      throw new Error(confirm.errors.join(' '));
    }
    options.confirm = IMPORT_CONFIRM_TOKEN;
  }

  return options;
}
