"use client";

import { useEffect, useRef, useState } from "react";
import {
  getPlantillaCampos,
  getCasoTramite,
  type CasoTramiteCampoDto,
  type CasoTramitePlantillaCamposResponse,
  type CasoTramiteWithValoresResponse,
} from "@/lib/api/caso-tramite";
import {
  Card,
  CardContent,
  CardHeader,
  CardHeaderActions,
  CardTitle,
} from "@/components/ui/card";
import {
  FormField,
  Label,
  HelperText,
  ErrorMessage,
} from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { DateInputPicker } from "@/components/ui/date-input-picker";
import { Select, MultiSelect, type SelectOption } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  looksLikeRuntimeDateString,
  normalizeIsoDateString,
} from "@/lib/formatting/normalize-iso-date";

const SIN_PLANTILLA_MENSAJE =
  "No existen plantillas configuradas para esta práctica.";

const SIN_PLANTILLA_SELECCIONADA_MENSAJE =
  "Seleccioná una plantilla para cargar los datos del trámite.";

const textareaClassName =
  "flex min-h-[4.5rem] w-full resize-y rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-900 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500";

const COL_SPAN_SM: Record<number, string> = {
  1: "sm:col-span-1",
  2: "sm:col-span-2",
  3: "sm:col-span-3",
  4: "sm:col-span-4",
  5: "sm:col-span-5",
  6: "sm:col-span-6",
  7: "sm:col-span-7",
  8: "sm:col-span-8",
  9: "sm:col-span-9",
  10: "sm:col-span-10",
  11: "sm:col-span-11",
  12: "sm:col-span-12",
};

type CasoTramiteFieldsCardProps = {
  practicaId: string | undefined;
  plantillaId?: string | null;
  storedCasoPlantillaId?: string | null;
  /** Plantilla at form load (includes legacy resolution when plantilla_id is null). */
  baselinePlantillaId?: string | null;
  plantillaOptions?: SelectOption[];
  plantillasLoading?: boolean;
  plantillaRequired?: boolean;
  plantillaDisabled?: boolean;
  plantillaError?: string | null;
  onPlantillaChange?: (plantillaId: string | null) => void;
  casoId?: string | null;
  readOnly?: boolean;
  valores?: Record<string, unknown>;
  onValoresChange?: (valores: Record<string, unknown>) => void;
  fieldErrors?: Record<string, string>;
  onEffectivePlantillaIdChange?: (plantillaId: string | null) => void;
};

function normalizeTipo(tipo: string): string {
  const t = tipo.trim().toLowerCase();
  if (t === "fecha") return "date";
  if (t === "numero") return "number";
  if (t === "bool") return "boolean";
  return t;
}

function parseBooleanDefault(valor: string | null): boolean {
  if (!valor) return false;
  const v = valor.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "si" || v === "sí";
}

