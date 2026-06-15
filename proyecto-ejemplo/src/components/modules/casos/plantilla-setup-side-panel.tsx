"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
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
import {
  FormField,
  Label,
  HelperText,
  ErrorMessage,
} from "@/components/ui/form-field";
import {
  Table,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Icon } from "@/components/ui/icons";
import { searchCamposDinamicos } from "@/lib/api/campos-dinamicos";
import {
  createPlantillaSetup,
  getPlantillaSetup,
  updatePlantillaSetup,
} from "@/lib/api/plantilla-setup";
import { MESSAGES } from "@/lib/validation/common/messages";

const CASO_CONTEXTO = "caso";
const MIN_QUERY = 2;
const SEARCH_DEBOUNCE_MS = 300;

function emptyToUndefined(v: unknown): unknown {
  return typeof v === "string" && v.trim() === "" ? undefined : v;
}

const plantillaSetupFormSchema = z.object({
  nombre: z
    .string()
    .min(1, MESSAGES.required)
    .max(200, MESSAGES.maxLength(200)),
  descripcion: z.preprocess(
    emptyToUndefined,
    z.string().max(500, MESSAGES.maxLength(500)).optional(),
  ),
  prioridad: z.coerce.number().int().min(0).max(9999),
});

type PlantillaSetupFormInput = z.input<typeof plantillaSetupFormSchema>;
type PlantillaSetupFormOutput = z.output<typeof plantillaSetupFormSchema>;

export type PlantillaSetupCampoLink = {
  campo_dinamico_id: string;
  etiqueta: string;
  tipo: string;
  orden: number;
  requerido: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  plantillaId?: string;
  practicaId: string;
  practicaLabel: string | null;
  onSuccess: (plantillaId: string) => void;
};

