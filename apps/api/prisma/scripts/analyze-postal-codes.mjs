import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const seedDataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'seed-data');

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

  return values;
}

function parseTuple(tuple) {
  const columns = [];
  let current = '';
  let inString = false;
  let stringQuote = '';
  const inner = tuple.replace(/^\(/, '').replace(/\)$/, '');

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

  columns.push(unquote(current));
  return columns;
}

function unquote(value) {
  const trimmed = value.trim();
  if (trimmed.toUpperCase() === 'NULL') return null;
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function normalizePostalCode(value) {
  if (!value || value === '0') return null;
  return value.trim();
}

function normalizeName(value) {
  return value.trim().toLowerCase();
}

const provincias = extractInsertTuples(
  readFileSync(join(seedDataDir, 'provincias.sql'), 'utf8'),
  'assurant_provincias',
).map((tuple) => {
  const [, status, subdivisionCode, , nombre, isoCode] = parseTuple(tuple);
  return { status: status === '1', subdivisionCode, nombre, isoCode };
});

const provinciaNameByCode = new Map(
  provincias.map((row) => [row.subdivisionCode, row.nombre]),
);

const localidades = extractInsertTuples(
  readFileSync(join(seedDataDir, 'localidades.sql'), 'utf8'),
  'assurant_localidades',
)
  .map((tuple) => {
    const [, status, subdivisionCode, , nombre, cp] = parseTuple(tuple);
    return {
      status: status === '1',
      subdivisionCode,
      provinceName: provinciaNameByCode.get(subdivisionCode) ?? subdivisionCode,
      nombre: nombre.trim(),
      postalCode: normalizePostalCode(cp),
    };
  })
  .filter((row) => row.subdivisionCode !== 'C');

const groups = new Map();

for (const row of localidades) {
  const key = `${row.subdivisionCode}::${normalizeName(row.nombre)}`;
  const group = groups.get(key) ?? {
    provinceName: row.provinceName,
    nombre: row.nombre,
    rows: [],
    postalCodes: new Set(),
    activePostalCodes: new Set(),
  };

  group.rows.push(row);
  if (row.postalCode) {
    group.postalCodes.add(row.postalCode);
    if (row.status) group.activePostalCodes.add(row.postalCode);
  }

  groups.set(key, group);
}

const duplicateNameGroups = [...groups.values()].filter((g) => g.rows.length > 1);
const multipleCpGroups = [...groups.values()].filter((g) => g.postalCodes.size > 1);
const multipleActiveCpGroups = [...groups.values()].filter(
  (g) => g.activePostalCodes.size > 1,
);
const singleCpGroups = [...groups.values()].filter(
  (g) => g.rows.length === 1 && g.postalCodes.size <= 1,
);

console.log('=== POSTAL CODE ANALYSIS (non-CABA localities) ===');
console.log('Total import rows (non-CABA):', localidades.length);
console.log('Unique locality keys (province + name):', groups.size);
console.log('Groups with duplicate rows (same province + name):', duplicateNameGroups.length);
console.log('Groups with multiple distinct CP (any status):', multipleCpGroups.length);
console.log('Groups with multiple distinct CP (active rows only):', multipleActiveCpGroups.length);
console.log('Groups with single row and single CP:', singleCpGroups.length);

if (multipleCpGroups.length > 0) {
  console.log('\nSamples — multiple CP per locality name:');
  for (const group of multipleCpGroups.slice(0, 10)) {
    console.log({
      province: group.provinceName,
      locality: group.nombre,
      rowCount: group.rows.length,
      postalCodes: [...group.postalCodes].sort(),
      activePostalCodes: [...group.activePostalCodes].sort(),
    });
  }
}

if (duplicateNameGroups.length > 0 && multipleCpGroups.length === 0) {
  console.log('\nDuplicate names exist but all share the same CP.');
}

console.log('\n=== CONCLUSION ===');
if (multipleCpGroups.length > 0) {
  console.log(
    'FINDING: Same locality name within a province CAN have multiple distinct postal codes.',
  );
  console.log(
    `Affected groups: ${multipleCpGroups.length} of ${groups.size} unique localities (${((multipleCpGroups.length / groups.size) * 100).toFixed(2)}%)`,
  );
} else {
  console.log('FINDING: Each unique locality (province + name) has at most one postal code.');
}
