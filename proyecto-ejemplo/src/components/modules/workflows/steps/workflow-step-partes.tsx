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
  createWorkflowParte,
  deleteWorkflowParte,
  reorderWorkflowPartes,
  updateWorkflowParte,
  WorkflowApiError,
} from "@/lib/api/workflows.api";
import { WorkflowParteCamposDinamicosSection } from "@/components/modules/workflows/workflow-parte-campos-dinamicos-section";
import type {
  WorkflowDetailDto,
  WorkflowParteDto,
} from "@/lib/types/workflow";
import {
  createWorkflowParteSchema,
  type CreateWorkflowParteSchemaInput,
} from "@/lib/validation/schemas/workflow.schema";

type PanelMode = "create" | "edit" | null;

type Props = {
  workflow: WorkflowDetailDto;
  readonly?: boolean;
  disabled?: boolean;
  onWorkflowChange: (workflow: WorkflowDetailDto) => void;
};

function parteToFormValues(
  parte?: WorkflowParteDto,
  isFirstParte = false,
): CreateWorkflowParteSchemaInput {
  return {
    nombre: parte?.nombre ?? "",
    es_principal: isFirstParte ? true : (parte?.es_principal ?? false),
    obligatoria: isFirstParte ? true : (parte?.obligatoria ?? false),
  };
}

function sortPartes(partes: WorkflowParteDto[]): WorkflowParteDto[] {
  return [...partes].sort((a, b) => a.orden - b.orden);
}

