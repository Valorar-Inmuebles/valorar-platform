"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { HelperText, Label } from "@/components/ui/form-field";
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
  copyWorkflowParteCamposFromParte,
  WorkflowApiError,
} from "@/lib/api/workflows.api";
import type { WorkflowDetailDto, WorkflowParteDto } from "@/lib/types/workflow";

type Props = {
  open: boolean;
  onClose: () => void;
  workflow: WorkflowDetailDto;
  targetParteId: string;
  disabled?: boolean;
  onSuccess: (workflow: WorkflowDetailDto) => void;
};

export function WorkflowCopyCamposFromParteModal({
  open,
  onClose,
  workflow,
  targetParteId,
  disabled = false,
  onSuccess,
}: Props) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [sourceParteId, setSourceParteId] = useState("");

  const sourcePartes = useMemo(
    () =>
      [...workflow.partes]
        .filter((parte) => parte.id !== targetParteId)
        .sort((a, b) => a.orden - b.orden),
    [workflow.partes, targetParteId],
  );

  const sourceOptions: SelectOption[] = useMemo(
    () =>
      sourcePartes.map((parte) => ({
        value: parte.id,
        label: parte.nombre,
      })),
    [sourcePartes],
  );

  const selectedParte: WorkflowParteDto | undefined = useMemo(
    () => sourcePartes.find((parte) => parte.id === sourceParteId),
    [sourcePartes, sourceParteId],
  );

  const resetState = useCallback(() => {
    setSourceParteId("");
  }, []);

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open, resetState]);

  function handleConfirm() {
    if (!sourceParteId) {
      toast.error("Seleccioná una parte origen.");
      return;
    }

    startTransition(async () => {
      try {
        const updated = await copyWorkflowParteCamposFromParte(
          workflow.id,
          targetParteId,
          { sourceParteId },
        );
        onSuccess(updated);
        toast.success("Campos copiados desde la parte seleccionada");
        onClose();
      } catch (error) {
        const message =
          error instanceof WorkflowApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Error al copiar campos";
        toast.error(message);
      }
    });
  }

  const isBusy = disabled || isPending;
  const sourceCamposCount = selectedParte?.campos_dinamicos.length ?? 0;

  return (
    <Modal open={open} onClose={onClose}>
      <ModalHeader>
        <ModalTitle>Copiar desde parte</ModalTitle>
      </ModalHeader>
      <ModalContent className="space-y-4">
        {sourcePartes.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No hay otras partes en este workflow para copiar campos.
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="copy-source-parte">Parte origen</Label>
              <Select
                id="copy-source-parte"
                value={sourceParteId}
                onChange={setSourceParteId}
                options={sourceOptions}
                placeholder="Seleccionar parte"
                disabled={isBusy}
              />
              <HelperText>
                Se copiarán todos los campos de la parte origen. Los duplicados
                por etiqueta se omitirán.
              </HelperText>
            </div>

            {selectedParte ? (
              <p className="text-sm text-zinc-600">
                La parte &quot;{selectedParte.nombre}&quot; tiene{" "}
                {sourceCamposCount}{" "}
                {sourceCamposCount === 1 ? "campo" : "campos"} dinámicos.
              </p>
            ) : null}
          </>
        )}
      </ModalContent>
      <ModalFooter>
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={isBusy}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={handleConfirm}
          loading={isPending}
          disabled={isBusy || sourcePartes.length === 0 || !sourceParteId}
        >
          Copiar campos
        </Button>
      </ModalFooter>
    </Modal>
  );
}
