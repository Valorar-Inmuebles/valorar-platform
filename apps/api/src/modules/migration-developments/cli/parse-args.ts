import type { CliOptions } from '../types';

export function parseCliArgs(argv: string[]): CliOptions {
  const [command, ...rest] = argv;
  if (command !== 'audit' && command !== 'dry-run') {
    throw new Error(
      `Unsupported command "${command ?? ''}". Use audit or dry-run. The import command is not authorized in this stage.`,
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
    if (key === 'source-path') {
      options.sourcePath = value;
    }
    if (key === 'tenant-id') {
      options.tenantId = value;
    }
  }

  return options;
}
