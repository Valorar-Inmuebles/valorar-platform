"use client";

import { useMemo, useState, useTransition } from "react";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import {
  TableReorderColumnCell,
  TABLE_REORDER_HEADER_CLASS,
} from "@/components/ui/table-order-cell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/modal";
import { Icon } from "@/components/ui/icons";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
  TableSurface,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { WorkflowCampoDinamicoSidePanel } from "@/components/modules/workflows/workflow-campo-dinamico-side-panel";
import { WorkflowCopyCamposFromCatalogModal } from "@/components/modules/workflows/workflow-copy-campos-from-catalog-modal";
import { WorkflowCopyCamposFromWorkflowModal } from "@/components/modules/workflows/workflow-copy-campos-from-workflow-modal";
import {
  createWorkflowCampoDinamico,
  deleteWorkflowCampoDinamico,
  reorderWorkflowCamposDinamicos,
  updateWorkflowCampoDinamico,
  WorkflowApiError,
} from "@/lib/api/workflows.api";
import type {
  WorkflowCampoDinamicoDto,
  WorkflowCampoTipo,
  WorkflowDetailDto,
} from "@/lib/types/workflow";
import type { CreateWorkflowCampoDinamicoSchemaInput } from "@/lib/validation/schemas/workflow.schema";

type PanelMode = "create" | "edit" | null;

const TIPO_LABELS: Record<WorkflowCampoTipo, string> = {
  text: "Texto",
  date: "Fecha",
  boolean: "Sí/No",
  select: "Lista desplegable",
  multiselect: "Selección múltiple",
};

type Props = {
  workflow: WorkflowDetailDto;
  readonly?: boolean;
  disabled?: boolean;
  onWorkflowChange: (workflow: WorkflowDetailDto) => void;
};

function sortCampos(
  campos: WorkflowCampoDinamicoDto[],
): WorkflowCampoDinamicoDto[] {
  return [...campos].sort((a, b) => a.orden - b.orden);
}

