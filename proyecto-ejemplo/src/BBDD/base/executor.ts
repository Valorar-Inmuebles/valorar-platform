import type { QueryResult, QueryResultRow } from "pg";

import sql from "./db";
import { rethrowDbError } from "./errors";

const LOG_QUERIES = process.env.LOG_QUERIES === "true";
const MAX_LOG_PARAM_LENGTH = 200;

let inFlightQueries = 0;

function truncateForLog(value: unknown): unknown {
  if (typeof value === "string" && value.length > MAX_LOG_PARAM_LENGTH) {
    return `${value.slice(0, MAX_LOG_PARAM_LENGTH)}…`;
  }
  return value;
}

function sqlPreview(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 120);
}

function logQuery(
  text: string,
  params: unknown[],
  durationMs: number,
  inFlightAtStart: number,
): void {
  if (!LOG_QUERIES) return;

  const preview = sqlPreview(text);
  console.debug(`[BBDD] ${durationMs}ms | inFlight=${inFlightAtStart} | ${preview}`);
  if (params.length > 0)
    console.debug("[BBDD]  parameters:  ", params.map(truncateForLog));
  console.debug("");
}

export const pgPool = {
  query: async <T extends QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> => {
    const inFlightAtStart = inFlightQueries;
    inFlightQueries += 1;
    const start = Date.now();
    try {
      const rows = (await sql.unsafe<T[]>(
        text,
        (params ?? []) as never[],
      )) as unknown as T[];
      logQuery(text, params ?? [], Date.now() - start, inFlightAtStart);
      return { rows } as QueryResult<T>;
    } catch (error) {
      logQuery(text, params ?? [], Date.now() - start, inFlightAtStart);
      rethrowDbError(error);
    } finally {
      inFlightQueries -= 1;
    }
  },
  end: (options?: { timeout?: number | undefined }) => sql.end(options),
};

export async function pgQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  return pgPool.query<T>(text, params);
}

export async function closePgPool(): Promise<void> {
  await sql.end({ timeout: 5 });
}

export { sql };
