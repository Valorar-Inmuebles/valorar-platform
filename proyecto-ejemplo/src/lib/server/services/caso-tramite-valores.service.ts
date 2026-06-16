import type { DbContext } from "@/BBDD/base/types";
import type { ValorDinamicoRow } from "@/lib/server/types/bbdd";
import {
  valoresDinamicosRepository,
  type ValorDinamicoWriteRow,
} from "@/BBDD/repositories/valores-dinamicos.repository";
import type { CasoTramiteCampoDto } from "./caso-tramite.types";
import {
  looksLikeRuntimeDateString,
  normalizeIsoDateString,
} from "@/lib/formatting/normalize-iso-date";

const CASO_ENTIDAD = "caso";

export class CasoTramiteValoresValidationError extends Error {
  constructor(public readonly errors: Record<string, string>) {
    super("Errores de validación en campos del trámite");
    this.name = "CasoTramiteValoresValidationError";
  }
}

export type ValorDinamicoInput = {
  campo_id: string;
  valor: unknown;
};

function normalizeTipo(tipo: string): string {
  const t = tipo.trim().toLowerCase();
  if (t === "fecha") return "date";
  if (t === "numero") return "number";
  if (t === "bool") return "boolean";
  return t;
}

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function parseMultiselectStored(valor: string | null): string[] {
  if (!valor?.trim()) return [];
  const trimmed = valor.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      /* fall through */
    }
  }
  return trimmed
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function mapDbRowToRuntimeValue(
  tipo: string,
  row: ValorDinamicoRow,
): unknown {
  const t = normalizeTipo(tipo);

  if (t === "number") return row.valor_numero ?? "";
  if (t === "date") {
    const iso = normalizeIsoDateString(row.valor_fecha);
    if (iso !== "") return iso;

    const fromTexto = row.valor_texto?.trim() ?? "";
    if (fromTexto !== "" && looksLikeRuntimeDateString(fromTexto)) {
      const isoFromTexto = normalizeIsoDateString(fromTexto);
      if (isoFromTexto !== "") {
        console.warn("[tramite-date] fallback valor_texto used", {
          campoId: row.campo_dinamico_id,
          valor_texto: row.valor_texto,
        });
        return isoFromTexto;
      }
    }

    return "";
  }
  if (t === "boolean") return row.valor_boolean ?? false;
  if (t === "multiselect") return parseMultiselectStored(row.valor_texto);

  return row.valor_texto ?? "";
}

export function mapRuntimeValueToDbRow(
  campo: CasoTramiteCampoDto,
  valor: unknown,
): ValorDinamicoWriteRow {
  const t = normalizeTipo(campo.tipo);
  const base = {
    campo_dinamico_id: campo.campo_id,
    valor_texto: null as string | null,
    valor_numero: null as number | null,
    valor_fecha: null as string | null,
    valor_boolean: null as boolean | null,
  };

  if (isBlank(valor)) return base;

  if (t === "number") {
    const n =
      typeof valor === "number"
        ? valor
        : Number(String(valor).replace(",", "."));
    return { ...base, valor_numero: Number.isFinite(n) ? n : null };
  }

  if (t === "date") {
    const iso = normalizeIsoDateString(valor);
    return { ...base, valor_fecha: iso === "" ? null : iso };
  }

  if (t === "boolean") {
    if (typeof valor === "boolean") {
      return { ...base, valor_boolean: valor };
    }
    const v = String(valor).trim().toLowerCase();
    return {
      ...base,
      valor_boolean:
        v === "true" || v === "1" || v === "yes" || v === "si" || v === "sí",
    };
  }

  if (t === "multiselect") {
    const arr = Array.isArray(valor)
      ? valor.map(String)
      : parseMultiselectStored(String(valor));
    return { ...base, valor_texto: JSON.stringify(arr) };
  }

  return { ...base, valor_texto: String(valor) };
}

export function buildDefaultRuntimeValue(campo: CasoTramiteCampoDto): unknown {
  const t = normalizeTipo(campo.tipo);
  const def = campo.valor_default;

  if (t === "boolean") {
    if (def == null) return false;
    const v = def.trim().toLowerCase();
    return v === "true" || v === "1" || v === "yes" || v === "si" || v === "sí";
  }

  if (t === "multiselect") {
    return parseMultiselectStored(def);
  }

  if (t === "number") {
    if (def == null || def.trim() === "") return "";
    const n = Number(def);
    return Number.isFinite(n) ? n : "";
  }

  if (t === "date") {
    if (def == null || def.trim() === "") return "";
    return normalizeIsoDateString(def);
  }

  return def ?? "";
}

