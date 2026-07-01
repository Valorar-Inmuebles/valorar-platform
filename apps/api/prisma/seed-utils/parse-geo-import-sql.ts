import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Parsed row from provincias.sql — import only, not persisted. */
export type ImportProvinciaRow = {
  active: boolean;
  provinceKey: string;
  name: string;
  isoCode: string;
};

/** Parsed row from localidades.sql — import only, not persisted. */
export type ImportLocalidadRow = {
  sourceId: number;
  active: boolean;
  provinceKey: string;
  name: string;
  postalCode: string | null;
};

export const CABA_PROVINCE_KEY = 'C';
export const CABA_PROVINCE_NAME = 'Capital Federal';

export function normalizeGeoName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function isCabaProvinceKey(key: string): boolean {
  return key.trim().toUpperCase() === CABA_PROVINCE_KEY;
}

export function isCabaProvinceName(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return (
    normalized === 'capital federal' ||
    normalized === 'ciudad autónoma de buenos aires' ||
    normalized === 'ciudad autonoma de buenos aires' ||
    normalized === 'caba'
  );
}

/** Extracts barrio name from `CABA - {Barrio}` import rows. */
export function extractCabaBarrioName(name: string): string | null {
  const trimmed = name.trim();
  const match = trimmed.match(/^CABA\s*-\s*(.+)$/i);

  if (match) {
    return match[1].trim();
  }

  if (/^c\.?\s*a\.?\s*b\.?\s*a\.?\.?$/i.test(trimmed)) {
    return null;
  }

  return null;
}

function unquote(value: string): string {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"');
  }

  if (trimmed.toUpperCase() === 'NULL') {
    return '';
  }

  return trimmed;
}

function splitInsertValues(valuesSection: string): string[] {
  const values: string[] = [];
  let current = '';
  let inString = false;
  let stringQuote = '';
  let depth = 0;

  for (let index = 0; index < valuesSection.length; index += 1) {
    const char = valuesSection[index];
    const previous = valuesSection[index - 1];

    if ((char === "'" || char === '"') && previous !== '\\') {
      if (!inString) {
        inString = true;
        stringQuote = char;
      } else if (char === stringQuote) {
        inString = false;
        stringQuote = '';
      }
    }

    if (!inString) {
      if (char === '(') {
        depth += 1;
      } else if (char === ')') {
        depth -= 1;
        if (depth === 0) {
          values.push(current.trim());
          current = '';
          continue;
        }
      } else if (char === ',' && depth === 0) {
        continue;
      }
    }

    if (depth > 0) {
      current += char;
    }
  }

  if (current.trim()) {
    values.push(current.trim());
  }

  return values;
}

function parseTuple(tuple: string): string[] {
  const inner = tuple.replace(/^\(/, '').replace(/\)$/, '');
  const columns: string[] = [];
  let current = '';
  let inString = false;
  let stringQuote = '';

  for (let index = 0; index < inner.length; index += 1) {
    const char = inner[index];
    const previous = inner[index - 1];

    if ((char === "'" || char === '"') && previous !== '\\') {
      if (!inString) {
        inString = true;
        stringQuote = char;
      } else if (char === stringQuote) {
        inString = false;
        stringQuote = '';
      }
    }

    if (char === ',' && !inString) {
      columns.push(unquote(current));
      current = '';
      continue;
    }

    current += char;
  }

  if (current.length > 0) {
    columns.push(unquote(current));
  }

  return columns;
}

function extractInsertTuples(sql: string, tableName: string): string[] {
  const pattern = new RegExp(
    `INSERT\\s+INTO\\s+\`?${tableName}\`?\\s*(?:\\([^)]+\\))?\\s*VALUES\\s*([\\s\\S]*?);`,
    'gi',
  );
  const tuples: string[] = [];

  for (const match of sql.matchAll(pattern)) {
    tuples.push(...splitInsertValues(match[1] ?? ''));
  }

  return tuples;
}

function normalizePostalCode(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed || trimmed === '0') {
    return null;
  }

  return trimmed;
}

export function parseProvinciasImportSql(sql: string): ImportProvinciaRow[] {
  const tuples = extractInsertTuples(sql, 'assurant_provincias');

  return tuples.map((tuple) => {
    const [, status, provinceKey, , name, isoCode] = parseTuple(tuple);

    return {
      active: status === '1',
      provinceKey,
      name,
      isoCode,
    };
  });
}

export function parseLocalidadesImportSql(sql: string): ImportLocalidadRow[] {
  const tuples = extractInsertTuples(sql, 'assurant_localidades');

  return tuples.map((tuple) => {
    const [id, status, provinceKey, , name, postalCode] = parseTuple(tuple);

    return {
      sourceId: Number.parseInt(id, 10),
      active: status === '1',
      provinceKey,
      name: name.trim(),
      postalCode: normalizePostalCode(postalCode),
    };
  });
}

export function readGeoImportSql(relativePath: string): string {
  return readFileSync(
    join(__dirname, '..', 'seed-data', relativePath),
    'utf8',
  );
}
