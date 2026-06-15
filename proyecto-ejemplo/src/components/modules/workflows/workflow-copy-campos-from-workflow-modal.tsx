"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { HelperText, Label } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { Select, type SelectOption } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  copyWorkflowCamposFromWorkflow,
  getWorkflow,
  getWorkflows,
  WorkflowApiError,
} from "@/lib/api/workflows.api";
import type {
  WorkflowCampoDinamicoDto,
  WorkflowCampoTipo,
  WorkflowDetailDto,
  WorkflowListItemDto,
} from "@/lib/types/workflow";

const TIPO_LABELS: Record<WorkflowCampoTipo, string> = {
  text: "Texto",
  date: "Fecha",
  boolean: "Sí/No",
  select: "Lista desplegable",
  multiselect: "Selección múltiple",
};

type Props = {
  open: boolean;
  onClose: () => void;
  targetWorkflowId: string;
  disabled?: boolean;
  onSuccess: (workflow: WorkflowDetailDto) => void;
};

function sortCampos(
  campos: WorkflowCampoDinamicoDto[],
): WorkflowCampoDinamicoDto[] {
  return [...campos].sort((a, b) => a.orden - b.orden);
}

export function WorkflowCopyCamposFromWorkflowModal({
  open,
  onClose,
  targetWorkflowId,
  disabled = false,
  onSuccess,
}: Props) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [workflowsLoading, setWorkflowsLoading] = useState(false);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [workflows, setWorkflows] = useState<WorkflowListItemDto[]>([]);
  const [search, setSearch] = useState("");
  const [sourceWorkflowId, setSourceWorkflowId] = useState("");
  const [sourceCampos, setSourceCampos] = useState<WorkflowCampoDinamicoDto[]>(
    [],
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setSearch("");
    setSourceWorkflowId("");
    setSourceCampos([]);
    setSelectedIds(new Set());
    setLoadError(null);
  }, []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setWorkflowsLoading(true);
    setLoadError(null);

    getWorkflows()
      .then((rows) => {
        if (cancelled) return;
        setWorkflows(rows);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "Error al cargar workflows",
        );
        setWorkflows([]);
      })
      .finally(() => {
        if (!cancelled) setWorkflowsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open, resetState]);

  useEffect(() => {
    if (!open || !sourceWorkflowId) {
      setSourceCampos([]);
      setSelectedIds(new Set());
      return;
    }

    let cancelled = false;
    setSourceLoading(true);
    setLoadError(null);

    getWorkflow(sourceWorkflowId)
      .then((detail) => {
        if (cancelled) return;
        const campos = sortCampos(detail.campos_dinamicos);
        setSourceCampos(campos);
        setSelectedIds(new Set(campos.map((campo) => campo.id)));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSourceCampos([]);
        setSelectedIds(new Set());
        setLoadError(
          error instanceof Error
            ? error.message
            : "Error al cargar campos del workflow",
        );
      })
      .finally(() => {
        if (!cancelled) setSourceLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, sourceWorkflowId]);

  const filteredWorkflows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workflows.filter((workflow) => {
      if (!q) return true;
      return workflow.nombre.toLowerCase().includes(q);
    });
  }, [search, workflows]);

  const workflowOptions: SelectOption[] = useMemo(
    () =>
      filteredWorkflows.map((workflow) => ({
        value: workflow.id,
        label: workflow.nombre,
      })),
    [filteredWorkflows],
  );

  const allSelected =
    sourceCampos.length > 0 && selectedIds.size === sourceCampos.length;
  const someSelected =
    selectedIds.size > 0 && selectedIds.size < sourceCampos.length;

  function toggleCampo(campoId: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(campoId);
      } else {
        next.delete(campoId);
      }
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(sourceCampos.map((campo) => campo.id)));
      return;
    }
    setSelectedIds(new Set());
  }

  function handleCopy() {
    if (!sourceWorkflowId || selectedIds.size === 0) return;

    const selectedArray = [...selectedIds];
    const copyAll =
      sourceCampos.length > 0 && selectedArray.length === sourceCampos.length;

    startTransition(async () => {
      try {
        const updated = await copyWorkflowCamposFromWorkflow(targetWorkflowId, {
          source_workflow_id: sourceWorkflowId,
          campo_dinamico_ids: copyAll ? undefined : selectedArray,
        });
        onSuccess(updated);
        toast.success(
          selectedArray.length === 1
            ? "1 campo copiado"
            : `${selectedArray.length} campos copiados`,
        );
        onClose();
      } catch (error) {
        if (error instanceof WorkflowApiError) {
          toast.error(error.message);
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : "Error al copiar campos del workflow";
        toast.error(message);
      }
    });
  }

  const isBusy = disabled || isPending || workflowsLoading || sourceLoading;
  const canCopy =
    !!sourceWorkflowId && selectedIds.size > 0 && !isBusy && !loadError;

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader>
        <ModalTitle>Copiar desde workflow</ModalTitle>
        <p className="mt-1 text-sm text-zinc-500">
          Se creará una copia independiente de los campos seleccionados en este
          workflow.
        </p>
      </ModalHeader>

      <ModalContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="workflow-copy-search">Buscar workflow origen</Label>
          <Input
            id="workflow-copy-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre…"
            disabled={isBusy}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="workflow-copy-source">Workflow origen</Label>
          <Select
            id="workflow-copy-source"
            value={sourceWorkflowId}
            onChange={(value) => setSourceWorkflowId(value)}
            options={workflowOptions}
            placeholder={
              workflowsLoading ? "Cargando workflows…" : "Seleccionar workflow"
            }
            disabled={isBusy || workflowOptions.length === 0}
          />
          <HelperText>
            Podés copiar desde plantillas JurilexIA, workflows de tu organización
            o el workflow actual.
          </HelperText>
        </div>

        {loadError ? (
          <p className="text-sm text-red-600">{loadError}</p>
        ) : null}

        {sourceWorkflowId ? (
          <div className="space-y-3 rounded-lg border border-zinc-200 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-zinc-900">
                Campos disponibles
              </span>
              {sourceCampos.length > 0 ? (
                <Checkbox
                  size="sm"
                  label="Seleccionar todos"
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={(event) => toggleAll(event.target.checked)}
                  disabled={isBusy}
                />
              ) : null}
            </div>

            {sourceLoading ? (
              <p className="text-sm text-zinc-500">Cargando campos…</p>
            ) : sourceCampos.length === 0 ? (
              <p className="text-sm text-zinc-500">
                El workflow seleccionado no tiene campos dinámicos.
              </p>
            ) : (
              <ul className="max-h-56 space-y-2 overflow-y-auto">
                {sourceCampos.map((campo) => (
                  <li
                    key={campo.id}
                    className="flex items-start gap-3 rounded-md border border-zinc-100 px-3 py-2"
                  >
                    <Checkbox
                      size="sm"
                      checked={selectedIds.has(campo.id)}
                      onChange={(event) =>
                        toggleCampo(campo.id, event.target.checked)
                      }
                      disabled={isBusy}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-zinc-900">
                          {campo.etiqueta}
                        </span>
                        <Badge variant="neutral">
                          {TIPO_LABELS[campo.tipo]}
                        </Badge>
                      </div>
                      <p className="mt-0.5 font-mono text-xs text-zinc-500">
                        {campo.clave}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </ModalContent>

      <ModalFooter>
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={handleCopy}
          loading={isPending}
          disabled={!canCopy}
        >
          Copiar
          {selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
