/**
 * GEO-001 dataset audit — read-only analysis of provincias.sql / localidades.sql
 * Run: node prisma/scripts/audit-geo-import-dataset.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const seedDataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'seed-data');
const CABA_KEY = 'C';

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
  return values;
}

function parseTuple(tuple) {
  const cols = [];
  let cur = '';
  let inStr = false;
  let q = '';
  const inner = tuple.replace(/^\(/, '').replace(/\)$/, '');
  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner[i];
    const pr = inner[i - 1];
    if ((ch === "'" || ch === '"') && pr !== '\\') {
      if (!inStr) {
        inStr = true;
        q = ch;
      } else if (ch === q) inStr = false;
    }
    if (ch === ',' && !inStr) {
      cols.push(unquote(cur));
      cur = '';
      continue;
    }
    cur += ch;
  }
  cols.push(unquote(cur));
  return cols;
}

function unquote(v) {
  const t = v.trim();
  if (t.toUpperCase() === 'NULL') return null;
  if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"')))
    return t.slice(1, -1);
  return t;
}

function normName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function extractCabaBarrio(nombre) {
  const m = nombre.trim().match(/^CABA\s*-\s*(.+)$/i);
  return m ? m[1].trim() : null;
}

function loadProvincias() {
  const sql = readFileSync(join(seedDataDir, 'provincias.sql'), 'utf8');
  return extractInsertTuples(sql, 'assurant_provincias').map((tuple) => {
    const [id, status, cod, branchCode, nombre, isoCode] = parseTuple(tuple);
    return {
      id,
      status: status === '1',
      cod,
      branchCode,
      nombre: nombre.trim(),
      isoCode,
    };
  });
}

function loadLocalidades(provinciaByCod) {
  const sql = readFileSync(join(seedDataDir, 'localidades.sql'), 'utf8');
  return extractInsertTuples(sql, 'assurant_localidades').map((tuple) => {
    const [id, status, provinciaCod, cod, nombre, cp, preftel] = parseTuple(tuple);
    const cpNorm = cp && cp !== '0' ? cp.trim() : null;
    return {
      id,
      status: status === '1',
      provinciaCod,
      provinceName: provinciaByCod.get(provinciaCod)?.nombre ?? provinciaCod,
      cod,
      nombre: nombre.trim(),
      cp: cpNorm,
      preftel,
      isCaba: provinciaCod === CABA_KEY,
      cabaBarrio: provinciaCod === CABA_KEY ? extractCabaBarrio(nombre) : null,
    };
  });
}

function groupByKey(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    const g = map.get(key) ?? [];
    g.push(row);
    map.set(key, g);
  }
  return map;
}

function analyzeDuplicateGroups(groups, label) {
  const multi = [...groups.entries()].filter(([, rows]) => rows.length > 1);
  const multiActive = multi.filter(([, rows]) => rows.filter((r) => r.status).length > 1);
  const multiActiveSameCp = multiActive.filter(([, rows]) => {
    const active = rows.filter((r) => r.status);
    return new Set(active.map((r) => r.cp ?? 'NULL')).size === 1;
  });
  const multiActiveDiffCp = multiActive.filter(([, rows]) => {
    const active = rows.filter((r) => r.status);
    return new Set(active.map((r) => r.cp ?? 'NULL')).size > 1;
  });

  return {
    label,
    uniqueKeys: groups.size,
    keysWithMultipleRows: multi.length,
    keysWithMultipleActiveRows: multiActive.length,
    keysWithMultipleActiveSameCp: multiActiveSameCp.length,
    keysWithMultipleActiveDiffCp: multiActiveDiffCp.length,
    multi,
    multiActive,
    multiActiveSameCp,
    multiActiveDiffCp,
  };
}

function summarizeGroup(rows) {
  const active = rows.filter((r) => r.status);
  const inactive = rows.filter((r) => !r.status);
  const cps = [...new Set(rows.map((r) => r.cp ?? 'NULL'))].sort();
  const activeCps = [...new Set(active.map((r) => r.cp ?? 'NULL'))].sort();
  return {
    rowCount: rows.length,
    activeCount: active.length,
    inactiveCount: inactive.length,
    postalCodes: cps,
    activePostalCodes: activeCps,
    ids: rows.map((r) => r.id),
    codes: rows.map((r) => r.cod),
  };
}

// --- main ---
const provincias = loadProvincias();
const provinciaByCod = new Map(provincias.map((p) => [p.cod, p]));
const localidades = loadLocalidades(provinciaByCod);

const cabaRows = localidades.filter((r) => r.isCaba);
const nonCaba = localidades.filter((r) => !r.isCaba);

const byProvinceName = groupByKey(nonCaba, (r) => `${r.provinciaCod}::${normName(r.nombre)}`);
const byProvinceNameActive = groupByKey(
  nonCaba.filter((r) => r.status),
  (r) => `${r.provinciaCod}::${normName(r.nombre)}`,
);

const dupAnalysis = analyzeDuplicateGroups(byProvinceName, 'province+name (all rows)');
const dupActiveAnalysis = analyzeDuplicateGroups(
  byProvinceNameActive,
  'province+name (active only)',
);

// Duplicate pattern breakdown (non-CABA)
let singleRowGroups = 0;
let oneActiveManyInactive = 0;
let zeroActiveManyInactive = 0;
let multiActiveGroups = 0;

for (const rows of byProvinceName.values()) {
  if (rows.length === 1) {
    singleRowGroups += 1;
    continue;
  }
  const active = rows.filter((r) => r.status);
  if (active.length > 1) multiActiveGroups += 1;
  else if (active.length === 1) oneActiveManyInactive += 1;
  else zeroActiveManyInactive += 1;
}

const duplicatePatterns = {
  singleRowGroups,
  oneActiveManyInactive,
  zeroActiveManyInactive,
  multiActiveGroups,
};

// Buenos Aires La Plata explicit lookup
const baLaPlata = nonCaba.filter(
  (r) => r.provinciaCod === 'B' && normName(r.nombre) === 'la plata',
);

// CABA barrios
const cabaByBarrio = groupByKey(
  cabaRows.filter((r) => r.cabaBarrio),
  (r) => normName(r.cabaBarrio),
);
const cabaBarrioDup = [...cabaByBarrio.entries()].filter(([, rows]) => rows.length > 1);
const cabaBarrioActiveDup = cabaBarrioDup.filter(
  ([, rows]) => rows.filter((r) => r.status).length > 1,
);

// Unique counts
const uniqueActiveLocalities = byProvinceNameActive.size;
const uniqueAllLocalities = byProvinceName.size;

// Status breakdown
const activeRows = nonCaba.filter((r) => r.status).length;
const inactiveRows = nonCaba.filter((r) => !r.status).length;

// Examples: multiple active same name different CP
const examplesMultiActiveDiffCp = dupAnalysis.multiActiveDiffCp.slice(0, 15).map(([key, rows]) => {
  const [cod, nameKey] = key.split('::');
  const province = provinciaByCod.get(cod)?.nombre ?? cod;
  return {
    province,
    locality: rows[0].nombre,
    ...summarizeGroup(rows),
  };
});

// Examples: multiple active same CP (true duplicates?)
const examplesMultiActiveSameCp = dupAnalysis.multiActiveSameCp.slice(0, 10).map(([key, rows]) => {
  const [cod] = key.split('::');
  return {
    province: provinciaByCod.get(cod)?.nombre ?? cod,
    locality: rows[0].nombre,
    ...summarizeGroup(rows),
  };
});

// Homonym analysis: same name different province OK
const nameOnlyGroups = groupByKey(nonCaba, (r) => normName(r.nombre));
const homonymsCrossProvince = [...nameOnlyGroups.entries()].filter(([, rows]) => {
  const provs = new Set(rows.map((r) => r.provinciaCod));
  return provs.size > 1;
});

const report = {
  generatedAt: new Date().toISOString(),
  script: 'audit-geo-import-dataset.mjs',
  summary: {
    provincias: provincias.length,
    localidadRowsTotal: localidades.length,
    localidadRowsNonCaba: nonCaba.length,
    localidadRowsCaba: cabaRows.length,
    localidadesActivasNonCaba: activeRows,
    localidadesInactivasNonCaba: inactiveRows,
    uniqueLocalitiesByProvinceAndName: uniqueAllLocalities,
    uniqueActiveLocalitiesByProvinceAndName: uniqueActiveLocalities,
    cabaBarriosUnique: cabaByBarrio.size,
    cabaRowsTotal: cabaRows.length,
    cabaRowsActive: cabaRows.filter((r) => r.status).length,
  },
  duplicates: {
    keysWithMultipleRows: dupAnalysis.keysWithMultipleRows,
    keysWithMultipleActiveRows: dupAnalysis.keysWithMultipleActiveRows,
    keysWithMultipleActiveSameCp: dupAnalysis.keysWithMultipleActiveSameCp,
    keysWithMultipleActiveDiffCp: dupAnalysis.keysWithMultipleActiveDiffCp,
    pctKeysWithMultipleRows: `${((dupAnalysis.keysWithMultipleRows / uniqueAllLocalities) * 100).toFixed(2)}%`,
    pctKeysWithMultipleActiveRows: `${((dupAnalysis.keysWithMultipleActiveRows / uniqueActiveLocalities) * 100).toFixed(2)}%`,
  },
  caba: {
    uniqueBarrios: cabaByBarrio.size,
    barriosWithMultipleRows: cabaBarrioDup.length,
    barriosWithMultipleActiveRows: cabaBarrioActiveDup.length,
  },
  duplicatePatterns,
  baLaPlata: baLaPlata.length
    ? {
        province: 'Buenos Aires',
        ...summarizeGroup(baLaPlata),
        rows: baLaPlata.map((r) => ({
          id: r.id,
          status: r.status,
          cp: r.cp,
          cod: r.cod,
          nombre: r.nombre,
        })),
      }
    : null,
  laPlataHomonyms: nonCaba
    .filter((r) => normName(r.nombre) === 'la plata')
    .map((r) => ({
      province: r.provinceName,
      id: r.id,
      status: r.status,
      cp: r.cp,
      cod: r.cod,
    })),
  examples: {
    multiActiveDifferentCp: examplesMultiActiveDiffCp,
    multiActiveSameCp: examplesMultiActiveSameCp,
    cabaMultiActiveBarrio: cabaBarrioActiveDup.slice(0, 5).map(([barrio, rows]) => ({
      barrio: rows[0].cabaBarrio,
      ...summarizeGroup(rows),
    })),
  },
  homonymsCrossProvince: homonymsCrossProvince.length,
};

const outPath = join(dirname(fileURLToPath(import.meta.url)), 'audit-geo-import-dataset.output.json');
// Optional local output — remove file after review; not committed.
try { writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8'); } catch {}

console.log(JSON.stringify(report, null, 2));
console.error(`\nFull JSON written to: ${outPath}`);
