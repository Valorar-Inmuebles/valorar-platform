import {
  ALLOWED_MIGRATION_TARGET,
  CLEANUP_PRODUCTION_CONFIRM_TOKEN,
  IMPORT_CONFIRM_TOKEN,
  IMPORT_PRODUCTION_CONFIRM_TOKEN,
  PRODUCTION_MIGRATION_TARGET,
} from '../constants';
import { parseCliArgs } from './parse-args';

describe('parseCliArgs import/preflight gates', () => {
  it('rejects shorthand prod, staging and preview', () => {
    expect(() =>
      parseCliArgs([
        'import',
        `--target=prod`,
        `--confirm=${IMPORT_CONFIRM_TOKEN}`,
      ]),
    ).toThrow(/Shorthand prod, staging and preview are forbidden/);
    expect(() => parseCliArgs(['preflight', '--target=staging'])).toThrow(
      /Shorthand prod, staging and preview are forbidden/,
    );
  });

  it('rejects a missing import confirmation token', () => {
    expect(() =>
      parseCliArgs(['import', `--target=${ALLOWED_MIGRATION_TARGET}`]),
    ).toThrow(/--confirm=IMPORT_LOCAL_DEVELOPMENTS/);
  });

  it('accepts import with development target and confirm token', () => {
    const options = parseCliArgs([
      'import',
      `--target=${ALLOWED_MIGRATION_TARGET}`,
      `--confirm=${IMPORT_CONFIRM_TOKEN}`,
      '--tenant=demo',
    ]);
    expect(options.command).toBe('import');
    expect(options.target).toBe(ALLOWED_MIGRATION_TARGET);
    expect(options.confirm).toBe(IMPORT_CONFIRM_TOKEN);
    expect(options.tenant).toBe('demo');
  });

  it('rejects production import without the production confirm token', () => {
    expect(() =>
      parseCliArgs(['import', `--target=${PRODUCTION_MIGRATION_TARGET}`]),
    ).toThrow(/--confirm=IMPORT_LOCAL_DEVELOPMENTS_PRODUCTION/);
    expect(() =>
      parseCliArgs([
        'import',
        `--target=${PRODUCTION_MIGRATION_TARGET}`,
        `--confirm=${IMPORT_CONFIRM_TOKEN}`,
      ]),
    ).toThrow(/--confirm=IMPORT_LOCAL_DEVELOPMENTS_PRODUCTION/);
  });

  it('accepts production import with the exact production confirm token', () => {
    const options = parseCliArgs([
      'import',
      `--target=${PRODUCTION_MIGRATION_TARGET}`,
      `--confirm=${IMPORT_PRODUCTION_CONFIRM_TOKEN}`,
      '--tenant=demo',
      '--created-by=admin@demo.valorar.dev',
    ]);
    expect(options.target).toBe(PRODUCTION_MIGRATION_TARGET);
    expect(options.confirm).toBe(IMPORT_PRODUCTION_CONFIRM_TOKEN);
  });

  it('requires cleanup dry-run or execute', () => {
    expect(() =>
      parseCliArgs(['cleanup', `--target=${PRODUCTION_MIGRATION_TARGET}`]),
    ).toThrow(/--dry-run or --execute/);
  });

  it('accepts cleanup dry-run without confirm and execute with the delete token', () => {
    const dryRun = parseCliArgs([
      'cleanup',
      '--dry-run',
      `--target=${PRODUCTION_MIGRATION_TARGET}`,
      '--tenant=demo',
    ]);
    expect(dryRun.dryRun).toBe(true);
    expect(dryRun.execute).toBeUndefined();

    const execute = parseCliArgs([
      'cleanup',
      '--execute',
      `--target=${PRODUCTION_MIGRATION_TARGET}`,
      '--tenant=demo',
      `--confirm=${CLEANUP_PRODUCTION_CONFIRM_TOKEN}`,
    ]);
    expect(execute.execute).toBe(true);
    expect(execute.confirm).toBe(CLEANUP_PRODUCTION_CONFIRM_TOKEN);
  });
});
