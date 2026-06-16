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
import {
  SearchableSelect,
  Select,
  type SelectOption,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ConfirmModal } from "@/components/ui/modal";
import { DateInputPicker } from "@/components/ui/date-input-picker";
import {
  FormField,
  Label,
  HelperText,
  ErrorMessage,
} from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";
import type { AgendaCreateSlot } from "@/lib/agenda/agenda-create-slot";
import { isAgendaEventoEnMismoContexto } from "@/lib/agenda/agenda-evento-padre-label";
import { splitAgendaTimestamps } from "@/lib/agenda/agenda-datetime";
import {
  createAgendaEvento,
  updateAgendaEvento,
} from "@/lib/api/agenda.api";
import { getCurrentUser } from "@/lib/api/me.api";
import { fetchAgendaEntidadesPadreCached } from "./agenda-entidades-padre-cache";
import { fetchAgendaEventoHistorialCached, invalidateAgendaEventoHistorialCache } from "./agenda-historial-cache";
import { fetchAgendaTiposCached } from "./agenda-tipos-cache";
import {
  AGENDA_ENTIDAD_PADRE_FILTER_TIPOS,
  type AgendaEntidadPadreFilterTipo,
  type AgendaEntidadTipo,
  type AgendaEventoDto,
  type AgendaEventoEstado,
  type AgendaEventoNotificarAntes,
  type AgendaEventoTipoDto,
  type AgendaHistorialDto,
} from "@/lib/types/agenda";
import { MESSAGES } from "@/lib/validation/common/messages";
import {
  ComentariosPanel,
  type ComentariosPanelCurrentUser,
} from "@/components/modules/comentarios";

import { AgendaEventoHistorial } from "./AgendaEventoHistorial";
import { AgendaEventoIrPadreButton } from "./AgendaEventoIrPadreButton";
import { AgendaEventoNotificarAntesField } from "./AgendaEventoNotificarAntesField";
import { AgendaEventoParticipantesField } from "./AgendaEventoParticipantesField";

const TIME_STEP_SECONDS = 300;

const ENTIDAD_TIPO_LABELS: Record<AgendaEntidadPadreFilterTipo, string> = {
  expediente: "Expediente",
  caso: "Caso",
  cliente: "Cliente",
  legajo: "Legajo",
};

const entidadTipoOptions: SelectOption[] = AGENDA_ENTIDAD_PADRE_FILTER_TIPOS.map(
  (tipo) => ({
    value: tipo,
    label: ENTIDAD_TIPO_LABELS[tipo],
  }),
);

const badgeButtonClassName = {
  success:
    "inline-flex cursor-pointer items-center rounded-md px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 transition-colors hover:bg-green-200 active:bg-green-300 disabled:cursor-not-allowed disabled:opacity-50",
  danger:
    "inline-flex cursor-pointer items-center rounded-md px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 transition-colors hover:bg-red-200 active:bg-red-300 disabled:cursor-not-allowed disabled:opacity-50",
  neutral:
    "inline-flex cursor-pointer items-center rounded-md px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 active:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50",
  warning:
    "inline-flex cursor-pointer items-center rounded-md px-2.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 transition-colors hover:bg-yellow-200 active:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50",
} as const;

const textareaClassName =
  "flex min-h-[4.5rem] w-full resize-y rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500";

function undefinedToEmpty(value: unknown): unknown {
  return value === undefined || value === null ? "" : value;
}

