import {
  CABA_PROVINCE_KEY,
  extractCabaBarrioName,
  normalizeGeoName,
  type ImportLocalidadRow,
} from './parse-geo-import-sql';

export type SeedLocalityRow = {
  provinceKey: string;
  name: string;
  postalCode: string | null;
};

function resolveLocalityKey(
  row: ImportLocalidadRow,
): { key: string; name: string } | null {
  if (row.provinceKey === CABA_PROVINCE_KEY) {
    const barrio = extractCabaBarrioName(row.name);

    if (!barrio) {
      return null;
    }

    return {
      key: `${CABA_PROVINCE_KEY}::${normalizeGeoName(barrio)}`,
      name: barrio,
    };
  }

  return {
    key: `${row.provinceKey}::${normalizeGeoName(row.name)}`,
    name: row.name.trim(),
  };
}

export function dedupeActiveLocalities(
  rows: ImportLocalidadRow[],
): SeedLocalityRow[] {
  const groups = new Map<string, ImportLocalidadRow[]>();

  for (const row of rows) {
    if (!row.active) {
      continue;
    }

    const resolved = resolveLocalityKey(row);

    if (!resolved) {
      continue;
    }

    const list = groups.get(resolved.key) ?? [];
    list.push(row);
    groups.set(resolved.key, list);
  }

  const result: SeedLocalityRow[] = [];

  for (const group of groups.values()) {
    const winner = group.reduce((best, current) =>
      current.sourceId < best.sourceId ? current : best,
    );
    const resolved = resolveLocalityKey(winner);

    if (!resolved) {
      continue;
    }

    result.push({
      provinceKey: winner.provinceKey,
      name: resolved.name,
      postalCode: winner.postalCode,
    });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name, 'es'));
}
