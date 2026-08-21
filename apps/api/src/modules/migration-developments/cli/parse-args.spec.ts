import { ALLOWED_MIGRATION_TARGET, IMPORT_CONFIRM_TOKEN } from '../constants';
import { parseCliArgs } from './parse-args';

describe('parseCliArgs import/preflight gates', () => {
  it('rejects a target other than development', () => {
    expect(() =>
      parseCliArgs([
        'import',
        `--target=production`,
        `--confirm=${IMPORT_CONFIRM_TOKEN}`,
      ]),
    ).toThrow(/Only --target=development/);
    expect(() => parseCliArgs(['preflight', '--target=staging'])).toThrow(
      /Only --target=development/,
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
});