export function WorkflowStepPartes({
  workflow,
  readonly = false,
  disabled = false,
  onWorkflowChange,
}: Props) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [editingParte, setEditingParte] = useState<WorkflowParteDto | null>(
    null,
  );
  const [pendingDelete, setPendingDelete] = useState<WorkflowParteDto | null>(
    null,
  );
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const partes = useMemo(
    () => sortPartes(workflow.partes),
    [workflow.partes],
  );

  const isFirstParteCreate = partes.length === 0;
  const isBusy = disabled || isPending || reorderingId !== null;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    control,
    watch,
    formState: { errors },
  } = useForm<CreateWorkflowParteSchemaInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createWorkflowParteSchema) as any,
    mode: "onBlur",
    defaultValues: parteToFormValues(undefined, isFirstParteCreate),
  });

  const esPrincipalValue = watch("es_principal");

  function openCreatePanel() {
    setEditingParte(null);
    reset(parteToFormValues(undefined, isFirstParteCreate));
    setPanelMode("create");
  }

  function openEditPanel(parte: WorkflowParteDto) {
    setEditingParte(parte);
    reset(parteToFormValues(parte, false));
    setPanelMode("edit");
  }

  function closePanel() {
    setPanelMode(null);
    setEditingParte(null);
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
      error instanceof Error ? error.message : "Error al guardar la parte";
    toast.error(message);
  }

  function submitParte(values: CreateWorkflowParteSchemaInput) {
    startTransition(async () => {
      try {
        if (panelMode === "create") {
          const payload = isFirstParteCreate
            ? { nombre: values.nombre }
            : values;

          const updated = await createWorkflowParte(workflow.id, payload);
          onWorkflowChange(updated);
          toast.success("Parte creada");
        } else if (panelMode === "edit" && editingParte) {
          const payload = {
            ...values,
            obligatoria: values.es_principal ? true : values.obligatoria,
          };
          const updated = await updateWorkflowParte(
            workflow.id,
            editingParte.id,
            payload,
          );
          onWorkflowChange(updated);
          toast.success("Parte actualizada");
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
        const updated = await deleteWorkflowParte(
          workflow.id,
          pendingDelete.id,
        );
        onWorkflowChange(updated);
        toast.success("Parte eliminada");
        setPendingDelete(null);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Error al eliminar la parte";
        toast.error(message);
      }
    });
  }

  function handleMove(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= partes.length) return;

    const nextOrder = [...partes];
    [nextOrder[index], nextOrder[targetIndex]] = [
      nextOrder[targetIndex],
      nextOrder[index],
    ];

    const movingId = partes[index].id;
    setReorderingId(movingId);

    startTransition(async () => {
      try {
        const updated = await reorderWorkflowPartes(workflow.id, {
          parte_ids: nextOrder.map((parte) => parte.id),
        });
        onWorkflowChange(updated);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Error al reordenar las partes";
        toast.error(message);
      } finally {
        setReorderingId(null);
      }
    });
  }

  const deleteDescription = pendingDelete
    ? `¿Eliminar la parte "${pendingDelete.nombre}"?`
    : "";

  const editingIsPrincipal =
    panelMode === "edit" && Boolean(editingParte?.es_principal);
  const showPrincipalToggle =
    panelMode === "create" ? !isFirstParteCreate : !editingIsPrincipal;
  const obligatoriaDisabled =
    isBusy ||
    isFirstParteCreate ||
    editingIsPrincipal ||
    esPrincipalValue === true;

  return (
    <>
      <ConfirmModal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
        loading={isPending}
        title="Eliminar parte"
        description={deleteDescription}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
      />

      <SidePanel open={panelMode !== null} onClose={closePanel} width="sm">
        <SidePanelHeader>
          <SidePanelTitle>
            {panelMode === "create" ? "Agregar parte" : "Editar parte"}
          </SidePanelTitle>
          <SidePanelDescription>
            Definí los actores que participarán en el expediente.
          </SidePanelDescription>
        </SidePanelHeader>

        <form onSubmit={handleSubmit(submitParte)}>
          <SidePanelContent className="space-y-4">
            <FormField>
              <Label htmlFor="parte-nombre" required>
                Nombre
              </Label>
              <Input
                id="parte-nombre"
                disabled={isBusy}
                {...register("nombre")}
              />
              {errors.nombre ? (
                <ErrorMessage>{errors.nombre.message}</ErrorMessage>
              ) : (
                <HelperText>
                  {isFirstParteCreate
                    ? "La primera parte será principal y obligatoria."
                    : "Nombre visible en el workflow."}
                </HelperText>
              )}
            </FormField>

            {showPrincipalToggle ? (
              <FormField>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label htmlFor="parte-principal">Parte principal</Label>
                    <HelperText>
                      Solo puede existir una parte principal por workflow.
                    </HelperText>
                  </div>
                  <Controller
                    name="es_principal"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        id="parte-principal"
                        size="sm"
                        checked={field.value}
                        disabled={isBusy}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          field.onChange(checked);
                          if (checked) {
                            setValue("obligatoria", true, {
                              shouldDirty: true,
                            });
                          }
                        }}
                      />
                    )}
                  />
                </div>
              </FormField>
            ) : null}

            {panelMode === "create" && isFirstParteCreate ? null : (
              <FormField>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label htmlFor="parte-obligatoria">Obligatoria</Label>
                    <HelperText>
                      {editingIsPrincipal || esPrincipalValue
                        ? "La parte principal siempre es obligatoria."
                        : "Indica si la parte es requerida en el expediente."}
                    </HelperText>
                  </div>
                  <Controller
                    name="obligatoria"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        id="parte-obligatoria"
                        size="sm"
                        checked={field.value}
                        disabled={obligatoriaDisabled}
                        onChange={(event) =>
                          field.onChange(event.target.checked)
                        }
                      />
                    )}
                  />
                </div>
              </FormField>
            )}
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
              {panelMode === "create" ? "Agregar parte" : "Guardar cambios"}
            </Button>
          </SidePanelFooter>
        </form>
      </SidePanel>

      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-zinc-900">Partes</h2>
            {!readonly ? (
              <Button type="button" onClick={openCreatePanel} disabled={isBusy}>
                Agregar parte
              </Button>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Definí los actores que participan en el expediente.
          </p>
        </div>

      <div className="space-y-4">
        <TableSurface>
          <Table noBorder>
            <TableHeader>
              <TableRow>
                <TableCell
                  isHeader
                  className={TABLE_REORDER_HEADER_CLASS}
                  aria-label="Reordenar"
                />
                <TableCell isHeader>Nombre</TableCell>
                <TableCell isHeader>Tipo</TableCell>
                <TableCell isHeader>Obligatoria</TableCell>
                {!readonly ? (
                  <TableCell isHeader align="right" className="pr-3">
                    Acciones
                  </TableCell>
                ) : null}
              </TableRow>
            </TableHeader>
            <tbody>
              {partes.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={readonly ? 4 : 5}
                    className="py-8 text-center text-sm text-zinc-500"
                  >
                    {readonly
                      ? "Este workflow no tiene partes definidas."
                      : "Agregá al menos una parte principal para continuar."}
                  </TableCell>
                </TableRow>
              ) : (
                partes.map((parte, index) => {
                  const isRowReordering = reorderingId === parte.id;
                  const canDelete = partes.length > 1 && !parte.es_principal;

                  return (
                    <TableRow
                      key={parte.id}
                      className={isRowReordering ? "opacity-60" : undefined}
                    >
                      <TableReorderColumnCell
                        readonly={readonly}
                        controls={{
                          canMoveUp: index > 0,
                          canMoveDown: index < partes.length - 1,
                          disabled: isBusy,
                          reordering: isRowReordering,
                          onMoveUp: () => handleMove(index, "up"),
                          onMoveDown: () => handleMove(index, "down"),
                          upLabel: "Subir parte",
                          downLabel: "Bajar parte",
                        }}
                      />
                      <TableCell>
                        <span className="font-medium text-zinc-900">
                          {parte.nombre}
                        </span>
                      </TableCell>
                      <TableCell>
                        {parte.es_principal ? (
                          <Badge variant="info">Principal</Badge>
                        ) : (
                          <Badge variant="neutral">Adicional</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {parte.obligatoria ? (
                          <Badge variant="success">Sí</Badge>
                        ) : (
                          <Badge variant="neutral">No</Badge>
                        )}
                      </TableCell>
                      {!readonly ? (
                        <TableCell align="right" className="pr-3">
                          <div className="flex items-center justify-end gap-0.5">
                            <ActionIconButton
                              type="button"
                              disabled={isBusy}
                              onClick={() => openEditPanel(parte)}
                              aria-label={`Editar ${parte.nombre}`}
                            >
                              <Icon.Edit className="size-3.5" />
                            </ActionIconButton>
                            <ActionIconButton
                              type="button"
                              variant="destructive"
                              disabled={isBusy || !canDelete}
                              onClick={() => setPendingDelete(parte)}
                              aria-label={`Eliminar ${parte.nombre}`}
                              className={!canDelete ? "opacity-40" : ""}
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

        {partes.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-zinc-900">
              Campos dinámicos por parte
            </p>
            {partes.map((parte) => (
              <div key={parte.id} className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {parte.nombre}
                </p>
                <WorkflowParteCamposDinamicosSection
                  workflow={workflow}
                  parte={parte}
                  readonly={readonly}
                  disabled={isBusy}
                  onWorkflowChange={onWorkflowChange}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
      </div>
    </>
  );
}
