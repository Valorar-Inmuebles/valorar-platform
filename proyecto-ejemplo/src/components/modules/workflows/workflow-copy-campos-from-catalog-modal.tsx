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
import { useToast } from "@/components/ui/toast";
import { searchCamposDinamicos } from "@/lib/api/campos-dinamicos";
import {
  copyWorkflowCamposFromCatalog,
  WorkflowApiError,
} from "@/lib/api/workflows.api";
import type { CampoDinamicoListItem } from "@/lib/server/services/campos-dinamicos.service";
import type { WorkflowDetailDto } from "@/lib/types/workflow";
import {
  CAMPO_DINAMICO_TIPO_LABELS,
  type CampoDinamicoTipo,
} from "@/lib/validation/schemas/campo-dinamico.schema";

const DEFAULT_CONTEXTO = "caso" as const;

type Props = {
  open: boolean;
  onClose: () => void;
  targetWorkflowId: string;
  disabled?: boolean;
  onSuccess: (workflow: WorkflowDetailDto) => void;
};

function getTipoLabel(tipo: string): string {
  if (tipo in CAMPO_DINAMICO_TIPO_LABELS) {
    return CAMPO_DINAMICO_TIPO_LABELS[tipo as CampoDinamicoTipo];
  }
  return tipo;
}

export function WorkflowCopyCamposFromCatalogModal({
  open,
  onClose,
  targetWorkflowId,
  disabled = false,
  onSuccess,
}: Props) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogCampos, setCatalogCampos] = useState<CampoDinamicoListItem[]>(
    [],
  );
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setSearch("");
    setCatalogCampos([]);
    setSelectedIds(new Set());
    setLoadError(null);
  }, []);

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open, resetState]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setCatalogLoading(true);
    setLoadError(null);

    const query = search.trim() || undefined;

    searchCamposDinamicos(DEFAULT_CONTEXTO, query)
      .then((rows) => {
        if (cancelled) return;
        setCatalogCampos(rows);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setCatalogCampos([]);
        setLoadError(
          error instanceof Error
            ? error.message
            : "Error al cargar campos del catálogo",
        );
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, search]);

  const filteredCampos = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || q.length >= 2) {
      return catalogCampos;
    }
    return catalogCampos.filter(
      (campo) =>
        campo.etiqueta.toLowerCase().includes(q) ||
        campo.clave.toLowerCase().includes(q),
    );
  }, [catalogCampos, search]);

  const allSelected =
    filteredCampos.length > 0 && selectedIds.size === filteredCampos.length;
  const someSelected =
    selectedIds.size > 0 && selectedIds.size < filteredCampos.length;

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
      setSelectedIds(new Set(filteredCampos.map((campo) => campo.id)));
      return;
    }
    setSelectedIds(new Set());
  }

  function handleCopy() {
    if (selectedIds.size === 0) return;

    const selectedArray = [...selectedIds];

    startTransition(async () => {
      try {
        const updated = await copyWorkflowCamposFromCatalog(targetWorkflowId, {
          contexto: DEFAULT_CONTEXTO,
          campo_dinamico_ids: selectedArray,
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
            : "Error al copiar campos del catálogo";
        toast.error(message);
      }
    });
  }

  const isBusy = disabled || isPending || catalogLoading;
  const canCopy = selectedIds.size > 0 && !isBusy && !loadError;

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader>
        <ModalTitle>Copiar desde catálogo</ModalTitle>
        <p className="mt-1 text-sm text-zinc-500">
          Se creará una copia independiente de los campos seleccionados en este
          workflow.
        </p>
      </ModalHeader>

      <ModalContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="catalog-copy-search">Buscar campo</Label>
          <Input
            id="catalog-copy-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por etiqueta o clave…"
            disabled={isBusy}
          />
          <HelperText>
            Solo campos activos del contexto caso. Los cambios posteriores en el
            catálogo no afectan este workflow.
          </HelperText>
        </div>

        {loadError ? (
          <p className="text-sm text-red-600">{loadError}</p>
        ) : null}

        <div className="space-y-3 rounded-lg border border-zinc-200 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-zinc-900">
              Campos disponibles
            </span>
            {filteredCampos.length > 0 ? (
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

          {catalogLoading ? (
            <p className="text-sm text-zinc-500">Cargando campos…</p>
          ) : filteredCampos.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No hay campos activos que coincidan con la búsqueda.
            </p>
          ) : (
            <ul className="max-h-56 space-y-2 overflow-y-auto">
              {filteredCampos.map((campo) => (
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
                      <Badge variant="neutral">{getTipoLabel(campo.tipo)}</Badge>
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
