import { DENIED_PRODUCTION_NEON_IDENTITY } from '../../modules/migration-developments/constants';

export type DevelopmentDatabaseTarget = {
  host: string;
  database: string;
  endpoint: string;
};

export type DevelopmentDatabaseSafetyResult =
  | { ok: true; target: DevelopmentDatabaseTarget }
  | { ok: false; errors: string[] };

type DevelopmentDatabaseSafetyInput = {
  databaseUrl?: string | null;
  databaseEnvironment?: string | null;
  nodeEnvironment?: string | null;
  baselineDatabaseUrl?: string | null;
};

function parseDatabaseTarget(
  databaseUrl: string,
): DevelopmentDatabaseTarget | null {
  try {
    const url = new URL(databaseUrl);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
      return null;
    }

    const host = url.hostname.toLowerCase();
    const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
    if (!host || !database || database.includes('/')) {
      return null;
    }

    const firstHostLabel = host.split('.')[0] ?? '';
    const endpoint = firstHostLabel.replace(/-pooler$/i, '');
    if (!endpoint) {
      return null;
    }

    return { host, database, endpoint };
  } catch {
    return null;
  }
}

export function validateDevelopmentDatabaseTarget(
  input: DevelopmentDatabaseSafetyInput,
): DevelopmentDatabaseSafetyResult {
  const errors: string[] = [];
  const databaseUrl = input.databaseUrl?.trim() ?? '';

  if (input.databaseEnvironment?.trim().toLowerCase() !== 'development') {
    errors.push(
      'VALORAR_DATABASE_ENV must be exactly "development" in .env.development.local.',
    );
  }
  if (input.nodeEnvironment?.trim().toLowerCase() !== 'development') {
    errors.push(
      'NODE_ENV must be exactly "development" in .env.development.local.',
    );
  }
  if (!databaseUrl) {
    errors.push('DATABASE_URL is required in .env.development.local.');
  }

  const target = databaseUrl ? parseDatabaseTarget(databaseUrl) : null;
  if (databaseUrl && !target) {
    errors.push(
      'DATABASE_URL must be a valid PostgreSQL URL with a host and database name.',
    );
  }

  if (target) {
    const deniedEndpoint = DENIED_PRODUCTION_NEON_IDENTITY.endpointId;
    if (target.endpoint === deniedEndpoint) {
      errors.push(
        `Refusing protected production endpoint ${deniedEndpoint} (including pooler variants).`,
      );
    }

    const baselineUrl = input.baselineDatabaseUrl?.trim() ?? '';
    const baseline = baselineUrl ? parseDatabaseTarget(baselineUrl) : null;
    if (
      baseline &&
      (target.host === baseline.host || target.endpoint === baseline.endpoint)
    ) {
      errors.push(
        'Development database must use a host and endpoint different from apps/api/.env.',
      );
    }

    if (
      /(?:^|[^a-z0-9])(?:production|prod|staging|preview)(?:[^a-z0-9]|$)/i.test(
        `${target.host} ${target.database}`,
      )
    ) {
      errors.push(
        'Development database host or name contains a forbidden environment marker.',
      );
    }
  }

  return errors.length === 0 && target
    ? { ok: true, target }
    : { ok: false, errors };
}
