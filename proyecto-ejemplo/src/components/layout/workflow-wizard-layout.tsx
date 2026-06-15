"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Stepper, StepperPanel, type StepperStep } from "@/components/ui/stepper";
import { WorkflowSummarySidebar } from "@/components/modules/workflows/workflow-summary-sidebar";
import type { WorkflowDetailDto } from "@/lib/types/workflow";

export type WorkflowWizardMode = "create" | "edit" | "view";

export type WorkflowWizardLayoutProps = {
  mode: WorkflowWizardMode;
  currentStep: number;
  steps: StepperStep[];
  currentStepId: string;
  completedStepIds: string[];
  disabledStepIds: string[];
  stepperNavigable?: boolean;
  showCompletedStepEdit?: boolean;
  workflow: WorkflowDetailDto | null;
  stepTitle: string;
  breadcrumb: BreadcrumbItem[];
  cancelHref: string;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  navigationDisabled?: boolean;
  nextLoading?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  onStepClick?: (stepId: string) => void;
  footer?: ReactNode;
  children: ReactNode;
};

const MODE_LABEL: Record<WorkflowWizardMode, string> = {
  create: "Nuevo workflow",
  edit: "Editar workflow",
  view: "Ver workflow",
};

/** UX Pass: sidebar resumen oculto temporalmente; cambiar a `true` para reactivar. */
const SHOW_WORKFLOW_SUMMARY_SIDEBAR = false;

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden
      className="size-4"
    >
      <path d="M4 4l8 8M12 4 4 12" />
    </svg>
  );
}

export function WorkflowWizardLayout({
  mode,
  currentStep,
  steps,
  currentStepId,
  completedStepIds,
  disabledStepIds,
  stepperNavigable = false,
  showCompletedStepEdit = false,
  workflow,
  stepTitle,
  breadcrumb,
  cancelHref,
  canGoPrevious = currentStep > 1,
  canGoNext = currentStep < steps.length,
  navigationDisabled = false,
  nextLoading = false,
  onPrevious,
  onNext,
  onStepClick,
  footer,
  children,
}: WorkflowWizardLayoutProps) {
  const router = useRouter();
  const navLocked = navigationDisabled || nextLoading;

  return (
    <div className="-mx-5 -my-6 flex min-h-[calc(100vh-3.25rem)] flex-col sm:-mx-6 lg:-mx-8">
      <div className="border-b border-zinc-200 bg-white px-5 py-3 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <BackButton href={cancelHref} />
              <Breadcrumb items={breadcrumb} />
            </div>
            <div className="space-y-0.5">
              <h1 className="text-lg font-semibold text-zinc-900">
                {MODE_LABEL[mode]}
              </h1>
              <p className="text-xs text-zinc-400">
                Paso {currentStep} de {steps.length} · {stepTitle}
              </p>
            </div>
          </div>
          {navLocked ? (
            <span
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-300"
              aria-hidden
            >
              <CloseIcon />
            </span>
          ) : (
            <Link
              href={cancelHref}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-700"
              aria-label="Cerrar wizard"
            >
              <CloseIcon />
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="min-w-0 flex-1 px-5 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">{children}</div>
        </div>

        <aside className="w-full shrink-0 border-t border-zinc-200 bg-zinc-50/80 px-5 py-5 lg:w-72 lg:border-l lg:border-t-0 xl:w-80">
          <div className="space-y-5">
            <StepperPanel title="Progreso">
              <Stepper
                steps={steps}
                currentStepId={currentStepId}
                completedStepIds={completedStepIds}
                disabledStepIds={disabledStepIds}
                readonly={!stepperNavigable}
                showCompletedEdit={showCompletedStepEdit}
                onStepClick={onStepClick}
              />
            </StepperPanel>
            {SHOW_WORKFLOW_SUMMARY_SIDEBAR ? (
              <WorkflowSummarySidebar workflow={workflow} />
            ) : null}
          </div>
        </aside>
      </div>

      <div className="sticky bottom-0 border-t border-zinc-200 bg-white/95 px-5 py-3 backdrop-blur-sm sm:px-6 lg:px-8">
        {footer ?? (
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={!canGoPrevious || navLocked}
              onClick={onPrevious}
            >
              Anterior
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={navLocked}
                onClick={() => router.push(cancelHref)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={!canGoNext || navLocked}
                loading={nextLoading}
                onClick={onNext}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
