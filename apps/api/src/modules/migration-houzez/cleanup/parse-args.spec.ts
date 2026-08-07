import { parseCleanupArgs, validateCleanupModeAndTenant } from './parse-args';

describe('cleanup parseCleanupArgs', () => {
  it('defaults to no mode (safe no-op)', () => {
    const args = parseCleanupArgs([]);
    expect(args.mode).toBeNull();
    expect(args.tenantSlug).toBeNull();
  });

  it('parses dry-run and tenant', () => {
    const args = parseCleanupArgs(['--dry-run', '--tenant=demo']);
    expect(args.mode).toBe('dry-run');
    expect(args.tenantSlug).toBe('demo');
    expect(args.confirmToken).toBeNull();
  });

  it('parses execute with confirm token', () => {
    const args = parseCleanupArgs([
      '--execute',
      '--tenant=demo',
      '--confirm-token=DELETE-DEMO-PROPERTIES-STAGING',
    ]);
    expect(args.mode).toBe('execute');
    expect(args.confirmToken).toBe('DELETE-DEMO-PROPERTIES-STAGING');
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
    expect(result).toEqual({ ok: true, mode: 'dry-run' });
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

  it('requires confirm token, manifest, and approved hash for execute', () => {
    const missing = validateCleanupModeAndTenant(
      parseCleanupArgs(['--execute', '--tenant=demo']),
    );
    expect(missing.ok).toBe(false);

    const result = validateCleanupModeAndTenant(
      parseCleanupArgs([
        '--execute',
        '--tenant=demo',
        '--confirm-token=DELETE-DEMO-PROPERTIES-STAGING',
        '--manifest=C:/tmp/manifest.json',
        '--approved-hash=01c578f10022e26e4ff999733b757345c2e12da8d130927c2085619b088f2638',
      ]),
    );
    expect(result).toEqual({ ok: true, mode: 'execute' });
  });

  it('accepts execute with correct token', () => {
    const result = validateCleanupModeAndTenant(
      parseCleanupArgs([
        '--execute',
        '--tenant=demo',
        '--confirm-token=DELETE-DEMO-PROPERTIES-STAGING',
        '--manifest=./manifest.json',
        '--approved-hash=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      ]),
    );
    expect(result).toEqual({ ok: true, mode: 'execute' });
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
