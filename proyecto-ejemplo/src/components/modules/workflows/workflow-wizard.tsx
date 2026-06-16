"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { WorkflowWizardLayout } from "@/components/layout/workflow-wizard-layout";
import type { BreadcrumbItem } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  WORKFLOW_WIZARD_STEP_COUNT,
  WORKFLOW_WIZARD_STEPS,
  workflowStepIdAt,
  workflowStepIndexById,
  workflowStepLabelAt,
} from "@/components/modules/workflows/workflow-wizard-steps";
import {
  WorkflowStepOrigen,
  type WorkflowOrigenOption,
} from "@/components/modules/workflows/steps/workflow-step-origen";
import { WorkflowStepOrigenReadonly } from "@/components/modules/workflows/steps/workflow-step-origen-readonly";
import {
  WorkflowStepClasificacion,
  type WorkflowStepClasificacionHandle,
} from "@/components/modules/workflows/steps/workflow-step-clasificacion";
import { WorkflowStepEtapas } from "@/components/modules/workflows/steps/workflow-step-etapas";
import { WorkflowStepPartes } from "@/components/modules/workflows/steps/workflow-step-partes";
import { WorkflowStepCamposDinamicos } from "@/components/modules/workflows/steps/workflow-step-campos-dinamicos";
import { WorkflowStepTareas } from "@/components/modules/workflows/steps/workflow-step-tareas";
import { WorkflowStepResumen } from "@/components/modules/workflows/steps/workflow-step-resumen";
import { persistWorkflowOrigen } from "@/components/modules/workflows/workflow-origen-persist";
import {
  getMaxAllowedStepIndex,
  hasValidPartes,
  isWorkflowPublishReady,
  resolveStepIndexFromUrl,
  stepNumberFromIndex,
} from "@/components/modules/workflows/workflow-wizard-navigation";
import { cloneWorkflow, publishWorkflow } from "@/lib/api/workflows.api";
import type { WorkflowDetailDto } from "@/lib/types/workflow";
import type { WorkflowWizardMode } from "@/components/layout/workflow-wizard-layout";

const BASE_PATH = "/workflows";

type Props = {
  mode: WorkflowWizardMode;
  workflow: WorkflowDetailDto | null;
  cancelHref?: string;
};

function buildBreadcrumb(
  mode: WorkflowWizardMode,
  workflow: WorkflowDetailDto | null,
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [{ label: "Workflows", href: BASE_PATH }];

  if (mode === "create") {
    items.push({ label: "Nuevo workflow" });
  } else if (workflow) {
    items.push({
      label: workflow.nombre?.trim() || "Sin definir",
    });
  }

  return items;
}

function WorkflowStepPlaceholder({ stepLabel }: { stepLabel: string }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-200 bg-white px-6 py-12">
      <p className="text-sm font-medium text-zinc-900">{stepLabel}</p>
      <p className="mt-1 text-sm text-zinc-500">
        Este paso se implementará en una fase posterior del Workflow Builder.
      </p>
    </div>
  );
}

