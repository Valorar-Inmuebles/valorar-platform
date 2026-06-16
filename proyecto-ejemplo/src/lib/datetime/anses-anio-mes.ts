const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export function parseAnioMes(value: string): number | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;

  return year * 12 + month;
}

export function isValidAnioMesWithinLast12Months(anioMes: string): boolean {
  const key = parseAnioMes(anioMes);
  if (key === null) return false;

  const now = new Date();
  const currentKey = now.getFullYear() * 12 + (now.getMonth() + 1);
  const oldestKey = currentKey - 11;

  return key >= oldestKey && key <= currentKey;
}

export function buildLast12AnioMesOptions(): Array<{ value: string; label: string }> {
  const now = new Date();
  const options: Array<{ value: string; label: string }> = [];

  for (let i = 0; i < 5; i += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const value = `${year}-${String(month).padStart(2, "0")}`;
    options.push({
      value,
      label: `${MESES[month - 1]} ${year}`,
    });
  }

  return options;
}
