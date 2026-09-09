import { validateDevelopmentDatabaseTarget } from './development-database-safety';

const validInput = {
  databaseUrl:
    'postgresql://development-user:secret@ep-rental-dev-123.sa-east-1.aws.neon.tech/neondb?sslmode=require',
  databaseEnvironment: 'development',
  nodeEnvironment: 'development',
  baselineDatabaseUrl:
    'postgresql://production-user:secret@ep-mute-sun-ac6nva0v.sa-east-1.aws.neon.tech/neondb?sslmode=require',
};

describe('development database safety', () => {
  it('accepts an explicitly marked database on a different endpoint', () => {
    expect(validateDevelopmentDatabaseTarget(validInput)).toEqual({
      ok: true,
      target: {
        host: 'ep-rental-dev-123.sa-east-1.aws.neon.tech',
        database: 'neondb',
        endpoint: 'ep-rental-dev-123',
      },
    });
  });

  it('rejects the protected production endpoint', () => {
    const result = validateDevelopmentDatabaseTarget({
      ...validInput,
      databaseUrl:
        'postgresql://user:secret@ep-mute-sun-ac6nva0v.sa-east-1.aws.neon.tech/neondb',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(' ')).toMatch(/protected production endpoint/i);
    }
  });

  it('rejects a pooler for the protected production endpoint', () => {
    const result = validateDevelopmentDatabaseTarget({
      ...validInput,
      databaseUrl:
        'postgresql://user:secret@ep-mute-sun-ac6nva0v-pooler.sa-east-1.aws.neon.tech/neondb',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(' ')).toMatch(/protected production endpoint/i);
    }
  });

  it('rejects the ordinary apps/api/.env endpoint even if it changes', () => {
    const result = validateDevelopmentDatabaseTarget({
      ...validInput,
      databaseUrl:
        'postgresql://development-user:secret@ep-another-pooler.aws.neon.tech/neondb',
      baselineDatabaseUrl:
        'postgresql://ordinary-user:secret@ep-another.aws.neon.tech/neondb',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(' ')).toMatch(
        /different from apps\/api\/\.env/i,
      );
    }
  });

  it('requires explicit development markers', () => {
    const result = validateDevelopmentDatabaseTarget({
      ...validInput,
      databaseEnvironment: undefined,
      nodeEnvironment: 'production',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(' ')).toMatch(/VALORAR_DATABASE_ENV/);
      expect(result.errors.join(' ')).toMatch(/NODE_ENV/);
    }
  });

  it('never includes credentials in its successful result', () => {
    const result = validateDevelopmentDatabaseTarget(validInput);

    expect(JSON.stringify(result)).not.toContain('development-user');
    expect(JSON.stringify(result)).not.toContain('secret');
  });
});
