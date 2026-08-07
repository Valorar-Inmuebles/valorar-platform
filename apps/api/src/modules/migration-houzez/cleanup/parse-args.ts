import type { CleanupMode, ParsedCleanupArgs } from './types';

/**
 * Parse CLI argv after the script name.
 * Safe by default: without --dry-run or --execute, mode is null (no remote writes).
 */
export function parseCleanupArgs(argv: string[]): ParsedCleanupArgs {
  const known = new Set([
    'dry-run',
    'execute',
    'tenant',
    'confirm-token',
    'manifest',
    'approved-hash',
    'allow-anomalous-key',
    'help',
  ]);

  const flags: Record<string, string | boolean> = {};
  const unknownFlags: string[] = [];

  for (const token of argv) {
    if (!token.startsWith('--')) {
      unknownFlags.push(token);
      continue;
    }
    const body = token.slice(2);
    const eq = body.indexOf('=');
    const key = eq === -1 ? body : body.slice(0, eq);
    const value = eq === -1 ? true : body.slice(eq + 1);

    if (!known.has(key)) {
      unknownFlags.push(token);
      continue;
    }
    flags[key] = value;
  }

  const dryRun = Boolean(flags['dry-run']);
  const execute = Boolean(flags.execute);

  let mode: CleanupMode | null = null;
  if (dryRun && execute) {
    mode = null;
  } else if (dryRun) {
    mode = 'dry-run';
  } else if (execute) {
    mode = 'execute';
  }

  const tenantRaw = flags.tenant;
  const tenantSlug =
    typeof tenantRaw === 'string' && tenantRaw.trim() ? tenantRaw.trim() : null;

  const tokenRaw = flags['confirm-token'];
  const confirmToken =
    typeof tokenRaw === 'string' && tokenRaw.trim() ? tokenRaw.trim() : null;

  const manifestRaw = flags.manifest;
  const manifestPath =
    typeof manifestRaw === 'string' && manifestRaw.trim()
      ? manifestRaw.trim()
      : null;

  const hashRaw = flags['approved-hash'];
  const approvedHash =
    typeof hashRaw === 'string' && hashRaw.trim() ? hashRaw.trim() : null;

  return {
    mode: dryRun && execute ? null : mode,
    tenantSlug,
    confirmToken,
    manifestPath,
    approvedHash,
    allowAnomalousKey: Boolean(flags['allow-anomalous-key']),
    help: Boolean(flags.help),
    unknownFlags:
      dryRun && execute
        ? [...unknownFlags, '--dry-run+--execute']
        : unknownFlags,
  };
}

export type ModeValidation =
  | { ok: true; mode: CleanupMode }
  | { ok: false; errors: string[] };

export function validateCleanupModeAndTenant(
  args: ParsedCleanupArgs,
): ModeValidation {
  const errors: string[] = [];

  if (args.help) {
    return { ok: false, errors: ['help'] };
  }

  if (args.unknownFlags.length) {
    errors.push(`Unknown or invalid flags: ${args.unknownFlags.join(', ')}`);
  }

  if (!args.mode) {
    errors.push(
      'Refuse to run: specify exactly one of --dry-run or --execute. Default is no-op (safe).',
    );
  }

  if (!args.tenantSlug) {
    errors.push('Missing required --tenant=<slug> (only demo is allowed).');
  } else if (args.tenantSlug !== 'demo') {
    errors.push(
      `Tenant "${args.tenantSlug}" rejected. This version only allows --tenant=demo.`,
    );
  }

  if (args.mode === 'execute') {
    if (args.confirmToken !== 'DELETE-DEMO-PROPERTIES-STAGING') {
      errors.push(
        'Execute requires --confirm-token=DELETE-DEMO-PROPERTIES-STAGING.',
      );
    }
    if (!args.manifestPath) {
      errors.push(
        'Execute requires --manifest=<path-to-approved-dry-run-manifest.json>.',
      );
    }
    if (!args.approvedHash || !/^[a-f0-9]{64}$/i.test(args.approvedHash)) {
      errors.push(
        'Execute requires --approved-hash=<64-hex sha256 of approved manifest>.',
      );
    }
  }

  if (args.allowAnomalousKey) {
    errors.push(
      '--allow-anomalous-key is not enabled in this version. Anomalous keys remain blocked.',
    );
  }

  if (errors.length || !args.mode) {
    return { ok: false, errors };
  }

  return { ok: true, mode: args.mode };
}