export function WorkflowWizard({
  mode,
  workflow,
  cancelHref = BASE_PATH,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const clasificacionRef = useRef<WorkflowStepClasificacionHandle>(null);

  const initialStepIndex = resolveStepIndexFromUrl(
    searchParams.get("step"),
    mode,
    workflow,
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(
    () => initialStepIndex,
  );
  /** Paso destino de la última navegación explícita; filtra ?step= obsoletos en vuelo. */
  const intendedStepRef = useRef(initialStepIndex);
  /** true tras popstate (Atrás/Adelante del navegador) hasta aplicar la URL. */
  const isPopNavigationRef = useRef(false);
  const [localWorkflow, setLocalWorkflow] = useState<WorkflowDetailDto | null>(
    workflow,
  );

  const [origen, setOrigen] = useState<WorkflowOrigenOption>("plantilla");
  const [plantillaId, setPlantillaId] = useState("");
  const [cloneSourceId, setCloneSourceId] = useState("");
  const [plantillaError, setPlantillaError] = useState<string | undefined>();
  const [cloneError, setCloneError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResumenPending, startResumenTransition] = useTransition();

  const isViewMode = mode === "view";
  const isClasificacionEditable =
    mode === "edit" && Boolean(localWorkflow?.editable);

  const currentStepId = workflowStepIdAt(currentStepIndex);
  const stepLabel = workflowStepLabelAt(currentStepIndex);
  const currentStepNumber = currentStepIndex + 1;
  const isResumenStep = currentStepId === "confirmacion";
  const resumenReadonly =
    isViewMode ||
    !localWorkflow?.editable ||
    localWorkflow?.estado === "archivado";
  const publishReady = isWorkflowPublishReady(localWorkflow);
  const footerLocked = isSubmitting || isResumenPending;

  useEffect(() => {
    setLocalWorkflow(workflow);
  }, [workflow]);

  useEffect(() => {
    if (mode === "create") return;

    function handlePopState() {
      isPopNavigationRef.current = true;
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [mode]);

  const syncStepUrl = useCallback(
    (index: number) => {
      if (mode === "create" || !pathname) return;

      const step = stepNumberFromIndex(index);
      router.replace(`${pathname}?step=${step}`, { scroll: false });
    },
    [mode, pathname, router],
  );

  const navigateToStepIndex = useCallback(
    (index: number, workflowSnapshot?: WorkflowDetailDto | null) => {
      const maxIndex = getMaxAllowedStepIndex(
        workflowSnapshot ?? localWorkflow,
      );
      const resolved = Math.max(0, Math.min(index, maxIndex));

      intendedStepRef.current = resolved;
      setCurrentStepIndex(resolved);
      syncStepUrl(resolved);
    },
    [localWorkflow, syncStepUrl],
  );

  useEffect(() => {
    if (mode === "create") return;

    const resolved = resolveStepIndexFromUrl(
      searchParams.get("step"),
      mode,
      localWorkflow,
    );

    const urlStep = searchParams.get("step");
    const expectedStep = String(stepNumberFromIndex(resolved));

    if (isPopNavigationRef.current) {
      isPopNavigationRef.current = false;
      intendedStepRef.current = resolved;
      setCurrentStepIndex(resolved);
      if (urlStep !== expectedStep) {
        syncStepUrl(resolved);
      }
      return;
    }

    if (resolved !== intendedStepRef.current) {
      return;
    }

    setCurrentStepIndex(resolved);
    if (urlStep !== expectedStep) {
      syncStepUrl(resolved);
    }
  }, [searchParams, mode, syncStepUrl, localWorkflow]);

  useEffect(() => {
    if (mode === "create") return;

    const maxIndex = getMaxAllowedStepIndex(localWorkflow);
    if (currentStepIndex > maxIndex) {
      intendedStepRef.current = maxIndex;
      setCurrentStepIndex(maxIndex);
      syncStepUrl(maxIndex);
    }
  }, [currentStepIndex, localWorkflow, mode, syncStepUrl]);

  const completedStepIds = useMemo(() => {
    if (mode === "view") {
      return WORKFLOW_WIZARD_STEPS.map((step) => step.id);
    }
    return WORKFLOW_WIZARD_STEPS.slice(0, currentStepIndex).map(
      (step) => step.id,
    );
  }, [currentStepIndex, mode]);

  const disabledStepIds = useMemo(() => {
    if (mode === "view") return [];
    return WORKFLOW_WIZARD_STEPS.slice(currentStepIndex + 1).map(
      (step) => step.id,
    );
  }, [currentStepIndex, mode]);

  function handleStepClick(stepId: string) {
    navigateToStepIndex(workflowStepIndexById(stepId));
  }

  function clearOrigenErrors() {
    setPlantillaError(undefined);
    setCloneError(undefined);
  }

  function validateOrigen(): boolean {
    clearOrigenErrors();

    if (origen === "plantilla" && !plantillaId) {
      setPlantillaError("Seleccioná una plantilla JurilexIA.");
      return false;
    }

    if (origen === "clonar" && !cloneSourceId) {
      setCloneError("Seleccioná un workflow de tu organización.");
      return false;
    }

    return true;
  }

  async function handlePersistOrigen() {
    if (isSubmitting) return;
    if (!validateOrigen()) return;

    setIsSubmitting(true);

    try {
      const created = await persistWorkflowOrigen(
        origen,
        plantillaId,
        cloneSourceId,
      );

      toast.success("Workflow creado en borrador");
      router.push(`${BASE_PATH}/${created.id}/editar?step=2`);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al crear el workflow";

      if (origen === "plantilla" && message.includes("plantilla")) {
        setPlantillaError(message);
      } else if (origen === "clonar" && message.includes("workflow")) {
        setCloneError(message);
      }

      toast.error(message);
      setIsSubmitting(false);
    }
  }

  async function handlePersistClasificacion() {
    if (isSubmitting || !localWorkflow) return;

    if (isViewMode || !isClasificacionEditable) {
      navigateToStepIndex(currentStepIndex + 1);
      return;
    }

    setIsSubmitting(true);

    try {
      const updated = await clasificacionRef.current?.submit();
      if (updated) {
        setLocalWorkflow(updated);
        toast.success("Clasificación guardada");
      }
      setIsSubmitting(false);
      navigateToStepIndex(currentStepIndex + 1, updated ?? localWorkflow);
    } catch (error: unknown) {
      if (error instanceof Error && error.message === "VALIDATION_FAILED") {
        toast.error("Completá los campos obligatorios de clasificación.");
      } else {
        const message =
          error instanceof Error
            ? error.message
            : "Error al guardar la clasificación";
        toast.error(message);
      }
      setIsSubmitting(false);
    }
  }

  function handleNext() {
    if (isSubmitting) return;

    if (currentStepIndex === 0 && mode === "create") {
      void handlePersistOrigen();
      return;
    }

    if (currentStepId === "clasificacion") {
      void handlePersistClasificacion();
      return;
    }

    if (currentStepId === "etapas") {
      if (!localWorkflow || localWorkflow.etapas.length === 0) {
        toast.error("Agregá al menos una etapa para continuar.");
        return;
      }
      navigateToStepIndex(currentStepIndex + 1);
      return;
    }

    if (currentStepId === "partes") {
      if (!localWorkflow || localWorkflow.partes.length === 0) {
        toast.error("Agregá al menos una parte para continuar.");
        return;
      }
      if (!hasValidPartes(localWorkflow)) {
        toast.error("Definí exactamente una parte principal para continuar.");
        return;
      }
      navigateToStepIndex(currentStepIndex + 1);
      return;
    }

    navigateToStepIndex(currentStepIndex + 1);
  }

  function handleOrigenChange(next: WorkflowOrigenOption) {
    setOrigen(next);
    clearOrigenErrors();
  }

  const handlePublishWorkflow = useCallback(() => {
    if (!localWorkflow || !isWorkflowPublishReady(localWorkflow)) return;

    startResumenTransition(async () => {
      try {
        await publishWorkflow(localWorkflow.id);
        toast.success("Workflow publicado correctamente.");
        router.replace(BASE_PATH);
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Error al publicar el workflow";
        toast.error(message);
      }
    });
  }, [localWorkflow, router, toast]);

  const handleCloneWorkflow = useCallback(() => {
    if (!localWorkflow) return;

    startResumenTransition(async () => {
      try {
        const cloned = await cloneWorkflow(localWorkflow.id);
        toast.success("Workflow clonado");
        router.push(`${BASE_PATH}/${cloned.id}/editar?step=7`);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Error al clonar el workflow";
        toast.error(message);
      }
    });
  }, [localWorkflow, router, toast]);

  const handleSaveDraftCallback = useCallback(() => {
    toast.success("Borrador guardado");
    router.push(cancelHref);
  }, [cancelHref, router, toast]);

  const resumenFooter = useMemo(() => {
    if (!isResumenStep || !localWorkflow) return undefined;

    const canGoBack = currentStepIndex > 0;

    return (
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={!canGoBack || footerLocked}
          onClick={() => navigateToStepIndex(currentStepIndex - 1)}
        >
          Volver
        </Button>

        <div className="flex items-center gap-2">
          {localWorkflow.estado === "borrador" && localWorkflow.editable ? (
            <>
              <Button
                type="button"
                variant="ghost"
                disabled={footerLocked}
                onClick={handleSaveDraftCallback}
              >
                Guardar borrador
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={!publishReady || footerLocked}
                loading={isResumenPending}
                onClick={handlePublishWorkflow}
              >
                Publicar workflow
              </Button>
            </>
          ) : null}

          {localWorkflow.estado === "activo" ? (
            <Button
              type="button"
              variant="primary"
              disabled={footerLocked}
              loading={isResumenPending}
              onClick={handleCloneWorkflow}
            >
              Clonar workflow
            </Button>
          ) : null}
        </div>
      </div>
    );
  }, [
    isResumenStep,
    localWorkflow,
    currentStepIndex,
    footerLocked,
    publishReady,
    isResumenPending,
    navigateToStepIndex,
    handleSaveDraftCallback,
    handlePublishWorkflow,
    handleCloneWorkflow,
  ]);

  function renderStepContent() {
    if (currentStepId === "origen") {
      if ((isViewMode || mode === "edit") && localWorkflow) {
        return <WorkflowStepOrigenReadonly workflow={localWorkflow} />;
      }

      return (
        <WorkflowStepOrigen
          readonly={false}
          disabled={isSubmitting}
          origen={origen}
          onOrigenChange={handleOrigenChange}
          plantillaId={plantillaId}
          onPlantillaIdChange={(value) => {
            setPlantillaId(value);
            setPlantillaError(undefined);
          }}
          cloneSourceId={cloneSourceId}
          onCloneSourceIdChange={(value) => {
            setCloneSourceId(value);
            setCloneError(undefined);
          }}
          plantillaError={plantillaError}
          cloneError={cloneError}
        />
      );
    }

    if (currentStepId === "clasificacion") {
      if (!localWorkflow) {
        return <WorkflowStepPlaceholder stepLabel="Clasificación" />;
      }

      return (
        <WorkflowStepClasificacion
          ref={clasificacionRef}
          workflow={localWorkflow}
          readonly={isViewMode || !isClasificacionEditable}
          disabled={isSubmitting}
        />
      );
    }

    if (currentStepId === "etapas") {
      if (!localWorkflow) {
        return <WorkflowStepPlaceholder stepLabel="Etapas" />;
      }

      return (
        <WorkflowStepEtapas
          workflow={localWorkflow}
          readonly={isViewMode || !localWorkflow.editable}
          disabled={isSubmitting}
          onWorkflowChange={setLocalWorkflow}
        />
      );
    }

    if (currentStepId === "partes") {
      if (!localWorkflow) {
        return <WorkflowStepPlaceholder stepLabel="Partes" />;
      }

      return (
        <WorkflowStepPartes
          workflow={localWorkflow}
          readonly={isViewMode || !localWorkflow.editable}
          disabled={isSubmitting}
          onWorkflowChange={setLocalWorkflow}
        />
      );
    }

    if (currentStepId === "campos") {
      if (!localWorkflow) {
        return <WorkflowStepPlaceholder stepLabel="Campos dinámicos" />;
      }

      return (
        <WorkflowStepCamposDinamicos
          workflow={localWorkflow}
          readonly={isViewMode || !localWorkflow.editable}
          disabled={isSubmitting}
          onWorkflowChange={setLocalWorkflow}
        />
      );
    }

    if (currentStepId === "tareas") {
      if (!localWorkflow) {
        return <WorkflowStepPlaceholder stepLabel="Tareas sugeridas" />;
      }

      return (
        <WorkflowStepTareas
          workflow={localWorkflow}
          readonly={isViewMode || !localWorkflow.editable}
          disabled={isSubmitting}
          onWorkflowChange={setLocalWorkflow}
        />
      );
    }

    if (currentStepId === "confirmacion") {
      if (!localWorkflow) {
        return <WorkflowStepPlaceholder stepLabel="Confirmación" />;
      }

      return (
        <WorkflowStepResumen
          workflow={localWorkflow}
          readonly={resumenReadonly}
          onEditStep={navigateToStepIndex}
        />
      );
    }

    return <WorkflowStepPlaceholder stepLabel={stepLabel} />;
  }

  const isNextLoading =
    isSubmitting &&
    ((currentStepIndex === 0 && mode === "create") ||
      currentStepId === "clasificacion");

  return (
    <WorkflowWizardLayout
      mode={mode}
      currentStep={currentStepNumber}
      steps={WORKFLOW_WIZARD_STEPS}
      currentStepId={currentStepId}
      completedStepIds={completedStepIds}
      disabledStepIds={disabledStepIds}
      stepperNavigable={isViewMode}
      showCompletedStepEdit={mode === "edit"}
      workflow={localWorkflow}
      stepTitle={stepLabel}
      breadcrumb={buildBreadcrumb(mode, localWorkflow)}
      cancelHref={cancelHref}
      canGoPrevious={currentStepIndex > 0}
      canGoNext={
        !isResumenStep && currentStepIndex < WORKFLOW_WIZARD_STEP_COUNT - 1
      }
      navigationDisabled={isSubmitting || isResumenPending}
      nextLoading={isNextLoading}
      onPrevious={() => navigateToStepIndex(currentStepIndex - 1)}
      onNext={handleNext}
      onStepClick={mode !== "create" ? handleStepClick : undefined}
      footer={resumenFooter}
    >
      {renderStepContent()}
    </WorkflowWizardLayout>
  );
}
