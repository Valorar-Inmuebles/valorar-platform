import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'dotenv';
import { validateDevelopmentDatabaseTarget } from '../src/common/safety/development-database-safety';

// Never inherit a shell/baseline DATABASE_URL. Live identity is checked before writes.
const env = parse(
  readFileSync(resolve(__dirname, '../.env.development.local')),
);
const baseline = parse(readFileSync(resolve(__dirname, '../.env')));
const safety = validateDevelopmentDatabaseTarget({
  databaseUrl: env.DATABASE_URL,
  databaseEnvironment: env.VALORAR_DATABASE_ENV,
  nodeEnvironment: env.NODE_ENV,
  baselineDatabaseUrl: baseline.DATABASE_URL,
});
if (!safety.ok) throw new Error(safety.errors.join('\n'));
if (!process.env.PASSWORD_CHANGE_TEST_BRANCH_ID)
  throw new Error('Explicit isolated PASSWORD_CHANGE_TEST_BRANCH_ID required.');
process.env.DATABASE_URL = env.DATABASE_URL;
process.env.NODE_ENV = 'development';
process.env.VALORAR_DATABASE_ENV = 'development';
process.env.JWT_SECRET = `password-change-tests-${process.pid}-ephemeral-secret-only`;
process.env.CORS_ORIGIN = 'http://localhost:3001';
