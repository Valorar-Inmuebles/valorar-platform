import type { BadgeVariant } from "@/components/ui/badge";
import type { WorkflowEtapaColor } from "@/lib/types/workflow";

export const WORKFLOW_ETAPA_COLOR_LABELS: Record<WorkflowEtapaColor, string> = {
  primary: "Primario",
  success: "Éxito",
  warning: "Advertencia",
  danger: "Peligro",
  neutral: "Neutro",
};

export const WORKFLOW_ETAPA_BADGE_VARIANT: Record<
  WorkflowEtapaColor,
  BadgeVariant
> = {
  primary: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
  neutral: "neutral",
};

/** Círculo numerado de orden — size-8, borde + fondo suave (ContextIcon / InfoBanner). */
export const WORKFLOW_ETAPA_ORDER_CIRCLE_CLASS: Record<
  WorkflowEtapaColor,
  string
> = {
  primary: "border-blue-200 bg-blue-50 text-blue-600",
  success: "border-green-200 bg-green-50 text-green-600",
  warning: "border-amber-200 bg-amber-50 text-amber-600",
  danger: "border-red-200 bg-red-50 text-red-600",
  neutral: "border-zinc-200 bg-zinc-50 text-zinc-600",
};

/** Card de etapa (Paso 6) — borde + fondo suave; derivado del badge numerado. */
export const WORKFLOW_ETAPA_CARD_SURFACE_CLASS = Object.fromEntries(
  (Object.keys(WORKFLOW_ETAPA_ORDER_CIRCLE_CLASS) as WorkflowEtapaColor[]).map(
    (color) => [
      color,
      WORKFLOW_ETAPA_ORDER_CIRCLE_CLASS[color]
        .replace(/\btext-\S+/g, "")
        .trim(),
    ],
  ),
) as Record<WorkflowEtapaColor, string>;