function emptyToUndefined(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

const agendaEventoFormSchema = z
  .object({
    tipo_id: z.string().uuid("Seleccioná un tipo de evento"),
    titulo: z
      .string()
      .trim()
      .min(1, MESSAGES.required)
      .max(500, MESSAGES.maxLength(500)),
    descripcion: z.string().trim().max(10000).optional(),
    ubicacion: z.string().trim().max(500).optional(),
    observaciones: z.string().trim().max(10000).optional(),
    fecha: z.preprocess(
      undefinedToEmpty,
      z.string().min(1, MESSAGES.required),
    ),
    hora_inicio: z.preprocess(emptyToUndefined, z.string().optional()),
    hora_fin: z.preprocess(emptyToUndefined, z.string().optional()),
    todo_el_dia: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (!data.todo_el_dia && !data.hora_inicio) {
      ctx.addIssue({
        code: "custom",
        message: "La hora de inicio es obligatoria",
        path: ["hora_inicio"],
      });
    }
    if (
      data.hora_inicio &&
      data.hora_fin &&
      data.hora_fin <= data.hora_inicio
    ) {
      ctx.addIssue({
        code: "custom",
        message: "La hora de fin debe ser posterior a la de inicio",
        path: ["hora_fin"],
      });
    }
  });

type FormValues = z.input<typeof agendaEventoFormSchema>;
type FormOutput = z.output<typeof agendaEventoFormSchema>;

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  entidadTipo?: AgendaEntidadTipo;
  entidadId?: string;
  evento?: AgendaEventoDto | null;
  createDefaults?: AgendaCreateSlot | null;
  defaultParticipanteIds?: string[];
  readOnly?: boolean;
  /** Entidad embebida (ej. caso o cliente en vista detalle); oculta «Ir al…» si coincide con el padre del evento */
  contextEntidad?: { entidadTipo: AgendaEntidadTipo; entidadId: string };
  /** En vista tenant: si true, el padre es obligatorio al crear. Default true (paneles embebidos). */
  requirePadre?: boolean;
  /** Usuario actual; evita fetch a /api/me si ya está disponible arriba */
  currentUser?: ComentariosPanelCurrentUser;
  onSaved: (evento: AgendaEventoDto) => void;
};

export type { AgendaCreateSlot };

const EMPTY_PARTICIPANT_IDS: string[] = [];

const DEFAULT_VALUES: FormValues = {
  tipo_id: "",
  titulo: "",
  descripcion: "",
  ubicacion: "",
  observaciones: "",
  fecha: "",
  hora_inicio: "",
  hora_fin: "",
  todo_el_dia: false,
};

