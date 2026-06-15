"use client";

import { useMemo, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import {
  TableReorderColumnCell,
  TABLE_REORDER_HEADER_CLASS,
} from "@/components/ui/table-order-cell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkflowEtapaOrderBadge } from "@/components/modules/workflows/workflow-etapa-order-badge";
import { WORKFLOW_ETAPA_CARD_SURFACE_CLASS } from "@/components/modules/workflows/workflow-etapa-colors";
import { WorkflowEtapaTypeBadges } from "@/components/modules/workflows/workflow-etapa-type-badges";
import {
  FormField,
  Label,
  HelperText,
  ErrorMessage,
} from "@/components/ui/form-field";
import { Icon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { ConfirmModal } from "@/components/ui/modal";
import {
  SidePanel,
  SidePanelContent,
  SidePanelDescription,
  SidePanelFooter,
  SidePanelHeader,
  SidePanelTitle,
} from "@/components/ui/side-panel";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
  TableSurface,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import {
  createWorkflowTarea,
  deleteWorkflowTarea,
  reorderWorkflowTareas,
  updateWorkflowTarea,
  WorkflowApiError,
} from "@/lib/api/workflows.api";
import type {
  WorkflowDetailDto,
  WorkflowEtapaDto,
  WorkflowTareaDto,
} from "@/lib/types/workflow";
import {
  createWorkflowTareaSchema,
  type CreateWorkflowTareaSchemaInput,
} from "@/lib/validation/schemas/workflow.schema";

const textareaClassName =
  "flex min-h-[4.5rem] w-full resize-y rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500";

type PanelMode = "create" | "edit" | null;

type PendingDelete = {
  etapaId: string;
  tarea: WorkflowTareaDto;
} | null;

type Props = {
  workflow: WorkflowDetailDto;
  readonly?: boolean;
  disabled?: boolean;
  onWorkflowChange: (workflow: WorkflowDetailDto) => void;
};

function sortEtapas(etapas: WorkflowEtapaDto[]): WorkflowEtapaDto[] {
  return [...etapas].sort((a, b) => a.orden - b.orden);
}

function sortTareas(tareas: WorkflowTareaDto[]): WorkflowTareaDto[] {
  return [...tareas].sort((a, b) => a.orden - b.orden);
}

function tareaToFormValues(
  tarea?: WorkflowTareaDto,
): CreateWorkflowTareaSchemaInput {
  return {
    titulo: tarea?.titulo ?? "",
    descripcion: tarea?.descripcion ?? "",
    obligatoria: tarea?.obligatoria ?? false,
  };
}

type EtapaTareasSectionProps = {
  workflowId: string;
  etapa: WorkflowEtapaDto;
  position: number;
  readonly: boolean;
  isBusy: boolean;
  reorderingId: string | null;
  onWorkflowChange: (workflow: WorkflowDetailDto) => void;
  onAddTarea: (etapaId: string) => void;
  onEditTarea: (etapaId: string, tarea: WorkflowTareaDto) => void;
  onDeleteTarea: (etapaId: string, tarea: WorkflowTareaDto) => void;
  onReorderStart: (tareaId: string) => void;
  onReorderEnd: () => void;
};

function EtapaTareasSection({
  workflowId,
  etapa,
  position,
  readonly,
  isBusy,
  reorderingId,
  onWorkflowChange,
  onAddTarea,
  onEditTarea,
  onDeleteTarea,
  onReorderStart,
  onReorderEnd,
}: EtapaTareasSectionProps) {
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  const tareas = useMemo(() => sortTareas(etapa.tareas ?? []), [etapa.tareas]);

  function handleMove(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tareas.length) return;

    const nextOrder = [...tareas];
    [nextOrder[index], nextOrder[targetIndex]] = [
      nextOrder[targetIndex],
      nextOrder[index],
    ];

    const movingId = tareas[index].id;
    onReorderStart(movingId);

    startTransition(async () => {
      try {
        const updated = await reorderWorkflowTareas(workflowId, etapa.id, {
          tarea_ids: nextOrder.map((tarea) => tarea.id),
        });
        onWorkflowChange(updated);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Error al reordenar las tareas";
        toast.error(message);
      } finally {
        onReorderEnd();
      }
    });
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border ${WORKFLOW_ETAPA_CARD_SURFACE_CLASS[etapa.color]}`}
    >
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
          <WorkflowEtapaOrderBadge position={position} color={etapa.color} />
          <CardTitle className="min-w-0 text-sm font-medium text-zinc-900">
            {etapa.nombre}
          </CardTitle>
          <WorkflowEtapaTypeBadges etapa={etapa} />
        </div>
        {!readonly ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isBusy}
            onClick={() => onAddTarea(etapa.id)}
            className="shrink-0"
          >
            Agregar tarea
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="py-0 pb-3">
        <TableSurface className="border-zinc-200 bg-white">
          <Table noBorder>
            <TableHeader>
              <TableRow>
                <TableCell
                  isHeader
                  className={TABLE_REORDER_HEADER_CLASS}
                  aria-label="Reordenar"
                />
                <TableCell isHeader>Título</TableCell>
                <TableCell isHeader>Descripción</TableCell>
                <TableCell isHeader>Obligatoria</TableCell>
                {!readonly ? (
                  <TableCell isHeader align="right" className="pr-3">
                    Acciones
                  </TableCell>
                ) : null}
              </TableRow>
            </TableHeader>
            <tbody>
              {tareas.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={readonly ? 4 : 5}
                    className="py-6 text-center text-sm text-zinc-500"
                  >
                    {readonly
                      ? "Esta etapa no tiene tareas sugeridas."
                      : "Agregá tareas sugeridas para esta etapa."}
                  </TableCell>
                </TableRow>
              ) : (
                tareas.map((tarea, index) => {
                  const isRowReordering = reorderingId === tarea.id;

                  return (
                    <TableRow
                      key={tarea.id}
                      className={isRowReordering ? "opacity-60" : undefined}
                    >
                      <TableReorderColumnCell
                        readonly={readonly}
                        controls={{
                          canMoveUp: index > 0,
                          canMoveDown: index < tareas.length - 1,
                          disabled: isBusy,
                          reordering: isRowReordering,
                          onMoveUp: () => handleMove(index, "up"),
                          onMoveDown: () => handleMove(index, "down"),
                          upLabel: "Subir tarea",
                          downLabel: "Bajar tarea",
                        }}
                      />
                      <TableCell className="font-medium text-zinc-900">
                        {tarea.titulo}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-zinc-600">
                        {tarea.descripcion?.trim() || "—"}
                      </TableCell>
                      <TableCell>
                        {tarea.obligatoria ? (
                          <Badge variant="warning">Obligatoria</Badge>
                        ) : (
                          <span className="text-sm text-zinc-400">Opcional</span>
                        )}
                      </TableCell>
                      {!readonly ? (
                        <TableCell align="right" className="pr-3">
                          <div className="flex items-center justify-end gap-1">
                            <ActionIconButton
                              type="button"
                              disabled={isBusy}
                              onClick={() => onEditTarea(etapa.id, tarea)}
                              aria-label="Editar tarea"
                            >
                              <Icon.Edit />
                            </ActionIconButton>
                            <ActionIconButton
                              type="button"
                              variant="destructive"
                              disabled={isBusy}
                              onClick={() => onDeleteTarea(etapa.id, tarea)}
                              aria-label="Eliminar tarea"
                            >
                              <Icon.Trash />
                            </ActionIconButton>
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })
              )}
            </tbody>
          </Table>
        </TableSurface>
      </CardContent>
    </div>
  );
}

export function WorkflowStepTareas({
  workflow,
  readonly = false,
  disabled = false,
  onWorkflowChange,
}: Props) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [activeEtapaId, setActiveEtapaId] = useState<string | null>(null);
  const [editingTarea, setEditingTarea] = useState<WorkflowTareaDto | null>(
    null,
  );
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const etapas = useMemo(
    () => sortEtapas(workflow.etapas),
    [workflow.etapas],
  );

  const isBusy = disabled || isPending || reorderingId !== null;

  const activeEtapa = etapas.find((etapa) => etapa.id === activeEtapaId);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors },
  } = useForm<CreateWorkflowTareaSchemaInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createWorkflowTareaSchema) as any,
    mode: "onBlur",
    defaultValues: tareaToFormValues(),
  });

  function openCreatePanel(etapaId: string) {
    setActiveEtapaId(etapaId);
    setEditingTarea(null);
    reset(tareaToFormValues());
    setPanelMode("create");
  }

  function openEditPanel(etapaId: string, tarea: WorkflowTareaDto) {
    setActiveEtapaId(etapaId);
    setEditingTarea(tarea);
    reset(tareaToFormValues(tarea));
    setPanelMode("edit");
  }

  function closePanel() {
    setPanelMode(null);
    setActiveEtapaId(null);
    setEditingTarea(null);
  }

  function handleApiFieldError(error: unknown) {
    if (error instanceof WorkflowApiError) {
      if (error.field === "titulo") {
        setError("titulo", { message: error.message });
      }
      toast.error(error.message);
      return;
    }

    const message =
      error instanceof Error ? error.message : "Error al guardar la tarea";
    toast.error(message);
  }

  function submitTarea(values: CreateWorkflowTareaSchemaInput) {
    if (!activeEtapaId) return;

    startTransition(async () => {
      try {
        if (panelMode === "create") {
          const updated = await createWorkflowTarea(
            workflow.id,
            activeEtapaId,
            values,
          );
          onWorkflowChange(updated);
          toast.success("Tarea creada");
        } else if (panelMode === "edit" && editingTarea) {
          const updated = await updateWorkflowTarea(
            workflow.id,
            activeEtapaId,
            editingTarea.id,
            values,
          );
          onWorkflowChange(updated);
          toast.success("Tarea actualizada");
        }

        closePanel();
      } catch (error) {
        handleApiFieldError(error);
      }
    });
  }

  function handleConfirmDelete() {
    if (!pendingDelete) return;

    startTransition(async () => {
      try {
        const updated = await deleteWorkflowTarea(
          workflow.id,
          pendingDelete.etapaId,
          pendingDelete.tarea.id,
        );
        onWorkflowChange(updated);
        toast.success("Tarea eliminada");
        setPendingDelete(null);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Error al eliminar la tarea";
        toast.error(message);
      }
    });
  }

  const deleteDescription = pendingDelete
    ? `¿Eliminar la tarea "${pendingDelete.tarea.titulo}"?`
    : "";

  return (
    <>
      <ConfirmModal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
        loading={isPending}
        title="Eliminar tarea"
        description={deleteDescription}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
      />

      <SidePanel open={panelMode !== null} onClose={closePanel} width="sm">
        <SidePanelHeader>
          <SidePanelTitle>
            {panelMode === "create" ? "Agregar tarea" : "Editar tarea"}
          </SidePanelTitle>
          <SidePanelDescription>
            {activeEtapa
              ? `Etapa: ${activeEtapa.nombre}. Definí el título, la descripción y si es obligatoria.`
              : "Definí el título, la descripción y si es obligatoria."}
          </SidePanelDescription>
        </SidePanelHeader>

        <form onSubmit={handleSubmit(submitTarea)}>
          <SidePanelContent className="space-y-4">
            <FormField>
              <Label htmlFor="tarea-titulo" required>
                Título
              </Label>
              <Input
                id="tarea-titulo"
                disabled={isBusy}
                {...register("titulo")}
              />
              {errors.titulo ? (
                <ErrorMessage>{errors.titulo.message}</ErrorMessage>
              ) : (
                <HelperText>
                  Nombre visible de la tarea sugerida en esta etapa.
                </HelperText>
              )}
            </FormField>

            <FormField>
              <Label htmlFor="tarea-descripcion">Descripción</Label>
              <textarea
                id="tarea-descripcion"
                className={textareaClassName}
                disabled={isBusy}
                {...register("descripcion")}
              />
              {errors.descripcion ? (
                <ErrorMessage>{errors.descripcion.message}</ErrorMessage>
              ) : (
                <HelperText>Opcional.</HelperText>
              )}
            </FormField>

            <FormField>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label htmlFor="tarea-obligatoria">Obligatoria</Label>
                  <HelperText>
                    Las tareas obligatorias se marcan como requeridas al crear
                    un expediente.
                  </HelperText>
                </div>
                <Controller
                  name="obligatoria"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="tarea-obligatoria"
                      size="sm"
                      checked={field.value}
                      disabled={isBusy}
                      onChange={(event) =>
                        field.onChange(event.target.checked)
                      }
                    />
                  )}
                />
              </div>
            </FormField>
          </SidePanelContent>

          <SidePanelFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={closePanel}
              disabled={isBusy}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={isPending}>
              {panelMode === "create" ? "Agregar tarea" : "Guardar cambios"}
            </Button>
          </SidePanelFooter>
        </form>
      </SidePanel>

      <div className="space-y-5">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">
            Tareas sugeridas
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Definí tareas sugeridas para cada etapa del flujo.
          </p>
        </div>

      <div className="space-y-4">
        {etapas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-white px-6 py-12 text-center">
            <p className="text-sm font-medium text-zinc-900">Sin etapas</p>
            <p className="mt-1 text-sm text-zinc-500">
              Definí al menos una etapa en el paso anterior para agregar tareas
              sugeridas.
            </p>
          </div>
        ) : (
          etapas.map((etapa, index) => (
            <EtapaTareasSection
              key={etapa.id}
              workflowId={workflow.id}
              etapa={etapa}
              position={index + 1}
              readonly={readonly}
              isBusy={isBusy}
              reorderingId={reorderingId}
              onWorkflowChange={onWorkflowChange}
              onAddTarea={openCreatePanel}
              onEditTarea={openEditPanel}
              onDeleteTarea={(etapaId, tarea) =>
                setPendingDelete({ etapaId, tarea })
              }
              onReorderStart={setReorderingId}
              onReorderEnd={() => setReorderingId(null)}
            />
          ))
        )}
      </div>
      </div>
    </>
  );
}
