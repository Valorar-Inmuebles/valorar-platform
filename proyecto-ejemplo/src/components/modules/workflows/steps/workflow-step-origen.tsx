"use client";

import { useEffect, useMemo, useState } from "react";
import { getWorkflows } from "@/lib/api/workflows.api";
import type { WorkflowListItemDto } from "@/lib/types/workflow";
import { ContextIcon } from "@/components/ui/context-icon";
import { InfoBanner } from "@/components/ui/info-banner";
import { Select, type SelectOption } from "@/components/ui/select";
import { FormField, Label } from "@/components/ui/form-field";
import {
  OrigenOptionCard,
  WORKFLOW_ORIGEN_OPTIONS,
  type WorkflowOrigenOption,
} from "@/components/modules/workflows/workflow-step-origen-cards";

export type { WorkflowOrigenOption } from "@/components/modules/workflows/workflow-step-origen-cards";

type Props = {
  readonly?: boolean;
  disabled?: boolean;
  origen: WorkflowOrigenOption;
  onOrigenChange: (value: WorkflowOrigenOption) => void;
  plantillaId: string;
  onPlantillaIdChange: (value: string) => void;
  cloneSourceId: string;
  onCloneSourceIdChange: (value: string) => void;
  plantillaError?: string;
  cloneError?: string;
};

function formatWorkflowLabel(workflow: WorkflowListItemDto): string {
  const parts = [
    workflow.nombre,
    workflow.tipo.nombre !== "—" ? workflow.tipo.nombre : null,
  ].filter(Boolean);

  return parts.join(" · ");
}

function toSelectOptions(items: WorkflowListItemDto[]): SelectOption[] {
  return items.map((item) => ({
    value: item.id,
    label: formatWorkflowLabel(item),
  }));
}

export function WorkflowStepOrigen({
  readonly = false,
  disabled = false,
  origen,
  onOrigenChange,
  plantillaId,
  onPlantillaIdChange,
  cloneSourceId,
  onCloneSourceIdChange,
  plantillaError,
  cloneError,
}: Props) {
  const [infoBannerVisible, setInfoBannerVisible] = useState(true);
  const [plantillas, setPlantillas] = useState<WorkflowListItemDto[]>([]);
  const [tenantWorkflows, setTenantWorkflows] = useState<WorkflowListItemDto[]>(
    [],
  );
  const [loadingPlantillas, setLoadingPlantillas] = useState(false);
  const [loadingClones, setLoadingClones] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (readonly) return;

    let cancelled = false;

    async function load() {
      setLoadingPlantillas(true);
      setLoadingClones(true);
      setLoadError(null);

      try {
        const [systemRows, tenantRows] = await Promise.all([
          getWorkflows({ origen: "system" }),
          getWorkflows({ origen: "tenant" }),
        ]);

        if (cancelled) return;

        setPlantillas(systemRows);
        setTenantWorkflows(tenantRows);
      } catch (error: unknown) {
        if (cancelled) return;
        setPlantillas([]);
        setTenantWorkflows([]);
        setLoadError(
          error instanceof Error
            ? error.message
            : "Error al cargar opciones de origen",
        );
      } finally {
        if (!cancelled) {
          setLoadingPlantillas(false);
          setLoadingClones(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [readonly]);

  const plantillaOptions = useMemo(
    () => toSelectOptions(plantillas),
    [plantillas],
  );

  const cloneOptions = useMemo(
    () => toSelectOptions(tenantWorkflows),
    [tenantWorkflows],
  );

  const controlsDisabled = disabled || readonly;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-zinc-900">Origen</h2>
        <p className="text-sm text-zinc-500">
          Elegí cómo querés iniciar este workflow. La clasificación se define en
          el siguiente paso.
        </p>
      </div>

      {infoBannerVisible ? (
        <InfoBanner variant="info" onDismiss={() => setInfoBannerVisible(false)}>
          Al confirmar y avanzar al paso 2 se creará el borrador del workflow en
          tu organización.
        </InfoBanner>
      ) : null}

      {loadError ? (
        <InfoBanner variant="error">{loadError}</InfoBanner>
      ) : null}

      <div className="space-y-3">
        {WORKFLOW_ORIGEN_OPTIONS.map((option) => {
          const OptionIcon = option.icon;
          const selected = origen === option.id;

          return (
            <OrigenOptionCard
              key={option.id}
              title={option.title}
              description={option.description}
              recommended={option.recommended}
              selected={selected}
              disabled={controlsDisabled}
              onSelect={() => onOrigenChange(option.id)}
              leading={
                <ContextIcon tone={option.tone} size="sm">
                  <OptionIcon className="size-4" />
                </ContextIcon>
              }
            >
              {selected && option.id === "plantilla" ? (
                <FormField state={plantillaError ? "error" : "default"}>
                  <Label>Plantilla JurilexIA</Label>
                  <Select
                    options={plantillaOptions}
                    value={plantillaId}
                    onChange={onPlantillaIdChange}
                    placeholder={
                      loadingPlantillas
                        ? "Cargando plantillas…"
                        : plantillaOptions.length === 0
                          ? "Sin plantillas disponibles"
                          : "Seleccioná una plantilla…"
                    }
                    disabled={
                      controlsDisabled ||
                      loadingPlantillas ||
                      plantillaOptions.length === 0
                    }
                  />
                  {plantillaError ? (
                    <p className="mt-1 text-xs text-red-600">{plantillaError}</p>
                  ) : null}
                </FormField>
              ) : null}
              {selected && option.id === "clonar" ? (
                <FormField state={cloneError ? "error" : "default"}>
                  <Label>Workflow de la organización</Label>
                  <Select
                    options={cloneOptions}
                    value={cloneSourceId}
                    onChange={onCloneSourceIdChange}
                    placeholder={
                      loadingClones
                        ? "Cargando workflows…"
                        : cloneOptions.length === 0
                          ? "Sin workflows disponibles"
                          : "Seleccioná un workflow origen…"
                    }
                    disabled={
                      controlsDisabled ||
                      loadingClones ||
                      cloneOptions.length === 0
                    }
                  />
                  {cloneError ? (
                    <p className="mt-1 text-xs text-red-600">{cloneError}</p>
                  ) : null}
                </FormField>
              ) : null}
            </OrigenOptionCard>
          );
        })}
      </div>
    </div>
  );
}
