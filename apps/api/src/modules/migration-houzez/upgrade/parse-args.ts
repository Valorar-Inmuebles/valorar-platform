import {
  PILOT_IMAGE_UPGRADE_CONFIRM_WRITE_PRODUCTION,
  PILOT_WP_ID,
  PRODUCTION_MIGRATION_TARGET,
} from '../constants';

export type PilotImageUpgradeArgParseResult =
  | {
      ok: true;
      wpId: typeof PILOT_WP_ID;
      tenantSlug: string;
      ownerEmail: string;
      approvedManifestPath: string;
      reportDir: string;
      confirmTarget: typeof PRODUCTION_MIGRATION_TARGET;
      confirmWrite: typeof PILOT_IMAGE_UPGRADE_CONFIRM_WRITE_PRODUCTION;
      execute: boolean;
    }
  | { ok: false; errors: string[] };

/**
 * Strict CLI contract for the pilot image upgrade.
 * Production-only; single --wp-id=5312; dual confirms; approved v2 manifest required.
 */
export function parsePilotImageUpgradeArgs(input: {
  args: Record<string, string | boolean>;
}): PilotImageUpgradeArgParseResult {
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
        `Upgrade refuses multi/mass selection flag --${key}. Only a single --wp-id is allowed.`,
      );
    }
  }

  if (!args['wp-id'] || args['wp-id'] === true) {
    errors.push('Upgrade requires explicit --wp-id=5312 (no default).');
  }
  const wpIdRaw = String(args['wp-id'] ?? '');
  const wpId = Number(wpIdRaw);
  if (wpId !== PILOT_WP_ID) {
    errors.push(
      `Upgrade rejects any WP id other than ${PILOT_WP_ID} (got ${wpIdRaw || 'empty'}).`,
    );
  }

  if (!args.tenant || args.tenant === true) {
    errors.push('Upgrade requires explicit --tenant=demo.');
  } else if (String(args.tenant) !== 'demo') {
    errors.push('Upgrade currently allows only --tenant=demo.');
  }

  if (!args['owner-email'] || args['owner-email'] === true) {
    errors.push(
      'Upgrade requires explicit --owner-email=admin@demo.valorar.dev.',
    );
  } else if (String(args['owner-email']) !== 'admin@demo.valorar.dev') {
    errors.push(
      'Upgrade currently allows only --owner-email=admin@demo.valorar.dev.',
    );
  }

  if (!args['approved-manifest'] || args['approved-manifest'] === true) {
    errors.push(
      'Upgrade requires --approved-manifest pointing at the approved houzez-webp-v2 preparation-manifest.json.',
    );
  }

  if (!args['confirm-target'] || args['confirm-target'] === true) {
    errors.push(
      `Upgrade requires --confirm-target=${PRODUCTION_MIGRATION_TARGET}.`,
    );
  } else if (String(args['confirm-target']) !== PRODUCTION_MIGRATION_TARGET) {
    errors.push(
      `Upgrade is production-only; --confirm-target must be exactly "${PRODUCTION_MIGRATION_TARGET}".`,
    );
  }

  if (!args['confirm-write'] || args['confirm-write'] === true) {
    errors.push(
      `Upgrade requires --confirm-write=${PILOT_IMAGE_UPGRADE_CONFIRM_WRITE_PRODUCTION}.`,
    );
  } else if (
    String(args['confirm-write']) !==
    PILOT_IMAGE_UPGRADE_CONFIRM_WRITE_PRODUCTION
  ) {
    errors.push(
      `--confirm-write must be exactly "${PILOT_IMAGE_UPGRADE_CONFIRM_WRITE_PRODUCTION}".`,
    );
  }

  const reportDir =
    typeof args['report-dir'] === 'string' && args['report-dir'].trim()
      ? args['report-dir'].trim()
      : 'migration-data/reports';

  if (errors.length) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    wpId: PILOT_WP_ID,
    tenantSlug: 'demo',
    ownerEmail: 'admin@demo.valorar.dev',
    approvedManifestPath: String(args['approved-manifest']),
    reportDir,
    confirmTarget: PRODUCTION_MIGRATION_TARGET,
    confirmWrite: PILOT_IMAGE_UPGRADE_CONFIRM_WRITE_PRODUCTION,
    execute: Boolean(args.execute),
  };
}
