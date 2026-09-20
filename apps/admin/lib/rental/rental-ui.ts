import type {
  RentalContractStatus,
  RentalOccurrenceStatus,
} from "@/lib/api/types/rental";

export const CONTRACT_STATUS_LABELS: Record<RentalContractStatus, string> = {
  DRAFT: "Borrador",
  ACTIVE: "Activo",
  ENDED: "Finalizado",
  CANCELLED: "Cancelado",
};

export const OCCURRENCE_STATUS_LABELS: Record<RentalOccurrenceStatus, string> =
  {
    PENDING: "Pendiente",
    OVERDUE: "Vencido",
    FULFILLED: "Cumplido",
    CANCELLED: "Cancelado",
  };

export function formatDateOnly(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
  }).format(new Date(value));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function isEndingSoon(
  status: RentalContractStatus,
  endsOn: string | null,
  days = 60,
) {
  if (status !== "ACTIVE" || !endsOn) return false;
  const end = new Date(`${endsOn.slice(0, 10)}T00:00:00.000Z`).getTime();
  const now = new Date();
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const difference = end - today;
  return difference >= 0 && difference <= days * 86_400_000;
}

export function contractEventLabel(type: string) {
  return (
    {
      ACTIVATED: "Contrato activado",
      ENDED: "Contrato finalizado",
      CANCELLED: "Contrato cancelado",
      PARTIES_CHANGED: "Partes actualizadas",
      RENT_VALUE_REVISED: "Alquiler actualizado",
      RENEWED: "Contrato renovado",
    }[type] ?? "Contrato actualizado"
  );
}
