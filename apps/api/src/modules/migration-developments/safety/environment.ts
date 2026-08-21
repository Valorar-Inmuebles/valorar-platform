import {
  ALLOWED_MIGRATION_TARGET,
  DENIED_PRODUCTION_NEON_IDENTITY,
  FORBIDDEN_MIGRATION_TARGETS,
  IMPORT_CONFIRM_TOKEN,
} from '../constants';
import type { GateIssue, SanitizedEnvironment } from '../types';
import {
  extractDatabaseName,
  extractHostname,
  hasDevelopmentToken,
  hasForbiddenEnvironmentToken,
  maskHost,
} from './db-host';

export type NeonIdentity = {
  projectId: string | null;
  branchId: string | null;
  endpointId: string | null;
};

export type EnvironmentInput = {
  target?: string | null;
  confirm?: string | null;
  requireConfirm: boolean;
  databaseUrl?: string | null;
  storageBucket?: string | null;
  storageEndpoint?: string | null;
  storagePublicUrl?: string | null;
  neon?: NeonIdentity | null;
  allowedDbHost?: string | null;
  allowedStorageBucket?: string | null;
};

export type EnvironmentGateResult =
  | {
      ok: true;
      environment: SanitizedEnvironment;
      connectionUrl: string;
      warnings: GateIssue[];
    }
  | {
      ok: false;
      environment: SanitizedEnvironment;
      blockers: GateIssue[];
      warnings: GateIssue[];
    };

function emptyEnvironment(target: string): SanitizedEnvironment {
  return {
    target,
    dbHostMasked: null,
    dbName: null,
    neonProjectMasked: null,
    neonBranchMasked: null,
    neonEndpointMasked: null,
    storageBucket: null,
    storageEndpointHostMasked: null,
  };
}

export function assertAllowedTarget(target: string | undefined | null): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const value = target?.trim() ?? '';
  if (!value) {
    errors.push(
      `Import/preflight requires --target=${ALLOWED_MIGRATION_TARGET}.`,
    );
    return { ok: false, errors };
  }
  const normalized = value.toLowerCase();
  if (
    (FORBIDDEN_MIGRATION_TARGETS as readonly string[]).includes(normalized) ||
    normalized !== ALLOWED_MIGRATION_TARGET
  ) {
    errors.push(
      `Refusing target. Only --target=${ALLOWED_MIGRATION_TARGET} is allowed. production, prod, staging and preview are forbidden.`,
    );
  }
  return { ok: errors.length === 0, errors };
}

export function assertImportConfirm(confirm: string | undefined | null): {
  ok: boolean;
  errors: string[];
} {
  const value = confirm?.trim() ?? '';
  if (!value) {
    return {
      ok: false,
      errors: [`Import requires --confirm=${IMPORT_CONFIRM_TOKEN}.`],
    };
  }
  if (value !== IMPORT_CONFIRM_TOKEN) {
    return {
      ok: false,
      errors: [
        `Import confirmation token does not match --confirm=${IMPORT_CONFIRM_TOKEN}.`,
      ],
    };
  }
  return { ok: true, errors: [] };
}

function matchesDeniedProduction(
  neon: NeonIdentity | null | undefined,
): boolean {
  if (!neon?.projectId || !neon.branchId || !neon.endpointId) {
    return false;
  }
  return (
    neon.projectId === DENIED_PRODUCTION_NEON_IDENTITY.projectId &&
    neon.branchId === DENIED_PRODUCTION_NEON_IDENTITY.branchId &&
    neon.endpointId === DENIED_PRODUCTION_NEON_IDENTITY.endpointId
  );
}

function developmentSignal(input: {
  dbHost: string | null;
  dbName: string | null;
  bucket: string | null;
  neon: NeonIdentity | null;
  allowedDbHost?: string | null;
  allowedStorageBucket?: string | null;
}): boolean {
  const host = input.dbHost ?? '';
  const dbName = input.dbName ?? '';
  const bucket = input.bucket ?? '';
  const neonHaystack = [
    input.neon?.projectId,
    input.neon?.branchId,
    input.neon?.endpointId,
  ]
    .filter(Boolean)
    .join(' ');

  if (hasDevelopmentToken(host) || hasDevelopmentToken(dbName)) {
    return true;
  }
  if (hasDevelopmentToken(bucket)) {
    return true;
  }
  if (hasDevelopmentToken(neonHaystack)) {
    return true;
  }

  const allowedHost = input.allowedDbHost?.trim();
  const allowedBucket = input.allowedStorageBucket?.trim();
  if (
    allowedHost &&
    allowedBucket &&
    input.dbHost === allowedHost &&
    input.bucket === allowedBucket &&
    !hasForbiddenEnvironmentToken(allowedHost) &&
    !hasForbiddenEnvironmentToken(allowedBucket)
  ) {
    return true;
  }

  return false;
}

