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
import { WorkflowCopyCamposFromParteModal } from "@/components/modules/workflows/workflow-copy-campos-from-parte-modal";
import {
  createWorkflowParteCampoDinamico,
  deleteWorkflowParteCampoDinamico,
  reorderWorkflowParteCamposDinamicos,
  updateWorkflowParteCampoDinamico,
  WorkflowApiError,
} from "@/lib/api/workflows.api";
import type {
  WorkflowCampoTipo,
  WorkflowDetailDto,
  WorkflowParteCampoDinamicoDto,
  WorkflowParteDto,
} from "@/lib/types/workflow";
import type { CreateWorkflowParteCampoDinamicoSchemaInput } from "@/lib/validation/schemas/workflow.schema";

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
  parte: WorkflowParteDto;
  readonly?: boolean;
  disabled?: boolean;
  onWorkflowChange: (workflow: WorkflowDetailDto) => void;
};

function sortCampos(
  campos: WorkflowParteCampoDinamicoDto[],
): WorkflowParteCampoDinamicoDto[] {
  return [...campos].sort((a, b) => a.orden - b.orden);
}

export function WorkflowParteCamposDinamicosSection({
  workflow,
  parte,
  readonly = false,
  disabled = false,
  onWorkflowChange,
}: Props) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [editingCampo, setEditingCampo] =
    useState<WorkflowParteCampoDinamicoDto | null>(null);
  const [pendingDelete, setPendingDelete] =
    useState<WorkflowParteCampoDinamicoDto | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [apiFieldError, setApiFieldError] = useState<{
    field: string;
    message: string;
  } | null>(null);

  const campos = useMemo(
    () => sortCampos(parte.campos_dinamicos ?? []),
    [parte.campos_dinamicos],
  );

  const isBusy = disabled || isPending || reorderingId !== null;
  const canCopyFromParte = workflow.partes.length > 1;

  function openCreatePanel() {
    setApiFieldError(null);
    setEditingCampo(null);
    setPanelMode("create");
    setExpanded(true);
  }

  function openEditPanel(campo: WorkflowParteCampoDinamicoDto) {
    setApiFieldError(null);
    setEditingCampo(campo);
    setPanelMode("edit");
    setExpanded(true);
  }

  function closePanel() {
    setPanelMode(null);
    setEditingCampo(null);
    setApiFieldError(null);
  }

  function submitCampo(values: CreateWorkflowParteCampoDinamicoSchemaInput) {
    startTransition(async () => {
      try {
        if (panelMode === "create") {
          const updated = await createWorkflowParteCampoDinamico(
            workflow.id,
            parte.id,
            values,
          );
          onWorkflowChange(updated);
          toast.success("Campo creado");
        } else if (panelMode === "edit" && editingCampo) {
          const updated = await updateWorkflowParteCampoDinamico(
            workflow.id,
            parte.id,
            editingCampo.id,
            values,
          );
          onWorkflowChange(updated);
          toast.success("Campo actualizado");
        }

        closePanel();
      } catch (error) {
        if (error instanceof WorkflowApiError && error.field) {
          setApiFieldError({ field: error.field, message: error.message });
        }
        toast.error(
          error instanceof Error ? error.message : "Error al guardar el campo",
        );
      }
    });
  }

  function handleConfirmDelete() {
    if (!pendingDelete) return;

    startTransition(async () => {
      try {
        const updated = await deleteWorkflowParteCampoDinamico(
          workflow.id,
          parte.id,
          pendingDelete.id,
        );
        onWorkflowChange(updated);
        toast.success("Campo eliminado");
        setPendingDelete(null);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Error al eliminar el campo",
        );
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
        const updated = await reorderWorkflowParteCamposDinamicos(
          workflow.id,
          parte.id,
          { campo_dinamico_ids: nextOrder.map((campo) => campo.id) },
        );
        onWorkflowChange(updated);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Error al reordenar los campos",
        );
      } finally {
        setReorderingId(null);
      }
    });
  }

  const deleteDescription = pendingDelete
    ? `¿Eliminar el campo "${pendingDelete.etiqueta}" de ${parte.nombre}?`
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

      <WorkflowCopyCamposFromParteModal
        open={copyModalOpen}
        onClose={() => setCopyModalOpen(false)}
        workflow={workflow}
        targetParteId={parte.id}
        disabled={isBusy}
        onSuccess={onWorkflowChange}
      />

      <div className="rounded-lg border border-zinc-200 bg-zinc-50/50">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          <div className="flex items-center gap-2">
            <Icon.ChevronDown
              className={`size-4 text-zinc-500 transition-transform ${expanded ? "rotate-0" : "-rotate-90"}`}
            />
            <span className="text-sm font-medium text-zinc-900">
              Campos dinámicos
            </span>
            <Badge variant="neutral">{campos.length}</Badge>
          </div>
        </button>

        {expanded ? (
          <div className="space-y-3 border-t border-zinc-200 px-3 py-3">
            {!readonly ? (
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setCopyModalOpen(true)}
                  disabled={isBusy || !canCopyFromParte}
                >
                  Copiar desde parte
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={openCreatePanel}
                  disabled={isBusy}
                >
                  Agregar campo
                </Button>
              </div>
            ) : null}

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
                        colSpan={readonly ? 5 : 6}
                        className="py-6 text-center text-sm text-zinc-500"
                      >
                        {readonly
                          ? "Esta parte no tiene campos dinámicos."
                          : "Agregá campos para capturar datos de esta parte en el expediente."}
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
        ) : null}
      </div>
    </>
  );
}
