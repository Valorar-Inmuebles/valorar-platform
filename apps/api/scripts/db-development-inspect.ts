import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || process.env.VALORAR_DATABASE_ENV !== 'development') {
  throw new Error(
    'Development inspection requires the protected database wrapper.',
  );
}

const pool = new Pool({ connectionString: databaseUrl });

async function inspect(): Promise<void> {
  const identity = await pool.query<{
    database: string;
    schema: string;
    neon_project_id: string | null;
    neon_branch_id: string | null;
    neon_endpoint_id: string | null;
  }>(`
    SELECT
      current_database() AS database,
      current_schema() AS schema,
      current_setting('neon.project_id', true) AS neon_project_id,
      current_setting('neon.branch_id', true) AS neon_branch_id,
      current_setting('neon.endpoint_id', true) AS neon_endpoint_id
  `);
  const tables = await pool.query<{ table_name: string }>(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  const tableNames = tables.rows.map((row) => row.table_name);
  const safeCountTables = [
    '_prisma_migrations',
    'Tenant',
    'User',
    'Property',
    'Contact',
    'RentalConcept',
    'RentalContract',
    'RentalObligation',
    'RentalObligationOccurrence',
    'RentalFulfillment',
  ].filter((table) => tableNames.includes(table));
  const counts: Record<string, number> = {};

  for (const table of safeCountTables) {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM "${table}"`,
    );
    counts[table] = Number(result.rows[0]?.count ?? 0);
  }

  const migrationHistory = tableNames.includes('_prisma_migrations')
    ? (
        await pool.query<{
          migration_name: string;
          finished: boolean;
          rolled_back: boolean;
        }>(`
          SELECT
            migration_name,
            finished_at IS NOT NULL AS finished,
            rolled_back_at IS NOT NULL AS rolled_back
          FROM "_prisma_migrations"
          ORDER BY started_at, migration_name
        `)
      ).rows
    : [];

  process.stdout.write(
    `${JSON.stringify(
      {
        identity: identity.rows[0],
        tables: tableNames,
        counts,
        migrationHistory,
      },
      null,
      2,
    )}\n`,
  );
}

void inspect()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    process.stderr.write(
      `Development database inspection failed: ${message}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
