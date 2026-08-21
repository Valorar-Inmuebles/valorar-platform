import {
  ALLOWED_MIGRATION_TARGET,
  ALLOWED_MIGRATION_TARGETS,
  AUDITED_PRODUCTION_NEON_IDENTITY,
  AUTHORIZED_PRODUCTION_STORAGE_BUCKET,
  CLEANUP_CONFIRM_TOKEN,
  CLEANUP_PRODUCTION_CONFIRM_TOKEN,
  DEVELOPMENT_MIGRATION_TARGET,
  FORBIDDEN_MIGRATION_TARGETS,
  IMPORT_CONFIRM_TOKEN,
  IMPORT_PRODUCTION_CONFIRM_TOKEN,
  PRODUCTION_MIGRATION_TARGET,
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
  expectedConfirmToken?: string | null;
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

export function normalizeMigrationTarget(
  target: string | undefined | null,
): string {
  return target?.trim().toLowerCase() ?? '';
}

export function isProductionTarget(target: string | undefined | null): boolean {
  return normalizeMigrationTarget(target) === PRODUCTION_MIGRATION_TARGET;
}

export function expectedImportConfirmToken(
  target: string | undefined | null,
): string {
  return isProductionTarget(target)
    ? IMPORT_PRODUCTION_CONFIRM_TOKEN
    : IMPORT_CONFIRM_TOKEN;
}

export function expectedCleanupConfirmToken(
  target: string | undefined | null,
): string {
  return isProductionTarget(target)
    ? CLEANUP_PRODUCTION_CONFIRM_TOKEN
    : CLEANUP_CONFIRM_TOKEN;
}

export function assertAllowedTarget(target: string | undefined | null): {
  ok: boolean;
  errors: string[];
  target: string;
} {
  const errors: string[] = [];
  const normalized = normalizeMigrationTarget(target);
  if (!normalized) {
    errors.push(
      `Import/preflight/cleanup requires --target=${DEVELOPMENT_MIGRATION_TARGET} or --target=${PRODUCTION_MIGRATION_TARGET}.`,
    );
    return { ok: false, errors, target: normalized };
  }
  if ((FORBIDDEN_MIGRATION_TARGETS as readonly string[]).includes(normalized)) {
    errors.push(
      `Refusing target "${normalized}". Use --target=${DEVELOPMENT_MIGRATION_TARGET} or --target=${PRODUCTION_MIGRATION_TARGET}. Shorthand prod, staging and preview are forbidden.`,
    );
    return { ok: false, errors, target: normalized };
  }
  if (!(ALLOWED_MIGRATION_TARGETS as readonly string[]).includes(normalized)) {
    errors.push(
      `Refusing target "${normalized}". Only --target=${DEVELOPMENT_MIGRATION_TARGET} or --target=${PRODUCTION_MIGRATION_TARGET} is allowed.`,
    );
  }
  return { ok: errors.length === 0, errors, target: normalized };
}

export function assertExactConfirm(
  confirm: string | undefined | null,
  expectedToken: string,
): {
  ok: boolean;
  errors: string[];
} {
  const value = confirm?.trim() ?? '';
  if (!value) {
    return {
      ok: false,
      errors: [`This command requires --confirm=${expectedToken}.`],
    };
  }
  if (value !== expectedToken) {
    return {
      ok: false,
      errors: [`Confirmation token does not match --confirm=${expectedToken}.`],
    };
  }
  return { ok: true, errors: [] };
}

export function assertImportConfirm(
  confirm: string | undefined | null,
  target: string | undefined | null = ALLOWED_MIGRATION_TARGET,
): {
  ok: boolean;
  errors: string[];
} {
  return assertExactConfirm(confirm, expectedImportConfirmToken(target));
}

export function assertCleanupConfirm(
  confirm: string | undefined | null,
  target: string | undefined | null = ALLOWED_MIGRATION_TARGET,
): {
  ok: boolean;
  errors: string[];
} {
  return assertExactConfirm(confirm, expectedCleanupConfirmToken(target));
}

function matchesAuditedProduction(
  neon: NeonIdentity | null | undefined,
): boolean {
  if (!neon?.projectId || !neon.branchId || !neon.endpointId) {
    return false;
  }
  return (
    neon.projectId === AUDITED_PRODUCTION_NEON_IDENTITY.projectId &&
    neon.branchId === AUDITED_PRODUCTION_NEON_IDENTITY.branchId &&
    neon.endpointId === AUDITED_PRODUCTION_NEON_IDENTITY.endpointId
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
  const target = targetResult.target || ALLOWED_MIGRATION_TARGET;
  const production = isProductionTarget(target);
  const environment = emptyEnvironment(targetResult.ok ? target : target);

  for (const message of targetResult.errors) {
    blockers.push({ code: 'TARGET_NOT_ALLOWED', message, blocking: true });
  }

  if (input.requireConfirm) {
    const expected =
      input.expectedConfirmToken?.trim() || expectedImportConfirmToken(target);
    const confirmResult = assertExactConfirm(input.confirm, expected);
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
      message: production
        ? 'DATABASE_URL is required for the authorized production import.'
        : 'DATABASE_URL is required and must point at the development database.',
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
      !production &&
      (hasForbiddenEnvironmentToken(host) ||
        hasForbiddenEnvironmentToken(dbName ?? ''))
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
      message: production
        ? 'Storage is not configured. Set STORAGE_BUCKET and STORAGE_ENDPOINT for the authorized production bucket.'
        : 'Storage is not configured. Set STORAGE_BUCKET and STORAGE_ENDPOINT for the development bucket.',
      blocking: true,
    });
  } else if (production) {
    if (bucket !== AUTHORIZED_PRODUCTION_STORAGE_BUCKET) {
      blockers.push({
        code: 'STORAGE_NOT_AUTHORIZED_PRODUCTION',
        message: `Production target only authorizes bucket ${AUTHORIZED_PRODUCTION_STORAGE_BUCKET}.`,
        blocking: true,
      });
    }
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
    if (
      !production &&
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

  if (production) {
    if (!matchesAuditedProduction(neon)) {
      blockers.push({
        code: 'NEON_NOT_AUTHORIZED_PRODUCTION',
        message:
          'Production target only authorizes the audited Neon project/branch/endpoint.',
        blocking: true,
      });
    }
  } else if (matchesAuditedProduction(neon)) {
    blockers.push({
      code: 'NEON_PRODUCTION_IDENTITY',
      message:
        'Live Neon identity matches the audited production project/branch/endpoint. Refusing writes. Use --target=production with the production confirm token if this lote is explicitly authorized.',
      blocking: true,
    });
  }

  if (
    !production &&
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
