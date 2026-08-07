import { REQUIRED_CLEANUP_TARGET } from './constants';
import type { SafetyGateResult } from './types';

/** Mask a DB hostname for logs/manifests (never print credentials or full URL). */
export function maskDbHost(host: string): string {
  const trimmed = host.trim();
  if (!trimmed) return '(empty)';
  if (trimmed.length <= 12) {
    return `${trimmed.slice(0, 2)}***${trimmed.slice(-2)}`;
  }
  const parts = trimmed.split('.');
  const first = parts[0];
  if (parts.length >= 2 && first) {
    const maskedFirst =
      first.length <= 6
        ? `${first.slice(0, 2)}***`
        : `${first.slice(0, 4)}***${first.slice(-2)}`;
    return [maskedFirst, '***', ...parts.slice(-2)].join('.');
  }
  return `${trimmed.slice(0, 4)}***${trimmed.slice(-4)}`;
}

export function extractHostnameFromDatabaseUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname || null;
  } catch {
    // URL() may reject some postgres schemes in older engines; fallback.
    const match = url.match(/@([^/?#]+)/);
    if (!match?.[1]) return null;
    const hostPort = match[1];
    const host = hostPort.includes(':')
      ? hostPort.slice(0, hostPort.lastIndexOf(':'))
      : hostPort;
    return host || null;
  }
}

export type SafetyEnv = {
  houzezStagingDatabaseUrl?: string;
  houzezCheckpointDatabaseUrl?: string;
  houzezStagingDbHost?: string;
  houzezCleanupTarget?: string;
  databaseUrl?: string;
};

/**
 * Hard safety gates for cleanup connectivity.
 * Never falls back to DATABASE_URL or HOUZEZ_CHECKPOINT_DATABASE_URL.
 */
export function validateCleanupSafetyEnv(env: SafetyEnv): SafetyGateResult {
  const errors: string[] = [];

  const stagingUrl = env.houzezStagingDatabaseUrl?.trim();
  const checkpointUrl = env.houzezCheckpointDatabaseUrl?.trim();
  const authorizedHost = env.houzezStagingDbHost?.trim();
  const cleanupTarget = env.houzezCleanupTarget?.trim();
  const databaseUrl = env.databaseUrl?.trim();

  if (!stagingUrl) {
    errors.push(
      'HOUZEZ_STAGING_DATABASE_URL is required (no DATABASE_URL fallback).',
    );
  }

  if (!authorizedHost) {
    errors.push(
      'HOUZEZ_STAGING_DB_HOST is required (full authorized staging hostname; must match URL host exactly).',
    );
  }

  if (cleanupTarget !== REQUIRED_CLEANUP_TARGET) {
    errors.push(
      `HOUZEZ_CLEANUP_TARGET must be exactly "${REQUIRED_CLEANUP_TARGET}".`,
    );
  }

  if (
    !stagingUrl ||
    !authorizedHost ||
    cleanupTarget !== REQUIRED_CLEANUP_TARGET
  ) {
    return { ok: false, errors };
  }

  // Refuse if operator accidentally pointed staging URL at the same string as checkpoint.
  if (checkpointUrl && stagingUrl === checkpointUrl) {
    errors.push(
      'HOUZEZ_STAGING_DATABASE_URL must not equal HOUZEZ_CHECKPOINT_DATABASE_URL.',
    );
  }

  // Never treat DATABASE_URL as the target; also refuse if staging was copied from it blindly
  // when they are identical (misconfiguration).
  if (databaseUrl && stagingUrl === databaseUrl) {
    errors.push(
      'HOUZEZ_STAGING_DATABASE_URL must not be identical to DATABASE_URL for this procedure.',
    );
  }

  const urlHost = extractHostnameFromDatabaseUrl(stagingUrl);
  if (!urlHost) {
    errors.push('Could not parse hostname from HOUZEZ_STAGING_DATABASE_URL.');
    return { ok: false, errors };
  }

  if (urlHost.includes('-pooler')) {
    errors.push(
      'Refusing pooled connection: staging host must be direct (no "-pooler").',
    );
  }

  if (authorizedHost.includes('-pooler')) {
    errors.push(
      'HOUZEZ_STAGING_DB_HOST must not contain "-pooler" (direct endpoint required).',
    );
  }

  if (urlHost !== authorizedHost) {
    errors.push(
      `Staging URL host does not match HOUZEZ_STAGING_DB_HOST (masked url=${maskDbHost(urlHost)}, masked allowlist=${maskDbHost(authorizedHost)}).`,
    );
  }

  if (checkpointUrl) {
    const checkpointHost = extractHostnameFromDatabaseUrl(checkpointUrl);
    if (checkpointHost && checkpointHost === urlHost) {
      errors.push(
        'Staging host must differ from checkpoint host (refusing same endpoint).',
      );
    }
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    connectionUrl: stagingUrl,
    dbHost: urlHost,
    dbHostMasked: maskDbHost(urlHost),
  };
}

export function readSafetyEnvFromProcess(
  env: NodeJS.ProcessEnv = process.env,
): SafetyEnv {
  return {
    houzezStagingDatabaseUrl: env.HOUZEZ_STAGING_DATABASE_URL,
    houzezCheckpointDatabaseUrl: env.HOUZEZ_CHECKPOINT_DATABASE_URL,
    houzezStagingDbHost: env.HOUZEZ_STAGING_DB_HOST,
    houzezCleanupTarget: env.HOUZEZ_CLEANUP_TARGET,
    databaseUrl: env.DATABASE_URL,
  };
}