function parseMultiselectValues(valor: unknown): string[] {
  if (Array.isArray(valor)) return valor.map(String);
  if (typeof valor !== "string" || !valor.trim()) return [];
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

function buildDefaultRuntimeValue(campo: CasoTramiteCampoDto): unknown {
  const t = normalizeTipo(campo.tipo);
  const def = campo.valor_default;

  if (t === "boolean") return parseBooleanDefault(def);
  if (t === "multiselect") return parseMultiselectValues(def);
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

function buildDefaultsFromCampos(
  campos: CasoTramiteCampoDto[],
): Record<string, unknown> {
  const valores: Record<string, unknown> = {};
  for (const campo of campos) {
    valores[campo.campo_id] = buildDefaultRuntimeValue(campo);
  }
  return valores;
}

/** Replace dynamic values with only keys from the active plantilla fields. */
function buildValoresForCampos(
  campos: CasoTramiteCampoDto[],
  options: {
    previousValores?: Record<string, unknown>;
    storedValores?: Record<string, unknown> | null;
  } = {},
): Record<string, unknown> {
  const defaults = buildDefaultsFromCampos(campos);
  const carrySource =
    options.storedValores != null
      ? options.storedValores
      : (options.previousValores ?? {});
  const next: Record<string, unknown> = {};

  for (const campo of campos) {
    const carried = carrySource[campo.campo_id];
    next[campo.campo_id] =
      carried !== undefined
        ? normalizeRuntimeFieldValue(carried, campo.tipo)
        : defaults[campo.campo_id];
  }

  return next;
}

function getGridClass(anchoGrilla: number): string {
  const n = Math.min(12, Math.max(1, anchoGrilla || 12));
  return `col-span-12 ${COL_SPAN_SM[n] ?? "sm:col-span-12"}`;
}

/** Normalize a single runtime value for local state and API payload. */
export function normalizeRuntimeFieldValue(
  valor: unknown,
  tipo?: string,
): unknown {
  const t = tipo ? normalizeTipo(tipo) : null;

  if (valor === null || valor === undefined) {
    if (t === "boolean") return false;
    if (t === "multiselect") return [];
    return "";
  }

  if (t === "multiselect") {
    return Array.isArray(valor)
      ? valor.map(String)
      : parseMultiselectValues(valor);
  }

  if (t === "boolean") return Boolean(valor);

  if (t === "number") {
    if (valor === "") return "";
    if (typeof valor === "number") return valor;
    const raw = String(valor).trim();
    return raw === "" ? "" : raw;
  }

  if (t === "date") {
    return normalizeIsoDateString(valor);
  }

  return typeof valor === "string" ? valor : String(valor);
}

export function normalizeRuntimeValoresRecord(
  valores: Record<string, unknown>,
  campos: CasoTramiteCampoDto[] = [],
): Record<string, unknown> {
  const tipoById = new Map(campos.map((c) => [c.campo_id, c.tipo]));
  const normalized: Record<string, unknown> = {};

  for (const [campoId, valor] of Object.entries(valores)) {
    normalized[campoId] = normalizeRuntimeFieldValue(
      valor,
      tipoById.get(campoId),
    );
  }

  return normalized;
}

/** Payload-safe normalization when field metadata is unavailable. */
export function normalizeRuntimeValorForPayload(valor: unknown): unknown {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "boolean") return valor;
  if (typeof valor === "number") return valor;
  if (Array.isArray(valor)) return valor.map(String);
  if (typeof valor === "string") {
    const trimmed = valor.trim();
    if (trimmed === "") return "";
    if (looksLikeRuntimeDateString(trimmed)) {
      return normalizeIsoDateString(trimmed);
    }
    return trimmed;
  }
  return String(valor);
}

type TramiteFieldInputProps = {
  campo: CasoTramiteCampoDto;
  value: unknown;
  onChange: (value: unknown) => void;
  readOnly: boolean;
  error?: string;
};

function TramiteFieldInput({
  campo,
  value,
  onChange,
  readOnly,
  error,
}: TramiteFieldInputProps) {
  const tipo = normalizeTipo(campo.tipo);
  const fieldState = error ? "error" : "default";
  const selectOptions: SelectOption[] = campo.opciones.map((o) => ({
    value: o.valor,
    label: o.etiqueta,
  }));

  if (tipo === "boolean") {
    return (
      <Checkbox
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
        disabled={readOnly}
        label={campo.etiqueta}
      />
    );
  }

  if (tipo === "textarea") {
    return (
      <textarea
        className={`${textareaClassName} ${
          error ? "border-red-300 focus:border-red-400" : ""
        }`}
        value={String(value ?? "")}
        placeholder={campo.placeholder ?? undefined}
        disabled={readOnly}
        readOnly={readOnly}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (tipo === "select") {
    return (
      <Select
        options={selectOptions}
        value={String(value ?? "")}
        onChange={(v) => onChange(v ?? "")}
        placeholder={campo.placeholder ?? "Seleccionar…"}
        disabled={readOnly}
        state={fieldState}
      />
    );
  }

  if (tipo === "multiselect") {
    return (
      <MultiSelect
        options={selectOptions}
        value={parseMultiselectValues(value)}
        onChange={(v) => onChange(v ?? [])}
        placeholder={campo.placeholder ?? "Seleccionar…"}
        disabled={readOnly}
        state={fieldState}
      />
    );
  }

  if (tipo === "date") {
    const normalized = normalizeIsoDateString(value);
    const isoValue = normalized !== "" ? normalized : undefined;
    return (
      <DateInputPicker
        value={isoValue}
        onChange={(v) => onChange(v ?? "")}
        state={fieldState}
        disabled={readOnly}
      />
    );
  }

  if (tipo === "number") {
    return (
      <Input
        type="number"
        value={value === "" || value == null ? "" : String(value)}
        placeholder={campo.placeholder ?? undefined}
        disabled={readOnly}
        readOnly={readOnly}
        state={fieldState}
        min={campo.minimo ?? undefined}
        max={campo.maximo ?? undefined}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === "" ? "" : raw);
        }}
      />
    );
  }

  return (
    <Input
      value={String(value ?? "")}
      placeholder={campo.placeholder ?? undefined}
      disabled={readOnly}
      readOnly={readOnly}
      state={fieldState}
      maxLength={campo.longitud_maxima ?? undefined}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function CasoTramiteFieldsCard({
  practicaId,
  plantillaId = null,
  storedCasoPlantillaId = null,
  baselinePlantillaId = null,
  plantillaOptions = [],
  plantillasLoading = false,
  plantillaRequired = false,
  plantillaDisabled = false,
  plantillaError = null,
  onPlantillaChange,
  casoId = null,
  readOnly = false,
  valores = {},
  onValoresChange,
  fieldErrors = {},
  onEffectivePlantillaIdChange,
}: CasoTramiteFieldsCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<
    CasoTramitePlantillaCamposResponse | CasoTramiteWithValoresResponse | null
  >(null);

  const lastValoresSyncKey = useRef<string | null>(null);
  const valoresRef = useRef(valores);
  valoresRef.current = valores;

  const hasPractica = Boolean(practicaId?.trim());
  const hasPlantilla = Boolean(plantillaId?.trim());
  const resolvedPlantillaId = plantillaId?.trim() || null;
  const dataMatchesSelection =
    resolvedPlantillaId != null &&
    data?.effective_plantilla_id === resolvedPlantillaId;
  const awaitingPlantillaData =
    hasPractica && hasPlantilla && !error && !dataMatchesSelection;
  const plantillaChangedOnEdit =
    Boolean(casoId) &&
    hasPlantilla &&
    plantillaId !== (baselinePlantillaId ?? storedCasoPlantillaId ?? null);
  const useStoredCasoTramite = Boolean(casoId) && !plantillaChangedOnEdit;
  const showPlantillaEmptyMessage =
    hasPractica && !plantillasLoading && plantillaOptions.length === 0;

  useEffect(() => {
    setData(null);
    setError(null);
    lastValoresSyncKey.current = null;
  }, [practicaId, casoId, plantillaId]);

  useEffect(() => {
    onEffectivePlantillaIdChange?.(data?.effective_plantilla_id ?? null);
  }, [data?.effective_plantilla_id, onEffectivePlantillaIdChange]);

  useEffect(() => {
    if (!hasPractica) {
      setLoading(false);
      onEffectivePlantillaIdChange?.(null);
      return;
    }

    if (!hasPlantilla) {
      setLoading(false);
      setData(null);
      onEffectivePlantillaIdChange?.(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const loadPromise = useStoredCasoTramite
      ? getCasoTramite(casoId!)
      : getPlantillaCampos(practicaId!, plantillaId!);

    loadPromise
      .then((result) => {
        if (cancelled) return;
        setData(result);

        const syncKey = `${casoId ?? "create"}:${plantillaId ?? "none"}`;
        if (lastValoresSyncKey.current !== syncKey && onValoresChange) {
          lastValoresSyncKey.current = syncKey;
          const storedValores =
            useStoredCasoTramite &&
            "valores" in result &&
            result.valores
              ? result.valores
              : null;
          onValoresChange(
            buildValoresForCampos(result.campos, {
              storedValores,
              previousValores: valoresRef.current,
            }),
          );
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setData(null);
          onEffectivePlantillaIdChange?.(null);
          setError(
            err instanceof Error
              ? err.message
              : "Error al cargar campos del trámite",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    practicaId,
    hasPractica,
    hasPlantilla,
    plantillaId,
    casoId,
    useStoredCasoTramite,
    onValoresChange,
    onEffectivePlantillaIdChange,
  ]);

  function handleFieldChange(campoId: string, value: unknown) {
    if (readOnly || !onValoresChange || !data || !dataMatchesSelection) return;

    const next: Record<string, unknown> = {};
    for (const campo of data.campos) {
      next[campo.campo_id] = normalizeRuntimeFieldValue(
        campo.campo_id === campoId ? value : valores[campo.campo_id],
        campo.tipo,
      );
    }
    onValoresChange(next);
  }

  const sinPlantillaSeleccionada =
    hasPractica && !hasPlantilla && !loading && !error;

  const sinPlantilla =
    hasPractica &&
    hasPlantilla &&
    !loading &&
    !awaitingPlantillaData &&
    !error &&
    data?.effective_plantilla_id == null;

  const plantillaSinCampos =
    hasPractica &&
    !loading &&
    !awaitingPlantillaData &&
    !error &&
    dataMatchesSelection &&
    data.campos.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos del trámite (Legajo)</CardTitle>
        {hasPractica && (
          <CardHeaderActions className="w-full max-w-xs shrink-0 sm:w-auto">
            <FormField
              id="tramite-plantilla_id"
              className="w-full min-w-[12rem]"
              state={plantillaError ? "error" : "default"}
            >
              <Label required={plantillaRequired && !readOnly} className="sr-only">
                Plantilla
              </Label>
              <Select
                options={plantillaOptions}
                value={plantillaId ?? ""}
                onChange={(value) => {
                  if (readOnly || plantillaDisabled) return;
                  onPlantillaChange?.(value || null);
                }}
                placeholder={
                  plantillasLoading
                    ? "Cargando plantillas…"
                    : plantillaOptions.length === 0
                      ? "Sin plantillas"
                      : "Seleccionar plantilla…"
                }
                disabled={
                  readOnly ||
                  plantillaDisabled ||
                  plantillasLoading ||
                  plantillaOptions.length === 0
                }
                state={plantillaError ? "error" : "default"}
              />
              {plantillaError && (
                <ErrorMessage>{plantillaError}</ErrorMessage>
              )}
              {showPlantillaEmptyMessage && !plantillaError && (
                <HelperText>{SIN_PLANTILLA_MENSAJE}</HelperText>
              )}
            </FormField>
          </CardHeaderActions>
        )}
      </CardHeader>
      <CardContent>
        {!hasPractica && (
          <p className="text-sm text-gray-500">
            Seleccioná una práctica para cargar los datos del trámite.
          </p>
        )}

        {hasPractica && (loading || awaitingPlantillaData) && (
          <p className="text-sm text-zinc-400">Cargando campos del trámite…</p>
        )}

        {hasPractica && error && !loading && !awaitingPlantillaData && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {sinPlantillaSeleccionada && (
          <p className="text-sm text-gray-500">
            {SIN_PLANTILLA_SELECCIONADA_MENSAJE}
          </p>
        )}

        {sinPlantilla && (
          <p className="text-sm text-gray-500">{SIN_PLANTILLA_MENSAJE}</p>
        )}

        {plantillaSinCampos && (
          <p className="text-sm text-gray-500">
            La plantilla asociada a esta práctica no tiene campos configurados.
          </p>
        )}

        {hasPractica &&
          !loading &&
          !awaitingPlantillaData &&
          !error &&
          dataMatchesSelection &&
          data.campos.length > 0 && (
            <div
              key={resolvedPlantillaId ?? "none"}
              className="grid grid-cols-12 gap-x-4 gap-y-3"
            >
              {data.campos.map((campo) => {
                const tipo = normalizeTipo(campo.tipo);
                const isBoolean = tipo === "boolean";
                const fieldError = fieldErrors[campo.campo_id];

                return (
                  <FormField
                    key={campo.campo_id}
                    id={`tramite-${campo.campo_id}`}
                    className={getGridClass(campo.ancho_grilla)}
                    state={fieldError ? "error" : "default"}
                  >
                    {!isBoolean && (
                      <Label required={campo.obligatorio}>
                        {campo.etiqueta}
                      </Label>
                    )}
                    <TramiteFieldInput
                      campo={campo}
                      value={valores[campo.campo_id]}
                      onChange={(v) => handleFieldChange(campo.campo_id, v)}
                      readOnly={readOnly}
                      error={fieldError}
                    />
                    {fieldError && (
                      <ErrorMessage>{fieldError}</ErrorMessage>
                    )}
                    {campo.ayuda && !isBoolean && !fieldError && (
                      <HelperText>{campo.ayuda}</HelperText>
                    )}
                  </FormField>
                );
              })}
            </div>
          )}
      </CardContent>
    </Card>
  );
}