export function AgendaEventoSidePanel({
  open,
  onClose,
  mode,
  entidadTipo,
  entidadId,
  evento,
  createDefaults = null,
  defaultParticipanteIds = EMPTY_PARTICIPANT_IDS,
  readOnly = false,
  contextEntidad,
  requirePadre = true,
  currentUser,
  onSaved,
}: Props) {
  const { toast } = useToast();
  const [tipos, setTipos] = useState<AgendaEventoTipoDto[]>([]);
  const [historial, setHistorial] = useState<AgendaHistorialDto[]>([]);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [historialVisible, setHistorialVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmRealizar, setConfirmRealizar] = useState(false);
  const [pickedEntidadTipo, setPickedEntidadTipo] = useState<
    AgendaEntidadPadreFilterTipo | ""
  >("");
  const [pickedEntidadId, setPickedEntidadId] = useState("");
  const [entidadOptions, setEntidadOptions] = useState<SelectOption[]>([]);
  const [entidadesLoading, setEntidadesLoading] = useState(false);
  const [pickedEntidadTipoError, setPickedEntidadTipoError] = useState<
    string | null
  >(null);
  const [pickedEntidadIdError, setPickedEntidadIdError] = useState<string | null>(
    null,
  );
  const [participanteIds, setParticipanteIds] = useState<string[]>([]);
  const [notificarAntes, setNotificarAntes] =
    useState<AgendaEventoNotificarAntes | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();

  const entidadProvided = Boolean(entidadTipo && entidadId);
  const showEntidadFields =
    mode === "create" && (requirePadre ? !entidadProvided : true);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(agendaEventoFormSchema),
    mode: "onBlur",
    defaultValues: DEFAULT_VALUES,
  });

  const todoElDia = watch("todo_el_dia");
  const canMutate = !readOnly && (mode === "create" || evento?.puedeEditar);

  const eventoId = evento?.id;
  const historialLoadedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setCurrentUserId(currentUser.id);
      return;
    }

    let cancelled = false;
    void getCurrentUser()
      .then((user) => {
        if (!cancelled) setCurrentUserId(user.id);
      })
      .catch(() => {
        if (!cancelled) setCurrentUserId(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    void fetchAgendaTiposCached()
      .then((data) => {
        if (!cancelled) setTipos(data);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("No se pudieron cargar los tipos de evento");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, toast]);

  useEffect(() => {
    if (!open || !showEntidadFields) return;

    setPickedEntidadTipo(
      (entidadTipo as AgendaEntidadPadreFilterTipo | undefined) ?? "",
    );
    setPickedEntidadId(entidadId ?? "");
    setPickedEntidadTipoError(null);
    setPickedEntidadIdError(null);
  }, [open, showEntidadFields, entidadTipo, entidadId]);

  useEffect(() => {
    if (!open || !showEntidadFields || !pickedEntidadTipo) {
      setEntidadOptions([]);
      return;
    }

    let cancelled = false;
    setEntidadesLoading(true);
    void fetchAgendaEntidadesPadreCached(pickedEntidadTipo)
      .then((rows) => {
        if (cancelled) return;
        setEntidadOptions(rows.map((r) => ({ value: r.id, label: r.label })));
      })
      .catch(() => {
        if (!cancelled) setEntidadOptions([]);
      })
      .finally(() => {
        if (!cancelled) setEntidadesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, showEntidadFields, pickedEntidadTipo]);

  useEffect(() => {
    if (open) return;

    historialLoadedForRef.current = null;
    setHistorialVisible(false);
    setHistorial([]);
    setHistorialLoading(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && eventoId && evento) {
      const parts = splitAgendaTimestamps({
        inicioAt: evento.inicioAt,
        finAt: evento.finAt,
        todoElDia: evento.todoElDia,
      });
      reset({
        tipo_id: evento.tipo.id,
        titulo: evento.titulo,
        descripcion: evento.descripcion ?? "",
        ubicacion: evento.ubicacion ?? "",
        observaciones: evento.observaciones ?? "",
        fecha: parts.fecha,
        hora_inicio: parts.horaInicio,
        hora_fin: parts.horaFin,
        todo_el_dia: evento.todoElDia,
      });
      setParticipanteIds(evento.participantes.map((p) => p.usuarioId));
      setNotificarAntes(evento.notificarAntes);

      setHistorialVisible(false);
      historialLoadedForRef.current = null;
      setHistorial([]);
      return;
    }

    historialLoadedForRef.current = null;
    setHistorialVisible(false);
    reset({
      ...DEFAULT_VALUES,
      fecha: createDefaults?.fecha ?? "",
      hora_inicio: createDefaults?.hora_inicio ?? "",
      hora_fin: createDefaults?.hora_fin ?? "",
      todo_el_dia: createDefaults?.todo_el_dia ?? false,
    });
    setParticipanteIds(defaultParticipanteIds);
    setNotificarAntes(null);
    setHistorial([]);
  }, [open, mode, eventoId, evento, createDefaults, defaultParticipanteIds, reset]);

  function handleParticipanteIdsChange(ids: string[]) {
    setParticipanteIds(ids);
    if (ids.length === 0) {
      setNotificarAntes(null);
    }
  }

  function handleNotificarAntesChange(
    value: AgendaEventoNotificarAntes | null,
  ) {
    if (value != null && participanteIds.length === 0) {
      if (!currentUserId) {
        toast.error("No se pudo agregarte como participante");
        return;
      }
      setParticipanteIds([currentUserId]);
    }
    setNotificarAntes(value);
  }

  function serializeNotificarAntesPayload() {
    return {
      notificar_antes_cantidad: notificarAntes?.cantidad ?? null,
      notificar_antes_unidad: notificarAntes?.unidad ?? null,
    };
  }

  async function handleShowHistorial() {
    if (!eventoId) return;

    setHistorialVisible(true);

    if (historialLoadedForRef.current === eventoId) return;

    historialLoadedForRef.current = eventoId;
    setHistorialLoading(true);
    try {
      const data = await fetchAgendaEventoHistorialCached(eventoId);
      setHistorial(data);
    } catch {
      setHistorial([]);
      toast.error("No se pudo cargar el historial");
    } finally {
      setHistorialLoading(false);
    }
  }

  function resolveCreateEntidad():
    | { entidad_tipo: AgendaEntidadTipo; entidad_id: string }
    | Record<string, never>
    | null {
    const resolvedTipo = (
      showEntidadFields ? pickedEntidadTipo : entidadTipo
    ) as AgendaEntidadPadreFilterTipo | "";
    const resolvedId = showEntidadFields ? pickedEntidadId : (entidadId ?? "");

    if (!requirePadre && !resolvedTipo && !resolvedId) {
      setPickedEntidadTipoError(null);
      setPickedEntidadIdError(null);
      return {};
    }

    let valid = true;
    if (!resolvedTipo) {
      setPickedEntidadTipoError(MESSAGES.required);
      valid = false;
    } else {
      setPickedEntidadTipoError(null);
    }
    if (!resolvedId) {
      setPickedEntidadIdError(MESSAGES.required);
      valid = false;
    } else {
      setPickedEntidadIdError(null);
    }

    if (!valid || !resolvedTipo || !resolvedId) return null;

    return {
      entidad_tipo: resolvedTipo,
      entidad_id: resolvedId,
    };
  }

  async function onSubmit(values: FormOutput) {
    if (!canMutate) return;
    setPending(true);
    try {
      if (mode === "create") {
        const entidad = resolveCreateEntidad();
        if (!entidad) {
          setPending(false);
          return;
        }

        const created = await createAgendaEvento({
          ...(entidad.entidad_tipo && entidad.entidad_id
            ? {
                entidad_tipo: entidad.entidad_tipo,
                entidad_id: entidad.entidad_id,
              }
            : {}),
          tipo_id: values.tipo_id,
          titulo: values.titulo,
          descripcion: values.descripcion || undefined,
          ubicacion: values.ubicacion || undefined,
          observaciones: values.observaciones || undefined,
          fecha: values.fecha,
          hora_inicio: values.todo_el_dia ? undefined : values.hora_inicio,
          hora_fin: values.todo_el_dia ? undefined : values.hora_fin || undefined,
          todo_el_dia: values.todo_el_dia,
          participante_ids: participanteIds,
          ...serializeNotificarAntesPayload(),
        });
        toast.success("Evento creado");
        onSaved(created);
        onClose();
      } else if (evento) {
        const updated = await updateAgendaEvento(evento.id, {
          tipo_id: values.tipo_id,
          titulo: values.titulo,
          descripcion: values.descripcion || undefined,
          ubicacion: values.ubicacion || undefined,
          observaciones: values.observaciones || undefined,
          fecha: values.fecha,
          hora_inicio: values.todo_el_dia ? undefined : values.hora_inicio,
          hora_fin: values.todo_el_dia ? null : values.hora_fin || undefined,
          todo_el_dia: values.todo_el_dia,
          participante_ids: participanteIds,
          ...serializeNotificarAntesPayload(),
        });
        invalidateAgendaEventoHistorialCache(evento.id);
        toast.success("Evento actualizado");
        onSaved(updated);
        onClose();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo guardar el evento",
      );
    } finally {
      setPending(false);
    }
  }

  async function handleEstadoChange(estado: AgendaEventoEstado) {
    if (!evento?.puedeCambiarEstado || readOnly) return;
    setPending(true);
    try {
      const updated = await updateAgendaEvento(evento.id, { estado });
      invalidateAgendaEventoHistorialCache(evento.id);
      const messageByEstado: Record<AgendaEventoEstado, string> = {
        programado: "El evento volvió a estar programado",
        realizado: "Evento marcado como realizado",
        cancelado: "Evento cancelado",
      };
      toast.success(messageByEstado[estado]);
      onSaved(updated);
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo actualizar el estado",
      );
    } finally {
      setPending(false);
      setConfirmCancel(false);
      setConfirmRealizar(false);
    }
  }

  const tipoOptions = tipos.map((t) => ({ value: t.id, label: t.nombre }));

  return (
    <>
      <SidePanel open={open} onClose={onClose} width="md">
        <SidePanelHeader>
          <SidePanelTitle>
            {mode === "create" ? "Nuevo evento" : "Detalle del evento"}
          </SidePanelTitle>
          <SidePanelDescription>
            {mode === "create"
              ? "Programá un compromiso, audiencia o vencimiento."
              : "Editá los datos del evento."}
          </SidePanelDescription>
        </SidePanelHeader>

        <SidePanelContent>
          {mode === "edit" &&
            evento?.padre &&
            !isAgendaEventoEnMismoContexto(evento.padre, contextEntidad) && (
              <AgendaEventoIrPadreButton
                padre={evento.padre}
                className="mb-4"
                onNavigate={onClose}
              />
            )}

          <form
            id="agenda-evento-form"
            className="space-y-4"
            onSubmit={(e) => {
              e.stopPropagation();
              void handleSubmit(onSubmit)(e);
            }}
            noValidate
          >
            {showEntidadFields && (
              <>
                <FormField state={pickedEntidadTipoError ? "error" : "default"}>
                  <Label required={requirePadre}>Tipo de entidad</Label>
                  {!requirePadre && (
                    <HelperText>
                      Opcional. Podés dejar el evento sin asociar a un expediente,
                      caso u otra entidad.
                    </HelperText>
                  )}
                  <Select
                    id="agenda-entidad-tipo"
                    options={
                      requirePadre
                        ? entidadTipoOptions
                        : [
                            { value: "", label: "Sin asociar" },
                            ...entidadTipoOptions,
                          ]
                    }
                    value={pickedEntidadTipo}
                    onChange={(value) => {
                      setPickedEntidadTipo(
                        value as AgendaEntidadPadreFilterTipo | "",
                      );
                      setPickedEntidadId("");
                      setPickedEntidadTipoError(null);
                      setPickedEntidadIdError(null);
                    }}
                    placeholder="Seleccionar tipo"
                    disabled={!canMutate || pending}
                  />
                  {pickedEntidadTipoError && (
                    <ErrorMessage>{pickedEntidadTipoError}</ErrorMessage>
                  )}
                </FormField>

                <FormField state={pickedEntidadIdError ? "error" : "default"}>
                  <Label required={requirePadre}>Entidad</Label>
                  <SearchableSelect
                    id="agenda-entidad-id"
                    options={entidadOptions}
                    value={pickedEntidadId}
                    onChange={(value) => {
                      setPickedEntidadId(value);
                      setPickedEntidadIdError(null);
                    }}
                    placeholder={
                      !pickedEntidadTipo
                        ? "Seleccioná primero el tipo"
                        : entidadesLoading
                          ? "Cargando…"
                          : "Buscar por número o nombre…"
                    }
                    disabled={
                      !canMutate || pending || !pickedEntidadTipo || entidadesLoading
                    }
                  />
                  {pickedEntidadIdError && (
                    <ErrorMessage>{pickedEntidadIdError}</ErrorMessage>
                  )}
                </FormField>
              </>
            )}

            <FormField>
              <Label htmlFor="agenda-tipo">Tipo de evento</Label>
              <Controller
                name="tipo_id"
                control={control}
                render={({ field }) => (
                  <Select
                    id="agenda-tipo"
                    options={tipoOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Seleccionar tipo"
                    disabled={!canMutate || pending}
                  />
                )}
              />
              {errors.tipo_id && (
                <ErrorMessage>{errors.tipo_id.message}</ErrorMessage>
              )}
            </FormField>

            <FormField>
              <Label htmlFor="agenda-titulo">Título</Label>
              <Input
                id="agenda-titulo"
                {...register("titulo")}
                disabled={!canMutate || pending}
              />
              {errors.titulo && (
                <ErrorMessage>{errors.titulo.message}</ErrorMessage>
              )}
            </FormField>

            <FormField>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[7rem] flex-1">
                  <Label htmlFor="agenda-fecha">Fecha</Label>
                  <Controller
                    name="fecha"
                    control={control}
                    render={({ field }) => (
                      <DateInputPicker
                        id="agenda-fecha"
                        value={typeof field.value === "string" ? field.value : ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        disabled={!canMutate || pending}
                      />
                    )}
                  />
                </div>

                <div className="flex shrink-0 items-center gap-2 pb-1.5">
                  <Label
                    htmlFor="agenda-todo-el-dia"
                    className="mb-0 whitespace-nowrap text-sm"
                  >
                    Todo el día
                  </Label>
                  <Controller
                    name="todo_el_dia"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        id="agenda-todo-el-dia"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        disabled={!canMutate || pending}
                      />
                    )}
                  />
                </div>

                {!todoElDia && (
                  <>
                    <div className="w-[7.25rem] shrink-0">
                      <Label htmlFor="agenda-hora-inicio">Inicio</Label>
                      <Input
                        id="agenda-hora-inicio"
                        type="time"
                        step={TIME_STEP_SECONDS}
                        {...register("hora_inicio")}
                        disabled={!canMutate || pending}
                      />
                    </div>
                    <div className="w-[7.25rem] shrink-0">
                      <Label htmlFor="agenda-hora-fin">Fin</Label>
                      <Input
                        id="agenda-hora-fin"
                        type="time"
                        step={TIME_STEP_SECONDS}
                        {...register("hora_fin")}
                        disabled={!canMutate || pending}
                      />
                    </div>
                  </>
                )}
              </div>
              <AgendaEventoNotificarAntesField
                value={notificarAntes}
                onChange={handleNotificarAntesChange}
                disabled={!canMutate || pending}
              />
              {errors.fecha && (
                <ErrorMessage>{errors.fecha.message}</ErrorMessage>
              )}
              {!todoElDia && errors.hora_inicio && (
                <ErrorMessage>{errors.hora_inicio.message}</ErrorMessage>
              )}
              {!todoElDia && errors.hora_fin && (
                <ErrorMessage>{errors.hora_fin.message}</ErrorMessage>
              )}
            </FormField>

            <FormField>
              <Label htmlFor="agenda-ubicacion">Ubicación</Label>
              <Input
                id="agenda-ubicacion"
                {...register("ubicacion")}
                disabled={!canMutate || pending}
              />
            </FormField>

            <FormField>
              <Label htmlFor="agenda-descripcion">Descripción</Label>
              <textarea
                id="agenda-descripcion"
                className={textareaClassName}
                {...register("descripcion")}
                disabled={!canMutate || pending}
              />
            </FormField>

            <FormField>
              <Label htmlFor="agenda-observaciones">Observaciones</Label>
              <textarea
                id="agenda-observaciones"
                className={textareaClassName}
                {...register("observaciones")}
                disabled={!canMutate || pending}
              />
              <HelperText>Notas internas del estudio</HelperText>
            </FormField>

            <AgendaEventoParticipantesField
              value={participanteIds}
              onChange={handleParticipanteIdsChange}
              disabled={!canMutate || pending}
              readOnlyParticipantes={
                !canMutate ? evento?.participantes : undefined
              }
            />
          </form>

          {mode === "edit" && evento && (
            <div className="mt-6 space-y-6 border-t border-zinc-200 pt-6">
              {evento.puedeCambiarEstado && !readOnly && (
                <div className="flex flex-wrap gap-2">
                  {evento.estado === "programado" && (
                    <>
                      <button
                        type="button"
                        className={badgeButtonClassName.success}
                        disabled={pending}
                        onClick={() => setConfirmRealizar(true)}
                      >
                        Marcar como realizado
                      </button>
                      <button
                        type="button"
                        className={badgeButtonClassName.danger}
                        disabled={pending}
                        onClick={() => setConfirmCancel(true)}
                      >
                        Cancelar evento
                      </button>
                    </>
                  )}
                  {evento.estado === "realizado" && (
                    <Button
                      type="button"
                      variant="outline-secondary"
                      size="sm"
                      disabled={pending}
                      onClick={() => void handleEstadoChange("programado")}
                    >
                      Quitar marca de realizado
                    </Button>
                  )}
                  {evento.estado === "cancelado" && (
                    <button
                      type="button"
                      className={badgeButtonClassName.warning}
                      disabled={pending}
                      onClick={() => void handleEstadoChange("programado")}
                    >
                      Reactivar evento
                    </button>
                  )}
                </div>
              )}
              <div>
                <h4 className="mb-2 text-sm font-semibold text-zinc-900">
                  Comentarios
                </h4>
                <ComentariosPanel
                  entidadTipo="evento"
                  entidadId={evento.id}
                  currentUser={currentUser}
                  disabled={readOnly}
                  variant="compact"
                  maxVisible={3}
                  botonNuevoComentario={true}
                />
              </div>

              <div>
                {!historialVisible ? (
                  <button
                    type="button"
                    className={badgeButtonClassName.neutral}
                    disabled={pending}
                    onClick={() => void handleShowHistorial()}
                  >
                    Historial
                  </button>
                ) : (
                  <>
                    <h4 className="mb-2 text-sm font-semibold text-zinc-900">
                      Historial
                    </h4>
                    <AgendaEventoHistorial
                      items={historial}
                      loading={historialLoading}
                    />
                  </>
                )}
              </div>
            
            </div>
          )}
        </SidePanelContent>

        {canMutate && (
          <SidePanelFooter>
            <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
              Cerrar
            </Button>
            <Button
              type="submit"
              form="agenda-evento-form"
              disabled={pending}
            >
              {mode === "create" ? "Crear evento" : "Guardar cambios"}
            </Button>
          </SidePanelFooter>
        )}
      </SidePanel>

      <ConfirmModal
        open={confirmRealizar}
        onClose={() => setConfirmRealizar(false)}
        onConfirm={() => handleEstadoChange("realizado")}
        title="Marcar como realizado"
        description="¿Confirmás que este evento ya se realizó?"
        confirmLabel="Marcar como realizado"
      />

      <ConfirmModal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => handleEstadoChange("cancelado")}
        title="Cancelar evento"
        description="El evento quedará en estado cancelado."
        confirmLabel="Cancelar evento"
      />
    </>
  );
}
