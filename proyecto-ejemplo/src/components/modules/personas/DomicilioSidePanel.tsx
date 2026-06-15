"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  SidePanel,
  SidePanelHeader,
  SidePanelTitle,
  SidePanelDescription,
  SidePanelContent,
  SidePanelFooter,
} from "@/components/ui/side-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  FormField,
  Label,
  HelperText,
  ErrorMessage,
} from "@/components/ui/form-field";

import {
  domicilioSchema,
  CATEGORIAS_DOMICILIO,
  CATEGORIA_DOMICILIO_LABELS,
  type DomicilioInput,
} from "@/lib/validation/schemas/persona-domicilio.schema";
import { MESSAGES } from "@/lib/validation/common/messages";
import { getProvincias, type Provincia } from "@/lib/api/provincias";
import { searchLocalidades, type Localidad } from "@/lib/api/localidades";
import { getCodigosPostales, type CodigoPostal } from "@/lib/api/codigos-postales";

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: DomicilioInput) => Promise<void>;
  initialValues?: Partial<DomicilioInput> & {
    _provincia_id?: string;
    _localidad_nombre?: string;
  };
  isPending?: boolean;
  mode: "create" | "edit";
};

// ── Option lists ──────────────────────────────────────────────────────────────

const CATEGORIA_OPTIONS = CATEGORIAS_DOMICILIO.map((c) => ({
  value: c,
  label: CATEGORIA_DOMICILIO_LABELS[c],
}));

const MIN_QUERY = 2;
const SEARCH_DEBOUNCE_MS = 300;

// ── Component ─────────────────────────────────────────────────────────────────