export function mapRowsToValoresRecord(
  campos: CasoTramiteCampoDto[],
  rows: ValorDinamicoRow[],
): Record<string, unknown> {
  const byCampo = new Map(rows.map((r) => [r.campo_dinamico_id, r]));
  const valores: Record<string, unknown> = {};

  for (const campo of campos) {
    const row = byCampo.get(campo.campo_id);
    valores[campo.campo_id] = row
      ? mapDbRowToRuntimeValue(campo.tipo, row)
      : buildDefaultRuntimeValue(campo);
  }

  return valores;
}

function validateCampoValue(
  campo: CasoTramiteCampoDto,
  valor: unknown,
): string | null {
  const t = normalizeTipo(campo.tipo);
  const blank = isBlank(valor);

  if (campo.obligatorio && blank) {
    return "Este campo es obligatorio";
  }

  if (blank) return null;

  if (t === "select") {
    const v = String(valor);
    const allowed = new Set(campo.opciones.map((o) => o.valor));
    if (!allowed.has(v)) return "Seleccioná una opción válida";
    return null;
  }

  if (t === "multiselect") {
    const values = Array.isArray(valor)
      ? valor.map(String)
      : parseMultiselectStored(String(valor));
    const allowed = new Set(campo.opciones.map((o) => o.valor));
    for (const v of values) {
      if (!allowed.has(v)) return "Hay opciones inválidas seleccionadas";
    }
    return null;
  }

  if (t === "number") {
    const n =
      typeof valor === "number"
        ? valor
        : Number(String(valor).replace(",", "."));
    if (!Number.isFinite(n)) return "Ingresá un número válido";
    if (campo.minimo != null && n < campo.minimo) {
      return `El valor mínimo es ${campo.minimo}`;
    }
    if (campo.maximo != null && n > campo.maximo) {
      return `El valor máximo es ${campo.maximo}`;
    }
    return null;
  }

  if (t === "date") {
    const iso = normalizeIsoDateString(valor);
    if (iso === "") return "Fecha inválida";
    return null;
  }

  const textValue = String(valor);

  if (
    (t === "text" || t === "textarea" || t === "select") &&
    campo.longitud_maxima != null &&
    textValue.length > campo.longitud_maxima
  ) {
    return `Máximo ${campo.longitud_maxima} caracteres`;
  }

  if (
    (t === "text" || t === "textarea") &&
    campo.regex?.trim()
  ) {
    try {
      const re = new RegExp(campo.regex);
      if (!re.test(textValue)) return "El valor no cumple el formato requerido";
    } catch {
      /* ignore invalid catalog regex */
    }
  }

  return null;
}

export function validateValoresAgainstCampos(
  campos: CasoTramiteCampoDto[],
  inputs: ValorDinamicoInput[] | undefined,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const campoMap = new Map(campos.map((c) => [c.campo_id, c]));
  const inputMap = new Map(
    (inputs ?? []).map((item) => [item.campo_id, item.valor]),
  );

  for (const id of inputMap.keys()) {
    if (!campoMap.has(id)) {
      errors[id] = "Campo no pertenece a la plantilla activa";
    }
  }

  for (const campo of campos) {
    const valor = inputMap.has(campo.campo_id)
      ? inputMap.get(campo.campo_id)
      : undefined;
    const message = validateCampoValue(campo, valor);
    if (message) errors[campo.campo_id] = message;
  }

  return errors;
}

type Ctx = DbContext & { tenant_id: string };

export const casoTramiteValoresService = {
  validateValoresAgainstCampos,
  mapRowsToValoresRecord,
  buildDefaultRuntimeValue,

  async persistForCaso(
    ctx: Ctx,
    casoId: string,
    campos: CasoTramiteCampoDto[],
    inputs: ValorDinamicoInput[] | undefined,
  ): Promise<void> {
    const errors = validateValoresAgainstCampos(campos, inputs);
    if (Object.keys(errors).length > 0) {
      throw new CasoTramiteValoresValidationError(errors);
    }

    const inputMap = new Map(
      (inputs ?? []).map((item) => [item.campo_id, item.valor]),
    );

    const rows: ValorDinamicoWriteRow[] = campos.map((campo) =>
      mapRuntimeValueToDbRow(campo, inputMap.get(campo.campo_id)),
    );

    await valoresDinamicosRepository.replaceForEntidad(
      ctx,
      CASO_ENTIDAD,
      casoId,
      rows,
    );
  },
};