export function WorkflowStepCamposDinamicos({
  workflow,
  readonly = false,
  disabled = false,
  onWorkflowChange,
}: Props) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [editingCampo, setEditingCampo] =
    useState<WorkflowCampoDinamicoDto | null>(null);
  const [pendingDelete, setPendingDelete] =
    useState<WorkflowCampoDinamicoDto | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [apiFieldError, setApiFieldError] = useState<{
    field: string;
    message: string;
  } | null>(null);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copyCatalogModalOpen, setCopyCatalogModalOpen] = useState(false);

  const campos = useMemo(
    () => sortCampos(workflow.campos_dinamicos),
    [workflow.campos_dinamicos],
  );

  const isBusy = disabled || isPending || reorderingId !== null;

  function openCreatePanel() {
    setApiFieldError(null);
    setEditingCampo(null);
    setPanelMode("create");
  }

  function openEditPanel(campo: WorkflowCampoDinamicoDto) {
    setApiFieldError(null);
    setEditingCampo(campo);
    setPanelMode("edit");
  }

  function closePanel() {
    setPanelMode(null);
    setEditingCampo(null);
    setApiFieldError(null);
  }

  function submitCampo(values: CreateWorkflowCampoDinamicoSchemaInput) {
    startTransition(async () => {
      try {
        if (panelMode === "create") {
          const updated = await createWorkflowCampoDinamico(workflow.id, values);
          onWorkflowChange(updated);
          toast.success("Campo creado");
        } else if (panelMode === "edit" && editingCampo) {
          const updated = await updateWorkflowCampoDinamico(
            workflow.id,
            editingCampo.id,
            values,
          );
          onWorkflowChange(updated);
          toast.success("Campo actualizado");
        }

        closePanel();
      } catch (error) {
        if (error instanceof WorkflowApiError) {
          setApiFieldError({
            field: error.field,
            message: error.message,
          });
          toast.error(error.message);
          return;
        }

        const message =
          error instanceof Error ? error.message : "Error al guardar el campo";
        toast.error(message);
      }
    });
  }

  function handleConfirmDelete() {
    if (!pendingDelete) return;

    startTransition(async () => {
      try {
        const updated = await deleteWorkflowCampoDinamico(
          workflow.id,
          pendingDelete.id,
        );
        onWorkflowChange(updated);
        toast.success("Campo eliminado");
        setPendingDelete(null);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Error al eliminar el campo";
        toast.error(message);
      }
    });
  }

  function handleMove(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= campos.length) return;

    const nextOrder = [...campos];
    [nextOrder[index], nextOrder[targetIndex]] = [
      nextOrder[targetIndex],
      nextOrder[index],
    ];

    const movingId = campos[index].id;
    setReorderingId(movingId);

    startTransition(async () => {
      try {
        const updated = await reorderWorkflowCamposDinamicos(workflow.id, {
          campo_dinamico_ids: nextOrder.map((campo) => campo.id),
        });
        onWorkflowChange(updated);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Error al reordenar los campos";
        toast.error(message);
      } finally {
        setReorderingId(null);
      }
    });
  }

  const deleteDescription = pendingDelete
    ? `¿Eliminar el campo "${pendingDelete.etiqueta}"?`
    : "";

  return (
    <>
      <ConfirmModal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
        loading={isPending}
        title="Eliminar campo"
        description={deleteDescription}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
      />

      <WorkflowCampoDinamicoSidePanel
        open={panelMode !== null}
        mode={panelMode}
        campo={editingCampo}
        disabled={isBusy}
        loading={isPending}
        apiFieldError={apiFieldError}
        onClose={closePanel}
        onSubmit={submitCampo}
      />

      <WorkflowCopyCamposFromCatalogModal
        open={copyCatalogModalOpen}
        onClose={() => setCopyCatalogModalOpen(false)}
        targetWorkflowId={workflow.id}
        disabled={isBusy}
        onSuccess={onWorkflowChange}
      />

      <WorkflowCopyCamposFromWorkflowModal
        open={copyModalOpen}
        onClose={() => setCopyModalOpen(false)}
        targetWorkflowId={workflow.id}
        disabled={isBusy}
        onSuccess={onWorkflowChange}
      />

      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-zinc-900">
              Campos dinámicos
            </h2>
            {!readonly ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCopyCatalogModalOpen(true)}
                  disabled={isBusy}
                >
                  Copiar desde catálogo
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCopyModalOpen(true)}
                  disabled={isBusy}
                >
                  Copiar desde workflow
                </Button>
                <Button type="button" onClick={openCreatePanel} disabled={isBusy}>
                  Agregar campo
                </Button>
              </div>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Configurá los campos adicionales del workflow.
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
                <TableCell isHeader>Etiqueta</TableCell>
                <TableCell isHeader>Clave</TableCell>
                <TableCell isHeader>Tipo</TableCell>
                <TableCell isHeader>Requerido</TableCell>
                <TableCell isHeader>Tabla</TableCell>
                {!readonly ? (
                  <TableCell isHeader align="right" className="pr-3">
                    Acciones
                  </TableCell>
                ) : null}
              </TableRow>
            </TableHeader>
            <tbody>
              {campos.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={readonly ? 6 : 7}
                    className="py-8 text-center text-sm text-zinc-500"
                  >
                    {readonly
                      ? "Este workflow no tiene campos dinámicos."
                      : "Agregá campos para solicitar datos adicionales en el expediente."}
                  </TableCell>
                </TableRow>
              ) : (
                campos.map((campo, index) => {
                  const isReordering = reorderingId === campo.id;

                  return (
                    <TableRow
                      key={campo.id}
                      className={isReordering ? "opacity-60" : undefined}
                    >
                      <TableReorderColumnCell
                        readonly={readonly}
                        controls={{
                          canMoveUp: index > 0,
                          canMoveDown: index < campos.length - 1,
                          disabled: isBusy,
                          reordering: isReordering,
                          onMoveUp: () => handleMove(index, "up"),
                          onMoveDown: () => handleMove(index, "down"),
                          upLabel: "Subir campo",
                          downLabel: "Bajar campo",
                        }}
                      />
                      <TableCell className="font-medium text-zinc-900">
                        {campo.etiqueta}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-zinc-600">
                        {campo.clave}
                      </TableCell>
                      <TableCell>{TIPO_LABELS[campo.tipo]}</TableCell>
                      <TableCell>
                        {campo.requerido ? (
                          <Badge variant="warning">Sí</Badge>
                        ) : (
                          <Badge variant="neutral">No</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {campo.visible_tabla ? (
                          <Badge variant="success">Sí</Badge>
                        ) : (
                          <Badge variant="neutral">No</Badge>
                        )}
                      </TableCell>
                      {!readonly ? (
                        <TableCell align="right" className="pr-3">
                          <div className="flex items-center justify-end gap-1">
                            <ActionIconButton
                              type="button"
                              size="sm"
                              disabled={isBusy}
                              onClick={() => openEditPanel(campo)}
                              aria-label="Editar campo"
                            >
                              <Icon.Edit className="size-3.5" />
                            </ActionIconButton>
                            <ActionIconButton
                              type="button"
                              size="sm"
                              variant="destructive"
                              disabled={isBusy}
                              onClick={() => setPendingDelete(campo)}
                              aria-label="Eliminar campo"
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
