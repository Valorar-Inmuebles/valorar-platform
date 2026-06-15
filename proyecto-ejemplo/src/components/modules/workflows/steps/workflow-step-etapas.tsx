"use client";

import { useMemo, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FormField,
  Label,
  HelperText,
  ErrorMessage,
} from "@/components/ui/form-field";
import { Icon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { ConfirmModal } from "@/components/ui/modal";
import { Select, type SelectOption } from "@/components/ui/select";
import {
  SidePanel,
  SidePanelContent,
  SidePanelDescription,
  SidePanelFooter,
  SidePanelHeader,
  SidePanelTitle,
} from "@/components/ui/side-panel";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
  TableSurface,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import {
  createWorkflowEtapa,
  deleteWorkflowEtapa,
  reorderWorkflowEtapas,
  updateWorkflowEtapa,
  WorkflowApiError,
} from "@/lib/api/workflows.api";
import {
  WORKFLOW_ETAPA_COLORES,
  type WorkflowDetailDto,
  type WorkflowEtapaDto,
} from "@/lib/types/workflow";
import {
  WORKFLOW_ETAPA_BADGE_VARIANT,
  WORKFLOW_ETAPA_COLOR_LABELS,
} from "@/components/modules/workflows/workflow-etapa-colors";
import { WorkflowEtapaOrderBadge } from "@/components/modules/workflows/workflow-etapa-order-badge";
import { WorkflowEtapaTypeBadges } from "@/components/modules/workflows/workflow-etapa-type-badges";
import {
  TableEtapaColumnCell,
  TableReorderColumnCell,
  TABLE_ETAPA_HEADER_CLASS,
  TABLE_REORDER_HEADER_CLASS,
} from "@/components/ui/table-order-cell";
import {
  createWorkflowEtapaSchema,
  type CreateWorkflowEtapaSchemaInput,
} from "@/lib/validation/schemas/workflow.schema";

const textareaClassName =
  "flex min-h-[4.5rem] w-full resize-y rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500";

const COLOR_OPTIONS: SelectOption[] = WORKFLOW_ETAPA_COLORES.map((color) => ({
  value: color,
  label: WORKFLOW_ETAPA_COLOR_LABELS[color],
}));

type PanelMode = "create" | "edit" | null;

type Props = {
  workflow: WorkflowDetailDto;
  readonly?: boolean;
  disabled?: boolean;
  onWorkflowChange: (workflow: WorkflowDetailDto) => void;
};

function etapaToFormValues(etapa?: WorkflowEtapaDto): CreateWorkflowEtapaSchemaInput {
  return {
    nombre: etapa?.nombre ?? "",
    descripcion: etapa?.descripcion ?? "",
    color: etapa?.color ?? "primary",
  };
}

function sortEtapas(etapas: WorkflowEtapaDto[]): WorkflowEtapaDto[] {
  return [...etapas].sort((a, b) => a.orden - b.orden);
}

function EtapaTipoCell({ etapa }: { etapa: WorkflowEtapaDto }) {
  return <WorkflowEtapaTypeBadges etapa={etapa} />;
}

export function WorkflowStepEtapas({
  workflow,
  readonly = false,
  disabled = false,
  onWorkflowChange,
}: Props) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [editingEtapa, setEditingEtapa] = useState<WorkflowEtapaDto | null>(
    null,
  );
  const [pendingDelete, setPendingDelete] = useState<WorkflowEtapaDto | null>(
    null,
  );
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const etapas = useMemo(
    () => sortEtapas(workflow.etapas),
    [workflow.etapas],
  );

  const isBusy = disabled || isPending || reorderingId !== null;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors },
  } = useForm<CreateWorkflowEtapaSchemaInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createWorkflowEtapaSchema) as any,
    mode: "onBlur",
    defaultValues: etapaToFormValues(),
  });

  function openCreatePanel() {
    setEditingEtapa(null);
    reset(etapaToFormValues());
    setPanelMode("create");
  }

  function openEditPanel(etapa: WorkflowEtapaDto) {
    setEditingEtapa(etapa);
    reset(etapaToFormValues(etapa));
    setPanelMode("edit");
  }

  function closePanel() {
    setPanelMode(null);
    setEditingEtapa(null);
  }

  function handleApiFieldError(error: unknown) {
    if (error instanceof WorkflowApiError) {
      if (error.field === "nombre") {
        setError("nombre", { message: error.message });
      }
      toast.error(error.message);
      return;
    }

    const message =
      error instanceof Error ? error.message : "Error al guardar la etapa";
    toast.error(message);
  }

  function submitEtapa(values: CreateWorkflowEtapaSchemaInput) {
    startTransition(async () => {
      try {
        if (panelMode === "create") {
          const updated = await createWorkflowEtapa(workflow.id, values);
          onWorkflowChange(updated);
          toast.success("Etapa creada");
        } else if (panelMode === "edit" && editingEtapa) {
          const updated = await updateWorkflowEtapa(
            workflow.id,
            editingEtapa.id,
            values,
          );
          onWorkflowChange(updated);
          toast.success("Etapa actualizada");
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
        const updated = await deleteWorkflowEtapa(
          workflow.id,
          pendingDelete.id,
        );
        onWorkflowChange(updated);
        toast.success("Etapa eliminada");
        setPendingDelete(null);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Error al eliminar la etapa";
        toast.error(message);
      }
    });
  }

  function handleMove(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= etapas.length) return;

    const nextOrder = [...etapas];
    [nextOrder[index], nextOrder[targetIndex]] = [
      nextOrder[targetIndex],
      nextOrder[index],
    ];

    const movingId = etapas[index].id;
    setReorderingId(movingId);

    startTransition(async () => {
      try {
        const updated = await reorderWorkflowEtapas(workflow.id, {
          etapa_ids: nextOrder.map((etapa) => etapa.id),
        });
        onWorkflowChange(updated);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Error al reordenar las etapas";
        toast.error(message);
      } finally {
        setReorderingId(null);
      }
    });
  }

  const deleteDescription = pendingDelete
    ? pendingDelete.tareas.length > 0
      ? `¿Eliminar la etapa "${pendingDelete.nombre}"? Las ${pendingDelete.tareas.length} tarea(s) asociada(s) también se eliminarán.`
      : `¿Eliminar la etapa "${pendingDelete.nombre}"?`
    : "";

  return (
    <>
      <ConfirmModal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
        loading={isPending}
        title="Eliminar etapa"
        description={deleteDescription}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
      />

      <SidePanel
        open={panelMode !== null}
        onClose={closePanel}
        width="sm"
      >
        <SidePanelHeader>
          <SidePanelTitle>
            {panelMode === "create" ? "Agregar etapa" : "Editar etapa"}
          </SidePanelTitle>
          <SidePanelDescription>
            Definí el nombre, la descripción y el color de la etapa.
          </SidePanelDescription>
        </SidePanelHeader>

        <form onSubmit={handleSubmit(submitEtapa)}>
          <SidePanelContent className="space-y-4">
            <FormField>
              <Label htmlFor="etapa-nombre" required>
                Nombre
              </Label>
              <Input
                id="etapa-nombre"
                disabled={isBusy}
                {...register("nombre")}
              />
              {errors.nombre ? (
                <ErrorMessage>{errors.nombre.message}</ErrorMessage>
              ) : (
                <HelperText>Nombre visible en el flujo del workflow.</HelperText>
              )}
            </FormField>

            <FormField>
              <Label htmlFor="etapa-descripcion">Descripción</Label>
              <textarea
                id="etapa-descripcion"
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
              <Label htmlFor="etapa-color" required>
                Color
              </Label>
              <Controller
                name="color"
                control={control}
                render={({ field }) => (
                  <Select
                    id="etapa-color"
                    options={COLOR_OPTIONS}
                    disabled={isBusy}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.color ? (
                <ErrorMessage>{errors.color.message}</ErrorMessage>
              ) : null}
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
              {panelMode === "create" ? "Agregar etapa" : "Guardar cambios"}
            </Button>
          </SidePanelFooter>
        </form>
      </SidePanel>

      <div className="space-y-5">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-zinc-900">Etapas</h2>
            {!readonly ? (
              <Button
                type="button"
                onClick={openCreatePanel}
                disabled={isBusy}
              >
                Agregar etapa
              </Button>
            ) : null}
          </div>
          <p className="text-sm text-zinc-500">
            Definí las etapas que componen el flujo del proceso.
          </p>
        </div>

      <div>
        <TableSurface>
          <Table noBorder>
            <TableHeader>
              <TableRow>
                <TableCell
                  isHeader
                  className={TABLE_REORDER_HEADER_CLASS}
                  aria-label="Reordenar"
                />
                <TableCell isHeader align="center" className={TABLE_ETAPA_HEADER_CLASS}>
                  Etapas
                </TableCell>
                <TableCell isHeader>Nombre</TableCell>
                <TableCell isHeader>Tipo</TableCell>
                <TableCell isHeader>Descripción</TableCell>
                <TableCell isHeader>Color</TableCell>
                {!readonly ? (
                  <TableCell isHeader align="right" className="pr-3">
                    Acciones
                  </TableCell>
                ) : null}
              </TableRow>
            </TableHeader>
            <tbody>
              {etapas.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={readonly ? 6 : 7}
                    className="py-8 text-center text-sm text-zinc-500"
                  >
                    {readonly
                      ? "Este workflow no tiene etapas definidas."
                      : "Agregá al menos una etapa para continuar."}
                  </TableCell>
                </TableRow>
              ) : (
                etapas.map((etapa, index) => {
                  const isRowReordering = reorderingId === etapa.id;

                  return (
                    <TableRow
                      key={etapa.id}
                      className={isRowReordering ? "opacity-60" : undefined}
                    >
                      <TableReorderColumnCell
                        readonly={readonly}
                        controls={{
                          canMoveUp: index > 0,
                          canMoveDown: index < etapas.length - 1,
                          disabled: isBusy,
                          reordering: isRowReordering,
                          onMoveUp: () => handleMove(index, "up"),
                          onMoveDown: () => handleMove(index, "down"),
                          upLabel: "Subir etapa",
                          downLabel: "Bajar etapa",
                        }}
                      />
                      <TableEtapaColumnCell
                        badge={
                          <WorkflowEtapaOrderBadge
                            position={index + 1}
                            color={etapa.color}
                          />
                        }
                      />
                      <TableCell>
                        <span className="font-medium text-zinc-900">
                          {etapa.nombre}
                        </span>
                      </TableCell>
                      <TableCell>
                        <EtapaTipoCell etapa={etapa} />
                      </TableCell>
                      <TableCell className="max-w-xs text-zinc-600">
                        {etapa.descripcion?.trim() || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={WORKFLOW_ETAPA_BADGE_VARIANT[etapa.color]}>
                          {WORKFLOW_ETAPA_COLOR_LABELS[etapa.color]}
                        </Badge>
                      </TableCell>
                      {!readonly ? (
                        <TableCell align="right" className="pr-3">
                          <div className="flex items-center justify-end gap-0.5">
                            <ActionIconButton
                              type="button"
                              disabled={isBusy}
                              onClick={() => openEditPanel(etapa)}
                              aria-label={`Editar ${etapa.nombre}`}
                            >
                              <Icon.Edit className="size-3.5" />
                            </ActionIconButton>
                            <ActionIconButton
                              type="button"
                              variant="destructive"
                              disabled={isBusy || etapas.length <= 1}
                              onClick={() => setPendingDelete(etapa)}
                              aria-label={`Eliminar ${etapa.nombre}`}
                            >
                              <Icon.Trash className="size-3.5" />
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
      </div>
      </div>
    </>
  );
}
