import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { HOUZEZ_SQL_FRAGMENTS } from '../constants';

export type SqlInsertHandler = (
  table: string,
  columns: string[] | null,
  rows: (string | null)[],
) => void | Promise<void>;

/**
 * Streaming MySQL dump reader.
 *
 * Strategy (not a full SQL engine):
 * 1. Read line-by-line (constant memory aside from the current statement buffer).
 * 2. Accumulate until a statement terminator `;` outside of quotes.
 * 3. For INSERT INTO, tokenize VALUES tuples with a quote/escape-aware scanner
 *    (handles \\, '', nested commas/parens inside strings, multiline strings).
 * 4. Only invoke the handler for requested tables.
 *
 * This is sufficient for WordPress mysqldump fragments used here. It is not a
 * general SQL parser; DDL other than CREATE TABLE name detection is ignored.
 */
export class DumpStreamReader {
  constructor(private readonly sourceDir: string) {}

  listRequiredFragments(): string[] {
    return HOUZEZ_SQL_FRAGMENTS.map((name) => path.join(this.sourceDir, name));
  }

  assertFragmentsPresent(): void {
    const missing = this.listRequiredFragments().filter(
      (p) => !fs.existsSync(p),
    );
    if (missing.length) {
      throw new Error(
        `Missing Houzez SQL fragments (expected consecutive dump parts):\n${missing.join('\n')}`,
      );
    }
  }

  async forEachInsert(
    tableNames: string[],
    handler: SqlInsertHandler,
  ): Promise<void> {
    this.assertFragmentsPresent();
    const wanted = new Set(tableNames);
    /**
     * Fragments are consecutive mysqldump parts and may split mid-statement
     * (file N ends inside VALUES; file N+1 continues tuples). Quote/statement
     * state MUST carry across fragment boundaries.
     */
    let statement = '';
    let inString: "'" | '"' | null = null;
    let escape = false;

    for (const filePath of this.listRequiredFragments()) {
      const rl = readline.createInterface({
        input: fs.createReadStream(filePath, { encoding: 'utf8' }),
        crlfDelay: Infinity,
      });

      for await (const line of rl) {
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          statement += ch;

          if (inString) {
            if (escape) {
              escape = false;
              continue;
            }
            if (ch === '\\') {
              escape = true;
              continue;
            }
            if (ch === inString) {
              // MySQL dump may double the quote
              if (line[i + 1] === inString) {
                statement += line[i + 1];
                i++;
                continue;
              }
              inString = null;
            }
            continue;
          }

          if (ch === "'" || ch === '"') {
            inString = ch;
            continue;
          }

          if (ch === ';') {
            await this.dispatchStatement(statement, wanted, handler);
            statement = '';
          }
        }
        if (statement.length) {
          statement += '\n';
        }
      }
    }

    if (statement.trim()) {
      await this.dispatchStatement(statement, wanted, handler);
    }
  }

  private async dispatchStatement(
    statement: string,
    wanted: Set<string>,
    handler: SqlInsertHandler,
  ): Promise<void> {
    const trimmed = stripLeadingSqlNoise(statement);
    if (!trimmed.toUpperCase().startsWith('INSERT')) return;

    const tableMatch = trimmed.match(/^INSERT\s+INTO\s+`?([a-zA-Z0-9_]+)`?/i);
    if (!tableMatch) return;
    const table = tableMatch[1];
    if (!wanted.has(table)) return;

    const columns = parseInsertColumns(trimmed);
    const valuesSql = extractValuesClause(trimmed);
    if (!valuesSql) return;
    const rows = splitSqlTuples(valuesSql);
    for (const row of rows) {
      await handler(table, columns, row);
    }
  }
}

/** Remove leading whitespace, `--` line comments and block comments before SQL verbs. */
export function stripLeadingSqlNoise(sql: string): string {
  let s = sql.replace(/^\uFEFF/, '');
  let changed = true;
  while (changed) {
    changed = false;
    const next = s.replace(/^\s+/, '');
    if (next !== s) {
      s = next;
      changed = true;
      continue;
    }
    if (s.startsWith('--')) {
      const nl = s.indexOf('\n');
      s = nl >= 0 ? s.slice(nl + 1) : '';
      changed = true;
      continue;
    }
    if (s.startsWith('/*')) {
      const end = s.indexOf('*/');
      if (end < 0) return s.trim();
      s = s.slice(end + 2);
      changed = true;
    }
  }
  return s.trim();
}

export function parseInsertColumns(insertSql: string): string[] | null {
  const m = insertSql.match(
    /INSERT\s+INTO\s+`?[a-zA-Z0-9_]+`?\s*\(([^)]+)\)\s*VALUES/i,
  );
  if (!m) return null;
  return m[1].split(',').map((c) => c.trim().replace(/`/g, ''));
}

export function extractValuesClause(insertSql: string): string | null {
  const idx = insertSql.search(/\bVALUES\b/i);
  if (idx < 0) return null;
  let part = insertSql.slice(idx + 6).trim();
  if (part.endsWith(';')) part = part.slice(0, -1).trim();
  return part;
}

export function unquoteSqlValue(v: string): string | null {
  const t = v.trim();
  if (t === 'NULL' || t === 'null') return null;
  if (
    (t.startsWith("'") && t.endsWith("'")) ||
    (t.startsWith('"') && t.endsWith('"'))
  ) {
    return t
      .slice(1, -1)
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .replace(/''/g, "'");
  }
  return t;
}

/**
 * Split a VALUES clause into rows of fields with quote/escape awareness.
 */
export function splitSqlTuples(valuesSql: string): (string | null)[][] {
  const tuples: (string | null)[][] = [];
  let i = 0;
  const s = valuesSql;

  while (i < s.length) {
    while (i < s.length && ' \n\r\t,'.includes(s[i])) i++;
    if (i >= s.length || s[i] !== '(') break;
    i++;

    const fields: (string | null)[] = [];
    let field = '';
    let inStr: "'" | '"' | null = null;
    let escape = false;

    while (i < s.length) {
      const ch = s[i];
      if (inStr) {
        if (escape) {
          field += ch;
          escape = false;
          i++;
          continue;
        }
        if (ch === '\\') {
          field += ch;
          escape = true;
          i++;
          continue;
        }
        if (ch === inStr) {
          if (s[i + 1] === inStr) {
            field += ch + ch;
            i += 2;
            continue;
          }
          inStr = null;
          field += ch;
          i++;
          continue;
        }
        field += ch;
        i++;
        continue;
      }

      if (ch === "'" || ch === '"') {
        inStr = ch;
        field += ch;
        i++;
        continue;
      }
      if (ch === ',') {
        fields.push(unquoteSqlValue(field));
        field = '';
        i++;
        continue;
      }
      if (ch === ')') {
        fields.push(unquoteSqlValue(field));
        i++;
        break;
      }
      field += ch;
      i++;
    }

    tuples.push(fields);
  }

  return tuples;
}

export function detectTablePrefixFromCreate(
  createTableNames: string[],
): string {
  const counts = new Map<string, number>();
  for (const name of createTableNames) {
    const m = name.match(/^([a-z0-9]+_)/i);
    const prefix = m ? m[1] : '';
    counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
  }
  let best = '';
  let bestCount = 0;
  for (const [prefix, count] of counts) {
    if (count > bestCount) {
      best = prefix;
      bestCount = count;
    }
  }
  return best;
}
