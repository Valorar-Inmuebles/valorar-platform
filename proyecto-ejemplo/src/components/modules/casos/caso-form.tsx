"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createCaso, getCaso, updateCaso, CasoApiError, CasoTramiteApiError } from "@/lib/api/casos";
import { getPlantillasDisponiblesForPractica } from "@/lib/api/caso-plantillas";
import { getCasoTramite } from "@/lib/api/caso-tramite";
import { getCliente, searchClientes } from "@/lib/api/cliente.api";
import { getPracticas } from "@/lib/api/practicas";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, type SelectOption } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/ui/page-header";
import { ContextIcon, type ContextIconTone } from "@/components/ui/context-icon";
import {
  FormField,
  Label,
  HelperText,
  ErrorMessage,
} from "@/components/ui/form-field";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Icon } from "@/components/ui/icons";
import {
  createCasoSchema,
  updateCasoSchema,
  type CreateCasoInput,
} from "@/lib/validation/schemas/caso.schema";
import { CasoTramiteFieldsCard, normalizeRuntimeValorForPayload } from "@/components/modules/casos/caso-tramite-fields-card";
import { ClienteCreateSidePanel } from "@/components/modules/clientes/cliente-create-side-panel";
import { formatClienteDisplayName } from "@/lib/persona-display";
import type { z } from "zod";
import { AgendaPanel } from "@/components/modules/agenda";
import { ComentariosPanel } from "@/components/modules/comentarios";
import { DocumentosPanel } from "@/components/modules/documentos";

const MIN_QUERY = 2;
const SEARCH_DEBOUNCE_MS = 300;

const textareaClassName =
  "flex min-h-[4.5rem] w-full resize-y rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500";

type FormValues = z.input<typeof createCasoSchema>;

const DEFAULT_VALUES: FormValues = {
  cliente_id: "",
  nombre: "",
  descripcion: undefined,
  practica_id: "",
};

function getOptionLabel(
  options: SelectOption[],
  value: string | undefined,
): string | null {
  if (!value) return null;
  return options.find((o) => o.value === value)?.label ?? null;
}

function formatExpedientesCount(count: number): string {
  if (count === 0) return "0 expedientes";
  if (count === 1) return "1 expediente";
  return `${count} expedientes`;
}

/** Prefer `expedientes_count` when the API exposes it; fallback to `has_expedientes`. */
function resolveExpedientesCount(
  data: { has_expedientes: boolean; expedientes_count?: number },
): number {
  if (typeof data.expedientes_count === "number") {
    return Math.max(0, data.expedientes_count);
  }
  return data.has_expedientes ? 1 : 0;
}

function formatCasoCreatedAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

type CasoSummaryRowProps = {
  tone: ContextIconTone;
  icon: React.ReactNode;
  label: string;
  value: string | null;
  placeholder: string;
};

function CasoSummaryRow({
  tone,
  icon,
  label,
  value,
  placeholder,
}: CasoSummaryRowProps) {
  const filled = Boolean(value);

  return (
    <div className="flex items-start gap-2.5">
      <ContextIcon tone={tone} size="xs">
        {icon}
      </ContextIcon>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-xs text-gray-400">{label}</p>
        <p
          className={`truncate text-xs leading-snug ${
            filled ? "font-medium text-gray-900" : "text-gray-400"
          }`}
        >
          {filled ? value : placeholder}
        </p>
      </div>
    </div>
  );
}

const CASO_FORM_ID = "caso-form";

type CasoFormProps =
  | { mode: "create" }
  | { mode: "view"; id: string }
  | { mode: "edit"; id: string };

type CasoMeta = {
  numero: string | null;
  estado: string | null;
  created_at: string | null;
  expedientesCount: number;
};

