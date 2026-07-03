import type { DevelopmentStatus } from "@repo/shared-types";

export const DEVELOPMENT_STATUS_LABELS: Record<DevelopmentStatus, string> = {
  IN_PIT: "En pozo",
  UNDER_CONSTRUCTION: "En construcción",
  COMPLETED: "Terminado",
};

export const DEVELOPMENT_STATUS_OPTIONS: Array<{
  value: DevelopmentStatus;
  label: string;
}> = Object.entries(DEVELOPMENT_STATUS_LABELS).map(([value, label]) => ({
  value: value as DevelopmentStatus,
  label,
}));

export function getDevelopmentStatusLabel(
  status: DevelopmentStatus,
): string {
  return DEVELOPMENT_STATUS_LABELS[status];
}
