"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { ContextIcon, type ContextIconTone } from "@/components/ui/context-icon";
import { Icon } from "@/components/ui/icons";

export type WorkflowOrigenOption = "plantilla" | "clonar" | "desde-cero";

export const WORKFLOW_ORIGEN_OPTIONS: Array<{
  id: WorkflowOrigenOption;
  title: string;
  description: string;
  recommended?: boolean;
  tone: ContextIconTone;
  icon: typeof Icon.FileText;
}> = [
  {
    id: "plantilla",
    title: "Crear desde plantilla JurilexIA",
    description:
      "Partí de una plantilla oficial y adaptala a tu organización.",
    recommended: true,
    tone: "primary",
    icon: Icon.FileText,
  },
  {
    id: "clonar",
    title: "Clonar workflow existente",
    description:
      "Copiá la configuración de un workflow de tu organización.",
    tone: "violet",
    icon: Icon.Layers,
  },
  {
    id: "desde-cero",
    title: "Crear desde cero",
    description: "Definí el workflow manualmente paso a paso.",
    tone: "success",
    icon: Icon.PlusCircle,
  },
];

export type OrigenOptionCardProps = {
  title: string;
  description: string;
  recommended?: boolean;
  selected: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  onSelect?: () => void;
  leading: ReactNode;
  children?: ReactNode;
};

/** Card de selección con panel expandible fuera del botón (evita button anidado con Select). */
export function OrigenOptionCard({
  title,
  description,
  recommended = false,
  selected,
  disabled = false,
  readOnly = false,
  onSelect,
  leading,
  children,
}: OrigenOptionCardProps) {
  const muted = readOnly ? !selected : disabled && !selected;
  const interactive = !readOnly && !disabled && Boolean(onSelect);

  return (
    <div
      className={`w-full rounded-xl border text-left transition-colors duration-150 ${
        muted
          ? "border-zinc-200 bg-white opacity-60"
          : selected
            ? "border-blue-200 bg-blue-50"
            : "border-zinc-200 bg-white"
      }`}
    >
      <button
        type="button"
        disabled={!interactive}
        onClick={interactive ? onSelect : undefined}
        aria-pressed={selected}
        className={`w-full p-4 text-left outline-none ${
          !interactive
            ? "cursor-default"
            : selected
              ? ""
              : "rounded-xl hover:bg-zinc-50"
        } focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:ring-offset-2`}
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0">{leading}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-zinc-900">
                    {title}
                  </span>
                  {recommended ? (
                    <Badge variant="info">Recomendado</Badge>
                  ) : null}
                </div>
                <p className="text-sm text-zinc-500">{description}</p>
              </div>
              <span
                className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border ${
                  selected
                    ? "border-blue-600 bg-blue-600"
                    : "border-zinc-300 bg-white"
                }`}
                aria-hidden
              >
                {selected ? (
                  <span className="size-1.5 rounded-full bg-white" />
                ) : null}
              </span>
            </div>
          </div>
        </div>
      </button>
      {selected && children ? (
        <div className="border-t border-zinc-100 px-4 pb-4 pt-3">{children}</div>
      ) : null}
    </div>
  );
}