export function PlantillaSetupSidePanel({
  open,
  onClose,
  mode,
  plantillaId,
  practicaId,
  practicaLabel,
  onSuccess,
}: Props) {
  const isEdit = mode === "edit";

  const [isPending, setIsPending] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [camposError, setCamposError] = useState<string | null>(null);
  const [linkedCampos, setLinkedCampos] = useState<PlantillaSetupCampoLink[]>(
    [],
  );

  const [campoSearch, setCampoSearch] = useState("");
  const [campoResults, setCampoResults] = useState<
    Array<{ id: string; etiqueta: string; tipo: string; clave: string }>
  >([]);
  const [campoSearching, setCampoSearching] = useState(false);
  const [showCampoDropdown, setShowCampoDropdown] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<
    PlantillaSetupFormInput,
    unknown,
    PlantillaSetupFormOutput
  >({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(plantillaSetupFormSchema) as any,
    mode: "onBlur",
    defaultValues: {
      nombre: "",
      descripcion: "",
      prioridad: 100,
    },
  });

  const resetCreateState = useCallback(() => {
    reset({
      nombre: "",
      descripcion: "",
      prioridad: 100,
    });
    setLinkedCampos([]);
    setCamposError(null);
    setCampoSearch("");
    setCampoResults([]);
    setShowCampoDropdown(false);
  }, [reset]);

  useEffect(() => {
    if (!open) return;

    if (mode === "create") {
      resetCreateState();
      return;
    }

    if (!plantillaId) return;

    let cancelled = false;
    setLoadingEdit(true);
    setCamposError(null);

    getPlantillaSetup(plantillaId, practicaId)
      .then((detail) => {
        if (cancelled) return;
        reset({
          nombre: detail.plantilla.nombre,
          descripcion: detail.plantilla.descripcion ?? "",
          prioridad: detail.prioridad,
        });
        setLinkedCampos(
          detail.campos.map((c) => ({
            campo_dinamico_id: c.campo_dinamico_id,
            etiqueta: c.etiqueta,
            tipo: c.tipo,
            orden: c.orden,
            requerido: c.requerido,
          })),
        );
        setCampoSearch("");
        setCampoResults([]);
        setShowCampoDropdown(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setCamposError(
          err instanceof Error ? err.message : "Error al cargar la plantilla",
        );
        setLinkedCampos([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingEdit(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, mode, plantillaId, practicaId, reset, resetCreateState]);

  const runCampoSearch = useCallback(async (term: string) => {
    const q = term.trim();
    if (q.length < MIN_QUERY) {
      setCampoResults([]);
      setShowCampoDropdown(false);
      return;
    }
    setCampoSearching(true);
    try {
      const rows = await searchCamposDinamicos(CASO_CONTEXTO, q);
      setCampoResults(rows);
      setShowCampoDropdown(true);
    } catch {
      setCampoResults([]);
    } finally {
      setCampoSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (campoSearch.trim().length < MIN_QUERY) {
      setCampoResults([]);
      setShowCampoDropdown(false);
      return;
    }

    searchDebounceRef.current = setTimeout(() => {
      void runCampoSearch(campoSearch);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [campoSearch, runCampoSearch, open]);

  function handleAddCampo(campo: {
    id: string;
    etiqueta: string;
    tipo: string;
  }) {
    if (linkedCampos.some((c) => c.campo_dinamico_id === campo.id)) {
      setCamposError("Este campo ya está en la plantilla.");
      return;
    }
    setCamposError(null);
    const nextOrden =
      linkedCampos.length === 0
        ? 10
        : Math.max(...linkedCampos.map((c) => c.orden)) + 10;

    setLinkedCampos((prev) => [
      ...prev,
      {
        campo_dinamico_id: campo.id,
        etiqueta: campo.etiqueta,
        tipo: campo.tipo,
        orden: nextOrden,
        requerido: false,
      },
    ]);
    setCampoSearch("");
    setShowCampoDropdown(false);
    setCampoResults([]);
  }

  function handleRemoveCampo(campoId: string) {
    setLinkedCampos((prev) =>
      prev.filter((c) => c.campo_dinamico_id !== campoId),
    );
    setCamposError(null);
  }

  function updateCampoLink(
    campoId: string,
    patch: Partial<Pick<PlantillaSetupCampoLink, "orden" | "requerido">>,
  ) {
    setLinkedCampos((prev) =>
      prev.map((c) =>
        c.campo_dinamico_id === campoId ? { ...c, ...patch } : c,
      ),
    );
  }

  async function handleFormSubmit(data: PlantillaSetupFormOutput) {
    if (linkedCampos.length === 0) {
      setCamposError("Agregá al menos un campo a la plantilla.");
      return;
    }

    setIsPending(true);
    setCamposError(null);

    const payload = {
      practica_id: practicaId,
      plantilla: {
        nombre: data.nombre,
        descripcion: data.descripcion,
      },
      campos: linkedCampos.map((c) => ({
        campo_dinamico_id: c.campo_dinamico_id,
        orden: c.orden,
        requerido: c.requerido,
      })),
      prioridad: data.prioridad,
    };

    try {
      if (isEdit) {
        if (!plantillaId) {
          setCamposError("Plantilla no especificada.");
          return;
        }
        await updatePlantillaSetup(plantillaId, payload);
        onSuccess(plantillaId);
      } else {
        const result = await createPlantillaSetup(payload);
        onSuccess(result.plantilla_id);
      }
      onClose();
    } catch (err: unknown) {
      setCamposError(
        err instanceof Error
          ? err.message
          : isEdit
            ? "Error al actualizar la plantilla"
            : "Error al crear la plantilla",
      );
    } finally {
      setIsPending(false);
    }
  }

  const practicaDisplay = practicaLabel?.trim() || "—";

  return (
    <SidePanel open={open} onClose={onClose} width="sm">
      <SidePanelHeader>
        <SidePanelTitle>
          {isEdit ? "Editar plantilla de trámite" : "Nueva plantilla de trámite"}
        </SidePanelTitle>
        <SidePanelDescription>
          {isEdit
            ? "Modificá la composición de campos de la plantilla seleccionada."
            : "Creá una plantilla para la práctica seleccionada en el caso."}
        </SidePanelDescription>
      </SidePanelHeader>

      <SidePanelContent>
        {loadingEdit ? (
          <p className="text-sm text-zinc-400">Cargando plantilla…</p>
        ) : (
          <form
            id="plantilla-setup-form"
            onSubmit={(e) => {
              e.stopPropagation();
              void handleSubmit(handleFormSubmit)(e);
            }}
            className="space-y-5"
          >
            {/* Section A — Plantilla */}
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Plantilla
              </p>
              <FormField id="nombre" state={errors.nombre ? "error" : "default"}>
                <Label required>Nombre</Label>
                <Input
                  {...register("nombre")}
                  placeholder="Ej. Legajo despido laboral"
                  state={errors.nombre ? "error" : "default"}
                />
                {errors.nombre && (
                  <ErrorMessage>{errors.nombre.message}</ErrorMessage>
                )}
              </FormField>

              <FormField
                id="descripcion"
                state={errors.descripcion ? "error" : "default"}
              >
                <Label>Descripción</Label>
                <Input
                  {...register("descripcion")}
                  placeholder="Opcional"
                  state={errors.descripcion ? "error" : "default"}
                />
                {errors.descripcion && (
                  <ErrorMessage>{errors.descripcion.message}</ErrorMessage>
                )}
              </FormField>
            </div>

            {/* Section B — Campos */}
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Campos
              </p>
              <FormField id="campo-search">
                <Label>Agregar campo del catálogo</Label>
                <div className="relative">
                  <Input
                    leftIcon={<Icon.Search className="size-3.5" />}
                    loading={campoSearching}
                    value={campoSearch}
                    onChange={(e) => setCampoSearch(e.target.value)}
                    onFocus={() => {
                      if (campoResults.length > 0) setShowCampoDropdown(true);
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowCampoDropdown(false), 150);
                    }}
                    placeholder={`Buscar por nombre o clave (mín. ${MIN_QUERY} caracteres)…`}
                    autoComplete="off"
                    className="!pl-7"
                  />
                  {showCampoDropdown && campoResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-48 overflow-y-auto rounded-xl border border-zinc-200/90 bg-white/95 py-1.5 shadow-xl shadow-zinc-900/[0.08] ring-1 ring-zinc-900/[0.04] backdrop-blur-md">
                      {campoResults.map((campo) => (
                        <div
                          key={campo.id}
                          role="option"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleAddCampo(campo);
                          }}
                          className="mx-1 cursor-pointer select-none rounded-lg px-3 py-2 text-sm transition-colors duration-100 hover:bg-zinc-50"
                        >
                          <span className="font-medium text-zinc-900">
                            {campo.etiqueta}
                          </span>
                          <span className="ml-2 text-xs text-zinc-400">
                            {campo.tipo} · {campo.clave}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <HelperText>Solo campos activos del contexto caso.</HelperText>
              </FormField>

              {camposError && (
                <p className="text-xs text-red-600">{camposError}</p>
              )}

              {linkedCampos.length === 0 ? (
                <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-4 text-center text-sm text-zinc-400">
                  Sin campos agregados
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-zinc-200">
                  <table className="w-full border-collapse text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableCell isHeader className="pl-3">
                          Campo
                        </TableCell>
                        <TableCell isHeader className="w-20">
                          Orden
                        </TableCell>
                        <TableCell isHeader align="center" className="w-24">
                          Req.
                        </TableCell>
                        <TableCell isHeader align="right" className="w-12 pr-3">
                          {" "}
                        </TableCell>
                      </TableRow>
                    </TableHeader>
                    <tbody>
                      {[...linkedCampos]
                        .sort((a, b) => a.orden - b.orden)
                        .map((campo) => (
                          <TableRow key={campo.campo_dinamico_id}>
                            <TableCell className="pl-3">
                              <span className="font-medium text-zinc-900">
                                {campo.etiqueta}
                              </span>
                              <span className="ml-1.5 text-xs text-zinc-400">
                                {campo.tipo}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                className="h-7 px-2 text-xs"
                                value={campo.orden}
                                onChange={(e) =>
                                  updateCampoLink(campo.campo_dinamico_id, {
                                    orden: Number(e.target.value) || 0,
                                  })
                                }
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Switch
                                size="sm"
                                checked={campo.requerido}
                                onChange={(e) =>
                                  updateCampoLink(campo.campo_dinamico_id, {
                                    requerido: e.target.checked,
                                  })
                                }
                              />
                            </TableCell>
                            <TableCell align="right" className="pr-3">
                              <ActionIconButton
                                type="button"
                                variant="destructive"
                                onClick={() =>
                                  handleRemoveCampo(campo.campo_dinamico_id)
                                }
                              >
                                <Icon.Trash className="size-3.5" />
                              </ActionIconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Section C — Regla */}
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Regla automática
              </p>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-500">Práctica</span>
                  <span className="font-medium text-zinc-900">
                    {practicaDisplay}
                  </span>
                </div>
              </div>
              <FormField
                id="prioridad"
                state={errors.prioridad ? "error" : "default"}
              >
                <Label>Prioridad</Label>
                <Input
                  type="number"
                  {...register("prioridad")}
                  state={errors.prioridad ? "error" : "default"}
                />
                {errors.prioridad ? (
                  <ErrorMessage>{errors.prioridad.message}</ErrorMessage>
                ) : (
                  <HelperText>
                    Valor por defecto: 100. Mayor = más prioritaria.
                  </HelperText>
                )}
              </FormField>
            </div>
          </form>
        )}
      </SidePanelContent>

      <SidePanelFooter>
        <Button
          variant="secondary"
          type="button"
          onClick={onClose}
          disabled={isPending || loadingEdit}
        >
          Cancelar
        </Button>
        <Button
          form="plantilla-setup-form"
          type="submit"
          loading={isPending}
          disabled={loadingEdit}
        >
          {isEdit ? "Guardar cambios" : "Crear plantilla"}
        </Button>
      </SidePanelFooter>
    </SidePanel>
  );
}