export function validateDevelopmentEnvironment(
  input: EnvironmentInput,
): EnvironmentGateResult {
  const blockers: GateIssue[] = [];
  const warnings: GateIssue[] = [];
  const targetResult = assertAllowedTarget(input.target);
  const target = input.target?.trim() || ALLOWED_MIGRATION_TARGET;
  const environment = emptyEnvironment(
    targetResult.ok ? ALLOWED_MIGRATION_TARGET : target,
  );

  for (const message of targetResult.errors) {
    blockers.push({ code: 'TARGET_NOT_DEVELOPMENT', message, blocking: true });
  }

  if (input.requireConfirm) {
    const confirmResult = assertImportConfirm(input.confirm);
    for (const message of confirmResult.errors) {
      blockers.push({
        code: 'IMPORT_CONFIRM_REQUIRED',
        message,
        blocking: true,
      });
    }
  }

  const databaseUrl = input.databaseUrl?.trim() ?? '';
  if (!databaseUrl) {
    blockers.push({
      code: 'DATABASE_URL_MISSING',
      message:
        'DATABASE_URL is required and must point at the development database.',
      blocking: true,
    });
  } else {
    const host = extractHostname(databaseUrl);
    const dbName = extractDatabaseName(databaseUrl);
    environment.dbHostMasked = maskHost(host);
    environment.dbName = dbName;
    if (!host) {
      blockers.push({
        code: 'DATABASE_HOST_UNPARSEABLE',
        message: 'Could not parse a hostname from DATABASE_URL.',
        blocking: true,
      });
    } else if (
      hasForbiddenEnvironmentToken(host) ||
      hasForbiddenEnvironmentToken(dbName ?? '')
    ) {
      blockers.push({
        code: 'DATABASE_NOT_DEVELOPMENT',
        message:
          'Database host or name looks like production, prod, staging or preview.',
        blocking: true,
      });
    }
  }

  const bucket = input.storageBucket?.trim() ?? '';
  const endpoint = input.storageEndpoint?.trim() ?? '';
  environment.storageBucket = bucket || null;
  environment.storageEndpointHostMasked = endpoint
    ? maskHost(extractHostname(endpoint) ?? endpoint)
    : null;

  if (!bucket || !endpoint) {
    blockers.push({
      code: 'STORAGE_NOT_CONFIGURED',
      message:
        'Storage is not configured. Set STORAGE_BUCKET and STORAGE_ENDPOINT for the development bucket.',
      blocking: true,
    });
  } else if (hasForbiddenEnvironmentToken(bucket)) {
    blockers.push({
      code: 'STORAGE_NOT_DEVELOPMENT',
      message:
        'Storage bucket name looks like production, prod, staging or preview.',
      blocking: true,
    });
  }

  if (input.storagePublicUrl?.trim()) {
    const publicHost = extractHostname(input.storagePublicUrl);
    // r2.dev is Cloudflare's public bucket hostname and is not an environment signal.
    if (
      publicHost &&
      hasForbiddenEnvironmentToken(publicHost) &&
      !/\.r2\.dev$/i.test(publicHost)
    ) {
      blockers.push({
        code: 'STORAGE_PUBLIC_NOT_DEVELOPMENT',
        message:
          'Storage public URL host looks like production, prod, staging or preview.',
        blocking: true,
      });
    }
  }

  const neon = input.neon ?? null;
  environment.neonProjectMasked = maskHost(neon?.projectId);
  environment.neonBranchMasked = maskHost(neon?.branchId);
  environment.neonEndpointMasked = maskHost(neon?.endpointId);

  const dbHost = databaseUrl ? extractHostname(databaseUrl) : null;
  const dbName = databaseUrl ? extractDatabaseName(databaseUrl) : null;

  if (dbHost?.toLowerCase().includes('neon.tech')) {
    if (!neon?.projectId || !neon.branchId || !neon.endpointId) {
      blockers.push({
        code: 'NEON_IDENTITY_INCOMPLETE',
        message:
          'Neon identity GUCs are incomplete on this connection. Refusing writes until project/branch/endpoint can be verified.',
        blocking: true,
      });
    }
  }

  if (matchesDeniedProduction(neon)) {
    blockers.push({
      code: 'NEON_PRODUCTION_IDENTITY',
      message:
        'Live Neon identity matches the audited production project/branch/endpoint. Refusing writes.',
      blocking: true,
    });
  }

  if (
    blockers.length === 0 &&
    !developmentSignal({
      dbHost,
      dbName,
      bucket,
      neon,
      allowedDbHost: input.allowedDbHost,
      allowedStorageBucket: input.allowedStorageBucket,
    })
  ) {
    blockers.push({
      code: 'DEVELOPMENT_IDENTITY_UNPROVEN',
      message:
        'Could not prove that database and storage belong to development. Provide a development-named host/bucket or matching DEVELOPMENTS_DEV_DB_HOST and DEVELOPMENTS_DEV_STORAGE_BUCKET allowlists.',
      blocking: true,
    });
  }

  if (blockers.length) {
    return { ok: false, environment, blockers, warnings };
  }

  return {
    ok: true,
    environment,
    connectionUrl: databaseUrl,
    warnings,
  };
}