export function CasoForm(props: CasoFormProps) {
  const mode = props.mode;
  const isCreate = mode === "create";
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const readOnly = isView;
  const casoId = isCreate ? null : props.id;

  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(!isCreate);
  const [isPending, setIsPending] = useState(false);
  const [casoMeta, setCasoMeta] = useState<CasoMeta | null>(null);
  const coreFieldsLocked = readOnly;

  const [practicaOptions, setPracticaOptions] = useState<SelectOption[]>([]);
  const [practicasLoading, setPracticasLoading] = useState(true);

  const [plantillaOptions, setPlantillaOptions] = useState<SelectOption[]>([]);
  const [plantillasLoading, setPlantillasLoading] = useState(false);
  const [selectedPlantillaId, setSelectedPlantillaId] = useState<string | null>(
    null,
  );
  const [storedCasoPlantillaId, setStoredCasoPlantillaId] = useState<
    string | null
  >(null);
  const [baselinePlantillaId, setBaselinePlantillaId] = useState<
    string | null
  >(null);
  const [plantillaError, setPlantillaError] = useState<string | null>(null);

  const [clienteSearch, setClienteSearch] = useState("");
  const [clienteResults, setClienteResults] = useState<SelectOption[]>([]);
  const [clienteSearching, setClienteSearching] = useState(false);
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [clientePanelOpen, setClientePanelOpen] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [tramiteValores, setTramiteValores] = useState<Record<string, unknown>>({});
  const [tramiteFieldErrors, setTramiteFieldErrors] = useState<
    Record<string, string>
  >({});

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    setError,
    trigger,
    formState: { errors },
  } = useForm<FormValues, unknown, CreateCasoInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(isCreate ? createCasoSchema : updateCasoSchema) as any,
    mode: "onBlur",
    defaultValues: DEFAULT_VALUES,
  });

  const practicaId = watch("practica_id");
  const nombre = watch("nombre");
  const clienteId = watch("cliente_id");
  const hasPractica = Boolean(practicaId?.trim());

  const practicaLabel = getOptionLabel(practicaOptions, practicaId);
  const plantillaLabel = getOptionLabel(
    plantillaOptions,
    selectedPlantillaId ?? undefined,
  );
  const plantillaRequired = plantillaOptions.length > 1;
  const clienteLabel =
    clienteId && clienteSearch.trim() ? clienteSearch.trim() : null;
  const tituloLabel =
    typeof nombre === "string" && nombre.trim() ? nombre.trim() : null;

  useEffect(() => {
    let cancelled = false;
    setPracticasLoading(true);
    getPracticas()
      .then((rows) => {
        if (cancelled) return;
        setPracticaOptions(
          rows.map((p) => ({ value: p.id, label: p.nombre })),
        );
      })
      .catch((err: unknown) => {
        if (!cancelled) return;
        setPracticaOptions([]);
        const msg =
          err instanceof Error ? err.message : "Error al cargar prácticas";
        toast.error(msg);
      })
      .finally(() => {
        if (!cancelled) setPracticasLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isCreate || !casoId) return;

    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const data = await getCaso(casoId!);
        if (cancelled) return;

        setCasoMeta({
          numero: data.numero,
          estado: data.estado,
          created_at: data.created_at,
          expedientesCount: resolveExpedientesCount(data),
        });

        let resolvedPlantillaId = data.plantilla_id;
        if (!resolvedPlantillaId && data.practica_id) {
          try {
            const tramite = await getCasoTramite(casoId!);
            resolvedPlantillaId = tramite.effective_plantilla_id;
          } catch {
            /* legacy fallback unavailable */
          }
        }

        setStoredCasoPlantillaId(data.plantilla_id);
        setBaselinePlantillaId(resolvedPlantillaId);
        setSelectedPlantillaId(resolvedPlantillaId);

        reset({
          cliente_id: data.cliente_id ?? "",
          nombre: data.nombre ?? "",
          descripcion: data.descripcion ?? undefined,
          practica_id: data.practica_id ?? "",
        });

        if (data.cliente_id) {
          try {
            const cliente = await getCliente(data.cliente_id);
            if (!cancelled) {
              setClienteSearch(formatClienteDisplayName(cliente));
            }
          } catch {
            if (!cancelled) setClienteSearch("");
          }
        }
      } catch (err: unknown) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Error al cargar caso");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreate, casoId]);

  useEffect(() => {
    if (!practicaId?.trim()) {
      setPlantillaOptions([]);
      setPlantillasLoading(false);
      if (isCreate) {
        setSelectedPlantillaId(null);
      }
      return;
    }

    let cancelled = false;
    setPlantillasLoading(true);
    setPlantillaError(null);

    getPlantillasDisponiblesForPractica(practicaId, {
      includePlantillaId:
        storedCasoPlantillaId ??
        baselinePlantillaId ??
        selectedPlantillaId ??
        undefined,
    })
      .then((rows) => {
        if (cancelled) return;
        setPlantillaOptions(
          rows.map((p) => ({ value: p.id, label: p.nombre })),
        );

        if (isCreate || !selectedPlantillaId) {
          if (rows.length === 1) {
            setSelectedPlantillaId(rows[0].id);
          } else if (
            selectedPlantillaId &&
            !rows.some((row) => row.id === selectedPlantillaId)
          ) {
            setSelectedPlantillaId(null);
          }
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setPlantillaOptions([]);
          if (isCreate) setSelectedPlantillaId(null);
          toast.error(
            err instanceof Error
              ? err.message
              : "Error al cargar plantillas",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setPlantillasLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practicaId, isCreate, storedCasoPlantillaId, baselinePlantillaId]);

  const runClienteSearch = useCallback(async (term: string) => {
    const q = term.trim();
    if (q.length < MIN_QUERY) {
      setClienteResults([]);
      setShowClienteDropdown(false);
      return;
    }
    setClienteSearching(true);
    try {
      const rows = await searchClientes(q);
      setClienteResults(rows.map((r) => ({ value: r.id, label: r.label })));
      setShowClienteDropdown(true);
    } catch {
      setClienteResults([]);
    } finally {
      setClienteSearching(false);
    }
  }, []);

  useEffect(() => {
    if (coreFieldsLocked) return;

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (clienteSearch.trim().length < MIN_QUERY) {
      setClienteResults([]);
      setShowClienteDropdown(false);
      return;
    }

    searchDebounceRef.current = setTimeout(() => {
      void runClienteSearch(clienteSearch);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [clienteSearch, runClienteSearch, coreFieldsLocked]);

  function buildValoresDinamicosPayload() {
    return Object.entries(tramiteValores).map(([campo_id, valor]) => ({
      campo_id,
      valor: normalizeRuntimeValorForPayload(valor),
    }));
  }

  function handleClienteSelect(opt: SelectOption) {
    setValue("cliente_id", opt.value, { shouldValidate: true });
    setClienteSearch(opt.label);
    setShowClienteDropdown(false);
    setClienteResults([]);
  }

  function handleClienteCreated(cliente: { id: string; label: string }) {
    handleClienteSelect({ value: cliente.id, label: cliente.label });
  }

  async function onSubmit(data: CreateCasoInput) {
    setIsPending(true);
    setTramiteFieldErrors({});
    setPlantillaError(null);

    if (plantillaRequired && !selectedPlantillaId) {
      setPlantillaError("Seleccioná una plantilla");
      setIsPending(false);
      return;
    }

    try {
      const tramitePayload = selectedPlantillaId
        ? {
            valores_dinamicos: buildValoresDinamicosPayload(),
            tramite_plantilla_id: selectedPlantillaId,
          }
        : {};

      if (isCreate) {
        await createCaso({
          cliente_id: data.cliente_id,
          nombre: data.nombre,
          ...(data.descripcion != null && data.descripcion !== ""
            ? { descripcion: data.descripcion }
            : {}),
          practica_id: data.practica_id,
          ...tramitePayload,
        });
        toast.success("Caso creado");
        router.replace("/casos");
        return;
      }

      if (isEdit && casoId) {
        await updateCaso(casoId, {
          cliente_id: data.cliente_id,
          nombre: data.nombre,
          ...(data.descripcion !== undefined
            ? { descripcion: data.descripcion ?? null }
            : {}),
          practica_id: data.practica_id,
          ...tramitePayload,
        });
        toast.success("Caso actualizado");
        router.replace("/casos");
        return;
      }
    } catch (err: unknown) {
      if (err instanceof CasoTramiteApiError) {
        setTramiteFieldErrors(err.errors);
        toast.error("Revisá los campos del trámite");
        return;
      }
      if (err instanceof CasoApiError) {
        if (err.code === "CASO_HAS_EXPEDIENTES") {
          toast.error(err.message);
        }
        if (err.field === "plantilla_id") {
          setPlantillaError(err.message);
          return;
        }
        setError(err.field as keyof FormValues, { message: err.message });
        return;
      }
      toast.error(err instanceof Error ? err.message : "Error al guardar caso");
    } finally {
      setIsPending(false);
    }
  }

  const displayNumero = casoMeta?.numero?.trim() || "—";
  const displayEstado = casoMeta?.estado?.trim() || null;
  const estadoResumenValue = displayEstado;
  const expedientesResumenValue = isCreate
    ? "0 expedientes"
    : formatExpedientesCount(casoMeta?.expedientesCount ?? 0);
  const fechaCreacionResumenValue = isCreate
    ? null
    : formatCasoCreatedAt(casoMeta?.created_at);

  if (loading) {
    return <p className="text-sm text-zinc-400">Cargando...</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        back
        backHref="/casos"
        title={isCreate ? "Nuevo caso" : displayNumero}
        titleAddon={
          !isCreate && displayEstado ? (
            <Badge variant="neutral">{displayEstado}</Badge>
          ) : undefined
        }
        breadcrumb={
          isCreate
            ? [
                { label: "Casos", href: "/casos" },
                { label: "Nuevo" },
              ]
            : [
                { label: "Casos", href: "/casos" },
                { label: displayNumero },
              ]
        }
        actions={
          isView ? (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push("/casos")}
              >
                Volver
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => router.push(`/casos/${casoId}?edit=1`)}
              >
                Editar
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push("/casos")}
              >
                Volver
              </Button>
              <Button
                type="submit"
                form={CASO_FORM_ID}
                loading={isPending}
              >
                {isEdit ? "Guardar cambios" : "Guardar caso"}
              </Button>
            </>
          )
        }
      />

      <form
        id={CASO_FORM_ID}
        onSubmit={handleSubmit(onSubmit as never)}
        className="space-y-6"
      >
      {/* ── Two-column workspace layout ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Datos principales</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <FormField
                id="cliente_id"
                className={coreFieldsLocked ? "sm:col-span-1" : "sm:col-span-2"}
                state={errors.cliente_id ? "error" : "default"}
              >
                <Label required>Cliente</Label>
                <input type="hidden" {...register("cliente_id")} />
                <div className="flex gap-2">
                  <div className="relative min-w-0 flex-1">
                    <Input
                      leftIcon={<Icon.Search className="size-3.5" />}
                      loading={clienteSearching}
                      value={clienteSearch}
                      onChange={(e) => {
                        if (coreFieldsLocked) return;
                        setClienteSearch(e.target.value);
                        setValue("cliente_id", "", { shouldValidate: false });
                      }}
                      onFocus={() => {
                        if (coreFieldsLocked) return;
                        if (clienteResults.length > 0) setShowClienteDropdown(true);
                      }}
                      onBlur={() => {
                        if (coreFieldsLocked) return;
                        setTimeout(() => setShowClienteDropdown(false), 150);
                        void trigger("cliente_id");
                      }}
                      placeholder={`Escribí al menos ${MIN_QUERY} caracteres…`}
                      autoComplete="off"
                      disabled={coreFieldsLocked}
                      state={errors.cliente_id ? "error" : "default"}
                      className="!pl-7"
                    />
                    {!coreFieldsLocked && showClienteDropdown && clienteResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-zinc-200/90 bg-white/95 py-1.5 shadow-xl shadow-zinc-900/[0.08] ring-1 ring-zinc-900/[0.04] backdrop-blur-md">
                        {clienteResults.map((opt) => (
                          <div
                            key={opt.value}
                            role="option"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleClienteSelect(opt);
                            }}
                            className="mx-1 cursor-pointer select-none rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors duration-100 hover:bg-zinc-50 hover:text-zinc-900"
                          >
                            <span className="truncate">{opt.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {!coreFieldsLocked && (
                    <Button
                      type="button"
                      variant="primary"
                      className="shrink-0"
                      onClick={() => setClientePanelOpen(true)}
                    >
                      Nuevo cliente
                    </Button>
                  )}
                </div>
                {errors.cliente_id && (
                  <ErrorMessage>{errors.cliente_id.message}</ErrorMessage>
                )}
              </FormField>

              <FormField
                id="practica_id"
                className={coreFieldsLocked ? "sm:col-span-1" : "sm:col-span-2"}
                state={errors.practica_id ? "error" : "default"}
              >
                <Label required>Práctica</Label>
                <Controller
                  name="practica_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      options={practicaOptions}
                      value={field.value as string}
                      onChange={(value) => {
                        field.onChange(value);
                        setSelectedPlantillaId(null);
                        setStoredCasoPlantillaId(null);
                        setBaselinePlantillaId(null);
                        setPlantillaError(null);
                        setTramiteValores({});
                      }}
                      placeholder={
                        practicasLoading
                          ? "Cargando prácticas…"
                          : practicaOptions.length === 0
                            ? "Sin prácticas disponibles"
                            : "Seleccionar práctica…"
                      }
                      disabled={
                        coreFieldsLocked ||
                        practicasLoading ||
                        practicaOptions.length === 0
                      }
                      state={errors.practica_id ? "error" : "default"}
                    />
                  )}
                />
                {errors.practica_id && (
                  <ErrorMessage>{errors.practica_id.message}</ErrorMessage>
                )}
              </FormField>

              <FormField
                id="nombre"
                className="sm:col-span-2"
                state={errors.nombre ? "error" : "default"}
              >
                <Label required>Título</Label>
                <Input
                  {...register("nombre")}
                  placeholder="Carátula o referencia"
                  disabled={readOnly}
                />
                {errors.nombre ? (
                  <ErrorMessage>{errors.nombre.message}</ErrorMessage>
                ) : (
                  <HelperText>Máx. 200 caracteres.</HelperText>
                )}
              </FormField>

              <FormField
                id="descripcion"
                className="sm:col-span-2"
                state={errors.descripcion ? "error" : "default"}
              >
                <Label>Descripción</Label>
                <textarea
                  {...register("descripcion")}
                  className={`${textareaClassName} ${
                    errors.descripcion ? "border-red-300 focus:border-red-400" : ""
                  }`}
                  placeholder="Observaciones u contexto adicional del caso"
                  disabled={readOnly}
                  rows={3}
                />
                {errors.descripcion ? (
                  <ErrorMessage>{errors.descripcion.message}</ErrorMessage>
                ) : (
                  <HelperText>Opcional. Máx. 2000 caracteres.</HelperText>
                )}
              </FormField>
            </CardContent>
          </Card>

          <CasoTramiteFieldsCard
            practicaId={practicaId}
            plantillaId={selectedPlantillaId}
            storedCasoPlantillaId={storedCasoPlantillaId}
            baselinePlantillaId={baselinePlantillaId}
            plantillaOptions={plantillaOptions}
            plantillasLoading={plantillasLoading}
            plantillaRequired={plantillaRequired}
            plantillaDisabled={readOnly}
            plantillaError={plantillaError}
            onPlantillaChange={(value) => {
              setSelectedPlantillaId(value);
              setPlantillaError(null);
              setTramiteFieldErrors({});
            }}
            casoId={casoId}
            readOnly={readOnly}
            valores={tramiteValores}
            onValoresChange={setTramiteValores}
            fieldErrors={tramiteFieldErrors}
          />

          {!isCreate && casoId && (
            <DocumentosPanel entidadTipo="caso" entidadId={casoId} disabled={readOnly} />
          )}

          {!isCreate && casoId && (
            <ComentariosPanel
              entidadTipo="caso"
              entidadId={casoId}
              botonNuevoComentario
              // disabled={readOnly}
            />
          )}
        </div>

        {/* Contextual summary panel */}
        <div className="flex flex-col gap-6 lg:col-span-1">
            <Card flat>
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <ContextIcon tone="primary" size="sm">
                    <Icon.Folder className="size-4" />
                  </ContextIcon>
                  <CardTitle>Resumen</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2.5">
                  <CasoSummaryRow
                    tone="primary"
                    icon={<Icon.Users className="size-3.5" />}
                    label="Cliente"
                    value={clienteLabel}
                    placeholder="Sin seleccionar"
                  />
                  <CasoSummaryRow
                    tone="violet"
                    icon={<Icon.Layers className="size-3.5" />}
                    label="Práctica"
                    value={practicaLabel}
                    placeholder="Sin seleccionar"
                  />
                  <CasoSummaryRow
                    tone="neutral"
                    icon={<Icon.FileText className="size-3.5" />}
                    label="Título"
                    value={tituloLabel}
                    placeholder="Sin título"
                  />
                  <CasoSummaryRow
                    tone="success"
                    icon={<Icon.CheckDone className="size-3.5" />}
                    label="Estado"
                    value={estadoResumenValue}
                    placeholder="Sin estado"
                  />
                  <CasoSummaryRow
                    tone="neutral"
                    icon={<Icon.Briefcase className="size-3.5" />}
                    label="Expedientes asociados"
                    value={expedientesResumenValue}
                    placeholder="0 expedientes"
                  />
                  <CasoSummaryRow
                    tone="primary"
                    icon={<Icon.FileText className="size-3.5" />}
                    label="Plantilla"
                    value={plantillaLabel}
                    placeholder="Sin plantilla"
                  />
                  <CasoSummaryRow
                    tone="neutral"
                    icon={<Icon.Calendar className="size-3.5" />}
                    label="Fecha creación"
                    value={fechaCreacionResumenValue}
                    placeholder="—"
                  />
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <p className="text-xs leading-relaxed text-gray-500">
                    {isCreate
                      ? "Al guardar se creará el caso en estado abierto. Podrás vincular expedientes desde el detalle del caso."
                      : isView
                        ? "Vista de solo lectura del caso. Usá Editar para modificar los datos."
                        : "Al guardar se actualizarán los datos del caso."}
                  </p>
                </div>
              </CardContent>
            </Card>
            {!isCreate && casoId && (
              <AgendaPanel
                entidadTipo="caso"
                entidadId={casoId}
                variant="sidebar"
                // disabled={readOnly}
              />
            )}
        </div>
      </div>
      </form>

      {!coreFieldsLocked && (
        <ClienteCreateSidePanel
          open={clientePanelOpen}
          onClose={() => setClientePanelOpen(false)}
          onCreated={handleClienteCreated}
        />
      )}
    </div>
  );
}
