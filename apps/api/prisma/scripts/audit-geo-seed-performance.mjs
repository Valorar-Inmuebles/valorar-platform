/**
 * GEO-001 seed performance audit — read-only (no DB).
 * Run: node prisma/scripts/audit-geo-seed-performance.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const seedDataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'seed-data');
const CABA_KEY = 'C';

// --- inline minimal parser (same logic as seed-utils) for standalone run ---

function extractInsertTuples(sql, tableName) {
  const pattern = new RegExp(
    `INSERT\\s+INTO\\s+\`?${tableName}\`?\\s*(?:\\([^)]+\\))?\\s*VALUES\\s*([\\s\\S]*?);`,
    'gi',
  );
  const tuples = [];
  for (const match of sql.matchAll(pattern)) {
    tuples.push(...splitInsertValues(match[1] ?? ''));
  }
  return tuples;
}

function splitInsertValues(valuesSection) {
  const values = [];
  let current = '';
  let depth = 0;
  let inString = false;
  let stringQuote = '';

  for (let i = 0; i < valuesSection.length; i += 1) {
    const char = valuesSection[i];
    const prev = valuesSection[i - 1];
    if ((char === "'" || char === '"') && prev !== '\\') {
      if (!inString) {
        inString = true;
        stringQuote = char;
      } else if (char === stringQuote) inString = false;
    }
    if (!inString) {
      if (char === '(') depth += 1;
      else if (char === ')') {
        depth -= 1;
        if (depth === 0) {
          values.push(current.trim());
          current = '';
          continue;
        }
      } else if (char === ',' && depth === 0) continue;
    }
    if (depth > 0) current += char;
  }
  if (current.trim()) values.push(current.trim());
  return values;
}

function parseTuple(tuple) {
  const inner = tuple.replace(/^\(/, '').replace(/\)$/, '');
  const columns = [];
  let current = '';
  let inString = false;
  let stringQuote = '';
  for (let i = 0; i < inner.length; i += 1) {
    const char = inner[i];
    const prev = inner[i - 1];
    if ((char === "'" || char === '"') && prev !== '\\') {
      if (!inString) {
        inString = true;
        stringQuote = char;
      } else if (char === stringQuote) inString = false;
    }
    if (char === ',' && !inString) {
      columns.push(unquote(current));
      current = '';
      continue;
    }
    current += char;
  }
  if (current.length > 0) columns.push(unquote(current));
  return columns;
}

function unquote(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1).replace(/\\'/g, "'");
  }
  if (trimmed.toUpperCase() === 'NULL') return '';
  return trimmed;
}

function normName(name) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function extractCabaBarrio(name) {
  const match = name.trim().match(/^CABA\s*-\s*(.+)$/i);
  return match ? match[1].trim() : null;
}

function dedupeActive(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (!row.active) continue;
    let key;
    if (row.provinciaCod === CABA_KEY) {
      const barrio = extractCabaBarrio(row.nombre);
      if (!barrio) continue;
      key = `${CABA_KEY}::${normName(barrio)}`;
    } else {
      key = `${row.provinciaCod}::${normName(row.nombre)}`;
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const result = [];
  for (const group of groups.values()) {
    const winner = group.reduce((a, b) => (a.id < b.id ? a : b));
    result.push(winner);
  }
  result.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  return result;
}

function loadLocalidades() {
  const sql = readFileSync(join(seedDataDir, 'localidades.sql'), 'utf8');
  return extractInsertTuples(sql, 'assurant_localidades').map((tuple) => {
    const [id, status, provinciaCod, , nombre] = parseTuple(tuple);
    return {
      id: Number.parseInt(id, 10),
      active: status === '1',
      provinciaCod,
      nombre: nombre.trim(),
    };
  });
}

// --- audit ---

const localidades = loadLocalidades();
const deduped = dedupeActive(localidades);

const SEQUENTIAL_UPSERT_MS = 1150; // observed ~786 rows in 15 min on remote Neon
const BATCH_SIZE = 500;
const BATCH_INSERT_MS = 200;

const report = {
  phases: {
    parseAndDedupe: `${deduped.length} unique active localities from ${localidades.length} SQL rows`,
  },
  bottleneck: {
    cause: 'Sequential await prisma.locality.upsert() per record over remote PostgreSQL',
    infiniteLoop: false,
    pendingPromiseDeadlock: false,
    sequentialUpserts: true,
    upsertsRequired: deduped.length,
  },
  estimates: {
    sequentialUpsertTotalMinutes: Math.round(
      (deduped.length * SEQUENTIAL_UPSERT_MS) / 60000,
    ),
    rowsAt15Minutes: Math.floor((15 * 60 * 1000) / SEQUENTIAL_UPSERT_MS),
    batchCreateManyBatches: Math.ceil(deduped.length / BATCH_SIZE),
    batchCreateManySeconds: Math.round(
      (Math.ceil(deduped.length / BATCH_SIZE) * BATCH_INSERT_MS) / 1000,
    ),
  },
  recommendation:
    'Replace per-row upserts with deleteMany + createMany in batches of 500 with progress logs',
};

console.log(JSON.stringify(report, null, 2));
