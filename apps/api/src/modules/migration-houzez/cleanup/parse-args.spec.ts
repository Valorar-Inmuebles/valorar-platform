import {
  EXECUTE_CONFIRM_TOKEN_PRODUCTION,
  EXECUTE_CONFIRM_TOKEN_STAGING,
  PRODUCTION_CLEANUP_TARGET,
  STAGING_CLEANUP_TARGET,
} from './constants';
import { parseCleanupArgs, validateCleanupModeAndTenant } from './parse-args';

describe('cleanup parseCleanupArgs', () => {
  it('defaults to no mode (safe no-op)', () => {
    const args = parseCleanupArgs([]);
    expect(args.mode).toBeNull();
    expect(args.tenantSlug).toBeNull();
    expect(args.confirmTarget).toBeNull();
  });

  it('parses dry-run and tenant', () => {
    const args = parseCleanupArgs(['--dry-run', '--tenant=demo']);
    expect(args.mode).toBe('dry-run');
    expect(args.tenantSlug).toBe('demo');
    expect(args.confirmToken).toBeNull();
  });

  it('parses execute with confirm token and confirm-target', () => {
    const args = parseCleanupArgs([
      '--execute',
      '--tenant=demo',
      `--confirm-target=${STAGING_CLEANUP_TARGET}`,
      `--confirm-token=${EXECUTE_CONFIRM_TOKEN_STAGING}`,
    ]);
    expect(args.mode).toBe('execute');
    expect(args.confirmToken).toBe(EXECUTE_CONFIRM_TOKEN_STAGING);
    expect(args.confirmTarget).toBe(STAGING_CLEANUP_TARGET);
  });

  it('rejects simultaneous dry-run and execute', () => {
    const args = parseCleanupArgs(['--dry-run', '--execute', '--tenant=demo']);
    expect(args.mode).toBeNull();
    expect(args.unknownFlags).toContain('--dry-run+--execute');
  });
});

describe('cleanup validateCleanupModeAndTenant', () => {
  it('refuses default (no mode)', () => {
    const result = validateCleanupModeAndTenant(parseCleanupArgs([]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /Refuse to run/i.test(e))).toBe(true);
    }
  });

  it('accepts dry-run for demo', () => {
    const result = validateCleanupModeAndTenant(
      parseCleanupArgs(['--dry-run', '--tenant=demo']),
    );
    expect(result).toEqual({
      ok: true,
      mode: 'dry-run',
      cleanupTarget: STAGING_CLEANUP_TARGET,
    });
  });

  it('rejects non-demo tenant', () => {
    const result = validateCleanupModeAndTenant(
      parseCleanupArgs(['--dry-run', '--tenant=other']),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) => /only allows --tenant=demo/i.test(e)),
      ).toBe(true);
    }
  });

  it('requires confirm-target, token, manifest, and approved hash for execute', () => {
    const missing = validateCleanupModeAndTenant(
      parseCleanupArgs(['--execute', '--tenant=demo']),
    );
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.errors.some((e) => /confirm-target/i.test(e))).toBe(true);
    }

    const result = validateCleanupModeAndTenant(
      parseCleanupArgs([
        '--execute',
        '--tenant=demo',
        `--confirm-target=${STAGING_CLEANUP_TARGET}`,
        `--confirm-token=${EXECUTE_CONFIRM_TOKEN_STAGING}`,
        '--manifest=C:/tmp/manifest.json',
        '--approved-hash=01c578f10022e26e4ff999733b757345c2e12da8d130927c2085619b088f2638',
      ]),
    );
    expect(result).toEqual({
      ok: true,
      mode: 'execute',
      cleanupTarget: STAGING_CLEANUP_TARGET,
    });
  });

  it('accepts execute with staging token pair', () => {
    const result = validateCleanupModeAndTenant(
      parseCleanupArgs([
        '--execute',
        '--tenant=demo',
        `--confirm-target=${STAGING_CLEANUP_TARGET}`,
        `--confirm-token=${EXECUTE_CONFIRM_TOKEN_STAGING}`,
        '--manifest=./manifest.json',
        '--approved-hash=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      ]),
    );
    expect(result).toEqual({
      ok: true,
      mode: 'execute',
      cleanupTarget: STAGING_CLEANUP_TARGET,
    });
  });

  it('accepts execute with production token pair', () => {
    const result = validateCleanupModeAndTenant(
      parseCleanupArgs([
        '--execute',
        '--tenant=demo',
        `--confirm-target=${PRODUCTION_CLEANUP_TARGET}`,
        `--confirm-token=${EXECUTE_CONFIRM_TOKEN_PRODUCTION}`,
        '--manifest=./manifest.json',
        '--approved-hash=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      ]),
    );
    expect(result).toEqual({
      ok: true,
      mode: 'execute',
      cleanupTarget: PRODUCTION_CLEANUP_TARGET,
    });
  });

  it('rejects staging token with production confirm-target', () => {
    const result = validateCleanupModeAndTenant(
      parseCleanupArgs([
        '--execute',
        '--tenant=demo',
        `--confirm-target=${PRODUCTION_CLEANUP_TARGET}`,
        `--confirm-token=${EXECUTE_CONFIRM_TOKEN_STAGING}`,
        '--manifest=./manifest.json',
        '--approved-hash=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      ]),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /confirm-token/i.test(e))).toBe(true);
    }
  });

  it('rejects allow-anomalous-key in this version', () => {
    const result = validateCleanupModeAndTenant(
      parseCleanupArgs(['--dry-run', '--tenant=demo', '--allow-anomalous-key']),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /allow-anomalous-key/i.test(e))).toBe(
        true,
      );
    }
  });
});