export function DomicilioSidePanel({
  open,
  onClose,
  onSubmit,
  initialValues,
  isPending = false,
  mode,
}: Props) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<
    z.input<typeof domicilioSchema>,
    any,
    z.output<typeof domicilioSchema>
  >({
    resolver: zodResolver(domicilioSchema),
    mode: "onBlur",
    defaultValues: {
      categoria: "particular",
      calle: "",
      numero: "",
      piso: "",
      departamento: "",
      barrio: "",
      localidad_id: "",
      codigo_postal: "",
      descripcion: "",
      predeterminado: false,
      activo: true,
    },
  });

  const localidadId = watch("localidad_id") as string;

  // ── Geo state ─────────────────────────────────────────────────────────────

  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [provinciaId, setProvinciaId] = useState("");
  const [provinciaError, setProvinciaError] = useState(false);

  // Localidad async search
  const [localidadSearch, setLocalidadSearch] = useState("");
  const [localidadResults, setLocalidadResults] = useState<Localidad[]>([]);
  const [isSearchingLocalidades, setIsSearchingLocalidades] = useState(false);
  const [showLocalidadDropdown, setShowLocalidadDropdown] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Prevents the debounce effect from firing when localidadSearch is set programmatically
  const skipNextSearchRef = useRef(false);

  // Código postal (dependent on localidad)
  const [codigosPostales, setCodigosPostales] = useState<CodigoPostal[]>([]);
  const [loadingCodigosPostales, setLoadingCodigosPostales] = useState(false);

  // ── Load provinces once ───────────────────────────────────────────────────

  useEffect(() => {
    getProvincias()
      .then(setProvincias)
      .catch(() => setProvincias([]));
  }, []);

  // ── Reset form when panel opens ───────────────────────────────────────────

  useEffect(() => {
    if (!open) return;

    const initProvinciaId = initialValues?._provincia_id ?? "";
    const initLocalidadNombre = initialValues?._localidad_nombre ?? "";
    const initLocalidadId = initialValues?.localidad_id ?? "";

    setProvinciaId(initProvinciaId);
    setProvinciaError(false);
    skipNextSearchRef.current = true;
    setLocalidadSearch(initLocalidadNombre);
    setLocalidadResults([]);
    setShowLocalidadDropdown(false);
    setCodigosPostales([]);

    reset({
      categoria: initialValues?.categoria ?? "particular",
      calle: initialValues?.calle ?? "",
      numero: initialValues?.numero ?? "",
      piso: initialValues?.piso ?? "",
      departamento: initialValues?.departamento ?? "",
      barrio: initialValues?.barrio ?? "",
      localidad_id: initLocalidadId,
      codigo_postal: initialValues?.codigo_postal ?? "",
      descripcion: initialValues?.descripcion ?? "",
      predeterminado: initialValues?.predeterminado ?? false,
      activo: initialValues?.activo ?? true,
    });

    // Pre-load CPs for the existing localidad (edit mode)
    if (initLocalidadId) {
      setLoadingCodigosPostales(true);
      getCodigosPostales(initLocalidadId)
        .then(setCodigosPostales)
        .catch(() => setCodigosPostales([]))
        .finally(() => setLoadingCodigosPostales(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues]);

  // ── Debounced localidad search ────────────────────────────────────────────

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    // Programmatic value set (panel open / reset) — skip search, leave dropdown closed
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }

    if (!provinciaId || localidadSearch.trim().length < MIN_QUERY) {
      setLocalidadResults([]);
      setShowLocalidadDropdown(false);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      setIsSearchingLocalidades(true);
      try {
        const results = await searchLocalidades(provinciaId, localidadSearch.trim());
        setLocalidadResults(results);
        setShowLocalidadDropdown(true);
      } catch {
        setLocalidadResults([]);
      } finally {
        setIsSearchingLocalidades(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localidadSearch, provinciaId]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleProvinciaChange(val: string) {
    setProvinciaId(val);
    setProvinciaError(false);
    setLocalidadSearch("");
    setLocalidadResults([]);
    setShowLocalidadDropdown(false);
    setValue("localidad_id", "");
    setCodigosPostales([]);
    setValue("codigo_postal", "");
  }

  function handleLocalidadSelect(localidad: Localidad) {
    setValue("localidad_id", localidad.id);
    setLocalidadSearch(localidad.nombre);
    setShowLocalidadDropdown(false);
    setLocalidadResults([]);
    setValue("codigo_postal", "");
    setLoadingCodigosPostales(true);
    getCodigosPostales(localidad.id)
      .then((cps) => {
        setCodigosPostales(cps);

        if (cps.length > 0) {
          setValue("codigo_postal", cps[0].codigo_postal);
        }
      })
      .catch(() => {
        setCodigosPostales([]);
        setValue("codigo_postal", "");
      })
      .finally(() => setLoadingCodigosPostales(false));
  }

  function handleLocalidadInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setLocalidadSearch(val);
    // Selecting from dropdown sets localidad_id; typing resets it
    setValue("localidad_id", "");
    setCodigosPostales([]);
    setValue("codigo_postal", "");
    if (!val) setShowLocalidadDropdown(false);
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleFormSubmit(data: DomicilioInput) {
    if (!provinciaId) {
      setProvinciaError(true);
      return;
    }
    if (codigosPostales.length > 0 && !data.codigo_postal) {
      setError("codigo_postal", { message: MESSAGES.required });
      return;
    }
    await onSubmit(data);
    onClose();
  }

  // ── Derived options ───────────────────────────────────────────────────────

  const provinciaOptions = provincias.map((p) => ({ value: p.id, label: p.nombre }));
  const cpOptions = codigosPostales.map((cp) => ({ value: cp.codigo_postal, label: cp.codigo_postal }));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SidePanel open={open} onClose={onClose} width="sm">
      <SidePanelHeader>
        <SidePanelTitle>
          {mode === "create" ? "Agregar domicilio" : "Editar domicilio"}
        </SidePanelTitle>
        <SidePanelDescription>
          {mode === "create"
            ? "Completá los datos del nuevo domicilio."
            : "Modificá los datos del domicilio."}
        </SidePanelDescription>
      </SidePanelHeader>

      <SidePanelContent>
        <form
          id="domicilio-form"
          onSubmit={(e) => { e.stopPropagation(); handleSubmit(handleFormSubmit)(e); }}
          className="space-y-4"
        >
          {/* Categoría */}
          <FormField id="categoria" state={errors.categoria ? "error" : "default"}>
            <Label required>Categoría</Label>
            <Controller
              name="categoria"
              control={control}
              render={({ field }) => (
                <Select
                  options={CATEGORIA_OPTIONS}
                  value={field.value as string}
                  onChange={field.onChange}
                  placeholder="Seleccionar categoría…"
                  state={errors.categoria ? "error" : "default"}
                />
              )}
            />
            {errors.categoria && (
              <ErrorMessage>{errors.categoria.message}</ErrorMessage>
            )}
          </FormField>

          {/* Calle */}
          <FormField id="calle" state={errors.calle ? "error" : "default"}>
            <Label required>Calle</Label>
            <Input
              {...register("calle")}
              placeholder="Av. Corrientes"
              state={errors.calle ? "error" : "default"}
            />
            {errors.calle && (
              <ErrorMessage>{errors.calle.message}</ErrorMessage>
            )}
          </FormField>

          {/* Número / Piso / Departamento */}
          <div className="grid grid-cols-3 gap-3">
            <FormField id="numero" state={errors.numero ? "error" : "default"}>
              <Label required>Número</Label>
              <Input
                {...register("numero")}
                placeholder="1234"
                state={errors.numero ? "error" : "default"}
              />
              {errors.numero && (
                <ErrorMessage>{errors.numero.message}</ErrorMessage>
              )}
            </FormField>

            <FormField id="piso" state={errors.piso ? "error" : "default"}>
              <Label>Piso</Label>
              <Input
                {...register("piso")}
                placeholder="3"
                state={errors.piso ? "error" : "default"}
              />
              {errors.piso && (
                <ErrorMessage>{errors.piso.message}</ErrorMessage>
              )}
            </FormField>

            <FormField id="departamento" state={errors.departamento ? "error" : "default"}>
              <Label>Dpto.</Label>
              <Input
                {...register("departamento")}
                placeholder="A"
                state={errors.departamento ? "error" : "default"}
              />
              {errors.departamento && (
                <ErrorMessage>{errors.departamento.message}</ErrorMessage>
              )}
            </FormField>
          </div>

          {/* Provincia — local state, not persisted */}
          <FormField id="provincia" state={provinciaError ? "error" : "default"}>
            <Label required>Provincia</Label>
            <Select
              options={provinciaOptions}
              value={provinciaId}
              onChange={handleProvinciaChange}
              placeholder="Seleccionar provincia…"
              disabled={provincias.length === 0}
              state={provinciaError ? "error" : "default"}
            />
            {provinciaError && (
              <ErrorMessage>{MESSAGES.required}</ErrorMessage>
            )}
          </FormField>

          {/* Localidad — async server-side search */}
          <FormField id="localidad_id" state={errors.localidad_id ? "error" : "default"}>
            <Label required>Localidad</Label>
            {/* Hidden field keeps RHF in sync */}
            <input type="hidden" {...register("localidad_id")} />
            <div className="relative">
              <Input
                value={localidadSearch}
                onChange={handleLocalidadInputChange}
                onFocus={() => {
                  if (localidadResults.length > 0) setShowLocalidadDropdown(true);
                }}
                onBlur={() => {
                  // Delay so mouseDown on dropdown items can fire first
                  setTimeout(() => setShowLocalidadDropdown(false), 150);
                }}
                placeholder={
                  !provinciaId
                    ? "Seleccioná una provincia primero"
                    : `Escribí al menos ${MIN_QUERY} caracteres…`
                }
                disabled={!provinciaId}
                state={errors.localidad_id ? "error" : "default"}
              />
              {isSearchingLocalidades && (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  <Spinner size="sm" />
                </span>
              )}
              {showLocalidadDropdown && localidadResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-zinc-200/90 bg-white/95 py-1.5 shadow-xl shadow-zinc-900/[0.08] ring-1 ring-zinc-900/[0.04] backdrop-blur-md">
                  {localidadResults.map((l) => (
                    <div
                      key={l.id}
                      role="option"
                      aria-selected={l.id === localidadId}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleLocalidadSelect(l);
                      }}
                      className="mx-1 cursor-pointer select-none rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors duration-100 hover:bg-zinc-50 hover:text-zinc-900"
                    >
                      {l.nombre}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {errors.localidad_id ? (
              <ErrorMessage>{errors.localidad_id.message}</ErrorMessage>
            ) : (
              <HelperText>
                {localidadId
                  ? "Localidad seleccionada."
                  : `Escribí al menos ${MIN_QUERY} caracteres para buscar.`}
              </HelperText>
            )}
          </FormField>

          {/* Código Postal — dependent select, loaded after localidad selection */}
          <FormField id="codigo_postal" state={errors.codigo_postal ? "error" : "default"}>
            <Label>Código postal</Label>
            <Controller
              name="codigo_postal"
              control={control}
              render={({ field }) => (
                <Select
                  options={cpOptions}
                  value={field.value as string}
                  onChange={field.onChange}
                  placeholder={
                    !localidadId
                      ? "Seleccioná una localidad primero"
                      : loadingCodigosPostales
                      ? "Cargando…"
                      : cpOptions.length === 0
                      ? "Sin códigos disponibles"
                      : "Seleccionar código postal…"
                  }
                  disabled={!localidadId || loadingCodigosPostales || cpOptions.length === 0}
                  state={errors.codigo_postal ? "error" : "default"}
                />
              )}
            />
            {errors.codigo_postal && (
              <ErrorMessage>{errors.codigo_postal.message}</ErrorMessage>
            )}
          </FormField>

          {/* Barrio */}
          <FormField id="barrio" state={errors.barrio ? "error" : "default"}>
            <Label>Barrio</Label>
            <Input
              {...register("barrio")}
              placeholder="Palermo"
              state={errors.barrio ? "error" : "default"}
            />
            {errors.barrio && (
              <ErrorMessage>{errors.barrio.message}</ErrorMessage>
            )}
          </FormField>

          {/* Descripción */}
          <FormField id="descripcion" state="default">
            <Label>Descripción</Label>
            <Input
              {...register("descripcion")}
              placeholder="Ej: Casa de fin de semana, oficina, etc."
            />
            <HelperText>Opcional. Referencia interna.</HelperText>
          </FormField>

          {/* Predeterminado */}
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-zinc-900">Predeterminado</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Se mostrará como domicilio principal de la persona.
              </p>
            </div>
            <Controller
              name="predeterminado"
              control={control}
              render={({ field }) => (
                <Switch
                  size="sm"
                  checked={field.value as boolean}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              )}
            />
          </div>

          {/* Activo */}
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-zinc-900">Activo</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Los domicilios inactivos no se muestran en listados principales.
              </p>
            </div>
            <Controller
              name="activo"
              control={control}
              render={({ field }) => (
                <Switch
                  size="sm"
                  checked={field.value as boolean}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              )}
            />
          </div>
        </form>
      </SidePanelContent>

      <SidePanelFooter>
        <Button variant="secondary" type="button" onClick={onClose} disabled={isPending}>
          Cancelar
        </Button>
        <Button form="domicilio-form" type="submit" loading={isPending}>
          {mode === "create" ? "Agregar" : "Guardar"}
        </Button>
      </SidePanelFooter>
    </SidePanel>
  );
}
