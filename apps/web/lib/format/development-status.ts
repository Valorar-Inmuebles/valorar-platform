import type { DevelopmentStatus } from "@repo/shared-types";

export const DEVELOPMENT_STATUS_LABELS: Record<DevelopmentStatus, string> = {
  IN_PIT: "En pozo",
  UNDER_CONSTRUCTION: "En construcción",
  COMPLETED: "Terminado",
};

export function getDevelopmentStatusLabel(
  status: DevelopmentStatus | null | undefined,
): string | null {
  if (!status) {
    return null;
  }

  return DEVELOPMENT_STATUS_LABELS[status] ?? null;
}
