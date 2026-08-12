import {
  PILOT_IMAGE_UPGRADE_CONFIRM_WRITE_PRODUCTION,
  PRODUCTION_MIGRATION_TARGET,
} from '../constants';
import { parsePilotImageUpgradeArgs } from './parse-args';

describe('parsePilotImageUpgradeArgs', () => {
  const base = {
    'wp-id': '5312',
    tenant: 'demo',
    'owner-email': 'admin@demo.valorar.dev',
    'approved-manifest':
      'migration-data/prepared/wp-5312/2026-08-11T21-00-33-562Z/preparation-manifest.json',
    'confirm-target': PRODUCTION_MIGRATION_TARGET,
    'confirm-write': PILOT_IMAGE_UPGRADE_CONFIRM_WRITE_PRODUCTION,
  };

  it('accepts a complete production upgrade contract', () => {
    const result = parsePilotImageUpgradeArgs({
      args: { ...base, execute: true },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.wpId).toBe(5312);
    expect(result.execute).toBe(true);
    expect(result.confirmTarget).toBe(PRODUCTION_MIGRATION_TARGET);
    expect(result.confirmWrite).toBe(
      PILOT_IMAGE_UPGRADE_CONFIRM_WRITE_PRODUCTION,
    );
  });

  it('rejects any wp-id other than 5312', () => {
    const result = parsePilotImageUpgradeArgs({
      args: { ...base, 'wp-id': '9999' },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => /5312/.test(e))).toBe(true);
  });

  it('rejects staging confirm-target', () => {
    const result = parsePilotImageUpgradeArgs({
      args: { ...base, 'confirm-target': 'staging-houzez' },
    });
    expect(result.ok).toBe(false);
  });

  it('rejects wrong confirm-write', () => {
    const result = parsePilotImageUpgradeArgs({
      args: {
        ...base,
        'confirm-write': 'IMPORT_ONE_HOUZEZ_PROPERTY_PRODUCTION',
      },
    });
    expect(result.ok).toBe(false);
  });

  it('rejects multi/mass flags', () => {
    const result = parsePilotImageUpgradeArgs({
      args: { ...base, 'wp-ids': '5312,5313' },
    });
    expect(result.ok).toBe(false);
  });

  it('requires approved-manifest', () => {
    const rest = { ...base };
    delete (rest as { 'approved-manifest'?: string })['approved-manifest'];
    const result = parsePilotImageUpgradeArgs({ args: rest });
    expect(result.ok).toBe(false);
  });
});
