import {
  IMPORT_CONFIRM_TARGET,
  IMPORT_CONFIRM_WRITE,
  IMPORT_CONFIRM_WRITE_PRODUCTION,
  IMPORT_CONFIRM_WRITE_STAGING,
  PRODUCTION_MIGRATION_TARGET,
  STAGING_MIGRATION_TARGET,
} from '../constants';
import { parseImportCliArgs } from './import-cli-args';

describe('parseImportCliArgs', () => {
  const base = {
    'wp-id': '5312',
    tenant: 'demo',
    'owner-email': 'admin@demo.valorar.dev',
    'source-dir': 'migration-data',
    'dry-run-report': 'reports/houzez-dry-run-5312.json',
    'confirm-target': IMPORT_CONFIRM_TARGET,
    'confirm-write': IMPORT_CONFIRM_WRITE,
  };

  it('accepts a complete single-property import contract', () => {
    const result = parseImportCliArgs({ args: { ...base } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.wpId).toBe(5312);
    expect(result.tenantSlug).toBe('demo');
    expect(result.confirmTarget).toBe(STAGING_MIGRATION_TARGET);
    expect(result.confirmWrite).toBe(IMPORT_CONFIRM_WRITE_STAGING);
  });

  it('accepts production confirm-target with production confirm-write', () => {
    const result = parseImportCliArgs({
      args: {
        ...base,
        'confirm-target': PRODUCTION_MIGRATION_TARGET,
        'confirm-write': IMPORT_CONFIRM_WRITE_PRODUCTION,
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.confirmTarget).toBe(PRODUCTION_MIGRATION_TARGET);
    expect(result.confirmWrite).toBe(IMPORT_CONFIRM_WRITE_PRODUCTION);
  });

  it('rejects staging confirm-write with production target', () => {
    const result = parseImportCliArgs({
      args: {
        ...base,
        'confirm-target': PRODUCTION_MIGRATION_TARGET,
        'confirm-write': IMPORT_CONFIRM_WRITE_STAGING,
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => /confirm-write/i.test(e))).toBe(true);
  });

  it('rejects production target with staging write token', () => {
    const result = parseImportCliArgs({
      args: {
        ...base,
        'confirm-target': PRODUCTION_MIGRATION_TARGET,
        'confirm-write': IMPORT_CONFIRM_WRITE,
      },
    });
    expect(result.ok).toBe(false);
  });

  it('rejects production confirm-write with staging target', () => {
    const result = parseImportCliArgs({
      args: {
        ...base,
        'confirm-target': STAGING_MIGRATION_TARGET,
        'confirm-write': IMPORT_CONFIRM_WRITE_PRODUCTION,
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => /confirm-write/i.test(e))).toBe(true);
  });

  it('rejects missing --wp-id (no default)', () => {
    const rest = { ...base };
    delete (rest as Record<string, unknown>)['wp-id'];
    const result = parseImportCliArgs({ args: rest });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes('--wp-id'))).toBe(true);
  });

  it('rejects multiple wp ids and mass flags', () => {
    expect(
      parseImportCliArgs({ args: { ...base, 'wp-id': '5312,5313' } }).ok,
    ).toBe(false);
    expect(parseImportCliArgs({ args: { ...base, all: true } }).ok).toBe(false);
    expect(parseImportCliArgs({ args: { ...base, glob: '*.json' } }).ok).toBe(
      false,
    );
    expect(parseImportCliArgs({ args: { ...base, mass: true } }).ok).toBe(
      false,
    );
  });

  it('rejects missing confirmations and dry-run report', () => {
    const noConfirm = { ...base };
    delete (noConfirm as Record<string, unknown>)['confirm-write'];
    delete (noConfirm as Record<string, unknown>)['confirm-target'];
    delete (noConfirm as Record<string, unknown>)['dry-run-report'];
    const result = parseImportCliArgs({ args: noConfirm });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes('confirm-write'))).toBe(true);
    expect(result.errors.some((e) => e.includes('confirm-target'))).toBe(true);
    expect(result.errors.some((e) => e.includes('dry-run-report'))).toBe(true);
  });

  it('rejects wrong confirmation tokens', () => {
    const result = parseImportCliArgs({
      args: {
        ...base,
        'confirm-write': 'YES',
        'confirm-target': 'production',
      },
    });
    expect(result.ok).toBe(false);
  });

  it('rejects --skip-db', () => {
    const result = parseImportCliArgs({
      args: { ...base, 'skip-db': true },
    });
    expect(result.ok).toBe(false);
  });
});
