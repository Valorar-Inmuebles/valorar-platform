import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'dotenv';
import { validateDevelopmentDatabaseTarget } from '../src/common/safety/development-database-safety';

// Fail closed: this suite never inherits DATABASE_URL from a shell or apps/api/.env.
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
if (!process.env.PROPERTY_LIST_TEST_BRANCH_ID)
  throw new Error(
    'Explicit PROPERTY_LIST_TEST_BRANCH_ID is required; inspect the isolated branch first.',
  );
process.env.DATABASE_URL = env.DATABASE_URL;
process.env.VALORAR_DATABASE_ENV = env.VALORAR_DATABASE_ENV;
process.env.NODE_ENV = 'development';
// Ephemeral credentials only for the in-process test server; never reuse real JWTs.
process.env.JWT_SECRET = `property-list-integration-${process.pid}-ephemeral-secret`;
process.env.PUBLIC_WEB_URL = 'https://web.example';
