import type { QueryResultRow } from "pg";

import { pgQuery } from "./executor";

export async function queryRows<T extends QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pgQuery<T>(sql, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await queryRows<T>(sql, params);
  return rows[0] ?? null;
}

export async function queryCount(
  sql: string,
  params: unknown[] = [],
): Promise<number> {
  const row = await queryOne<{ count: string }>(sql, params);
  return row ? Number(row.count) : 0;
}
