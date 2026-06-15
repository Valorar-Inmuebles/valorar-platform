"use client";

import type { ReactNode } from "react";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Icon } from "@/components/ui/icons";

export type StepperStep = {
  id: string;
  label: string;
  description?: string;
};

export type StepperProps = {
  steps: StepperStep[];
  currentStepId: string;
  completedStepIds?: string[];
  disabledStepIds?: string[];
  readonly?: boolean;
  /** En modo readonly, muestra icono Editar alineado a la derecha en pasos completados. */
  showCompletedEdit?: boolean;
  onStepClick?: (stepId: string) => void;
  className?: string;
};

type StepVisualState = "current" | "completed" | "disabled" | "upcoming";

function resolveStepState(
  stepId: string,
  currentStepId: string,
  completedStepIds: string[],
  disabledStepIds: string[],
): StepVisualState {
  if (stepId === currentStepId) return "current";
  if (completedStepIds.includes(stepId)) return "completed";
  if (disabledStepIds.includes(stepId)) return "disabled";
  return "upcoming";
}

const circleStyles: Record<StepVisualState, string> = {
  current: "border-indigo-600 bg-indigo-600 text-white",
  completed: "border-indigo-600 bg-indigo-50 text-indigo-700",
  disabled: "border-zinc-200 bg-zinc-50 text-zinc-300",
  upcoming: "border-zinc-300 bg-white text-zinc-500",
};

const labelStyles: Record<StepVisualState, string> = {
  current: "text-zinc-900",
  completed: "text-zinc-700",
  disabled: "text-zinc-300",
  upcoming: "text-zinc-500",
};

const circleSizeStyles: Record<StepVisualState, string> = {
  current: "size-8 text-sm",
  completed: "size-6 text-xs",
  disabled: "size-6 text-xs",
  upcoming: "size-6 text-xs",
};

const STEP_INDICATOR_TRACK_CLASS = "w-8";

function StepIndicator({
  index,
  state,
}: {
  index: number;
  state: StepVisualState;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full border font-semibold tabular-nums transition-colors ${circleSizeStyles[state]} ${circleStyles[state]}`}
      aria-hidden
    >
      {state === "completed" ? (
        <svg
          viewBox="0 0 16 16"
          fill="currentColor"
          className="size-3.5"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        index + 1
      )}
    </span>
  );
}

function StepperItem({
  step,
  index,
  isLast,
  state,
  readonly,
  showCompletedEdit,
  onStepClick,
}: {
  step: StepperStep;
  index: number;
  isLast: boolean;
  state: StepVisualState;
  readonly?: boolean;
  showCompletedEdit?: boolean;
  onStepClick?: (stepId: string) => void;
}) {
  const isClickable =
    !readonly &&
    onStepClick &&
    state !== "disabled" &&
    (state === "completed" || state === "current" || state === "upcoming");

  const showEditAction =
    readonly &&
    showCompletedEdit &&
    state === "completed" &&
    Boolean(onStepClick);

  const content = (
    <>
      <div className="flex items-start gap-3">
        <div
          className={`flex shrink-0 flex-col items-center ${STEP_INDICATOR_TRACK_CLASS}`}
        >
          <StepIndicator index={index} state={state} />
          {!isLast && (
            <span
              className={`mt-1 w-px flex-1 min-h-[1.25rem] ${
                state === "completed" ? "bg-indigo-200" : "bg-zinc-200"
              }`}
              aria-hidden
            />
          )}
        </div>
        <div className="flex min-w-0 flex-1 items-start gap-1">
          <div className="min-w-0 flex-1 pb-4">
            <p
              className={`text-sm font-medium leading-tight ${labelStyles[state]}`}
            >
              {step.label}
            </p>
            {step.description ? (
              <p
                className={`mt-0.5 text-xs leading-snug ${
                  state === "disabled" ? "text-zinc-300" : "text-zinc-500"
                }`}
              >
                {step.description}
              </p>
            ) : null}
          </div>
          {showEditAction ? (
            <ActionIconButton
              type="button"
              onClick={() => onStepClick?.(step.id)}
              aria-label={`Editar ${step.label}`}
              className="mt-0.5 shrink-0"
            >
              <Icon.Edit className="size-3.5" />
            </ActionIconButton>
          ) : null}
        </div>
      </div>
    </>
  );

  if (!isClickable) {
    return <div className="w-full">{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => onStepClick?.(step.id)}
      className="w-full rounded-lg text-left outline-none transition-colors hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-indigo-500/20"
      aria-current={state === "current" ? "step" : undefined}
    >
      {content}
    </button>
  );
}

export function Stepper({
  steps,
  currentStepId,
  completedStepIds = [],
  disabledStepIds = [],
  readonly = false,
  showCompletedEdit = false,
  onStepClick,
  className = "",
}: StepperProps) {
  return (
    <nav aria-label="Pasos" className={className}>
      <ol className="flex flex-col">
        {steps.map((step, index) => {
          const state = resolveStepState(
            step.id,
            currentStepId,
            completedStepIds,
            disabledStepIds,
          );

          return (
            <li key={step.id}>
              <StepperItem
                step={step}
                index={index}
                isLast={index === steps.length - 1}
                state={state}
                readonly={readonly}
                showCompletedEdit={showCompletedEdit}
                onStepClick={onStepClick}
              />
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function StepperPanel({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {title ? (
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          {title}
        </h3>
      ) : null}
      {children}
    </div>
  );
}
