import type {
  RentalAttentionDeliveryItem,
  RentalAttentionPlanningIssueItem,
  RentalDeliveryChannel,
  RentalDeliveryStatus,
  RentalInboundMessage,
  RentalPlanningIssueStatus,
  RentalPlanningIssueType,
  RentalRetryConflictReason,
} from "@repo/shared-types";
import type { BadgeVariant } from "@repo/ui/badge";
import type { ToastVariant } from "@repo/ui/toast";

/** Labels de producto para estados de delivery. Nunca mostrar enums crudos. */
export const COMMUNICATION_DELIVERY_STATUS_LABELS: Record<
  RentalDeliveryStatus,
  string
> = {
  PENDING: "Pendiente",
  PROCESSING: "En proceso",
  SENT: "Enviado",
  DELIVERED: "Entregado",
  READ: "Leído",
  FAILED: "Fallido",
  SKIPPED: "Omitido",
};

/** Variantes de badge semántico por estado de delivery. */
export const DELIVERY_STATUS_BADGE_VARIANT: Record<
  RentalDeliveryStatus,
  BadgeVariant
> = {
  PENDING: "neutral",
  PROCESSING: "info",
  SENT: "neutral",
  DELIVERED: "success",
  READ: "success",
  FAILED: "danger",
  SKIPPED: "neutral",
};

export const COMMUNICATION_CHANNEL_LABELS: Record<
  RentalDeliveryChannel,
  string
> = {
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  SMS: "SMS",
};

export const PLANNING_ISSUE_TYPE_LABELS: Record<
  RentalPlanningIssueType,
  string
> = {
  DUE_DATE_MISSING: "Falta fecha de vencimiento",
  DISPLAY_AMOUNT_MISSING: "Falta importe a mostrar",
  NO_ENABLED_ROUTE: "Sin canal habilitado",
  CONTACT_POINT_INELIGIBLE: "Contacto no elegible",
  TENANT_TIME_ZONE_MISSING_OR_INVALID:
    "Zona horaria de la organización inválida",
  PROVIDER_CONFIGURATION_INVALID: "Configuración del proveedor inválida",
  PROVIDER_TEMPLATE_INVALID: "Plantilla del proveedor inválida",
  PLANNING_WINDOW_EXPIRED: "Ventana de planificación vencida",
};

export const PLANNING_ISSUE_STATUS_LABELS: Record<
  RentalPlanningIssueStatus,
  string
> = {
  OPEN: "Abierto",
  RESOLVED: "Resuelto",
};

/** Contadores del summary en orden canónico, con label de producto. */
export const COMMUNICATIONS_SUMMARY_METRICS: Array<{
  key:
    | "dispatchesScheduledToday"
    | "deliveriesSentToday"
    | "deliveriesDeliveredToday"
    | "deliveriesFailedToday"
    | "planningIssuesOpen"
    | "inboundUnacknowledged";
  label: string;
}> = [
  { key: "dispatchesScheduledToday", label: "Programados hoy" },
  { key: "deliveriesSentToday", label: "Enviados hoy" },
  { key: "deliveriesDeliveredToday", label: "Entregados hoy" },
  { key: "deliveriesFailedToday", label: "Fallidos hoy" },
  { key: "planningIssuesOpen", label: "Inconvenientes de planificación" },
  { key: "inboundUnacknowledged", label: "Mensajes sin atender" },
];

/**
 * Enmascara un destino para mostrarlo en el Admin sin exponer PII completa.
 * La API entrega crudo el destino de los listados manage; la UI sólo lo
 * muestra enmascarado.
 */
export function maskChannelDestination(
  channel: RentalDeliveryChannel,
  value: string,
): string {
  if (channel === "EMAIL") {
    const at = value.indexOf("@");
    if (at <= 0) return maskPhone(value);
    return `${value.slice(0, 1)}***${value.slice(at)}`;
  }
  return maskPhone(value);
}

function maskPhone(value: string): string {
  if (value.length <= 7) return "*".repeat(value.length);
  return `${value.slice(0, 3)}${"*".repeat(
    Math.max(4, value.length - 7),
  )}${value.slice(-4)}`;
}

export type RetryFeedback = {
  variant: ToastVariant;
  message: string;
};

export type CommunicationsAttentionRow = {
  id: string;
  kind: "delivery" | "planning" | "inbound";
  kindLabel: string;
  kindBadge: BadgeVariant;
  detail: string;
  secondary: string | null;
  contractHref: string | null;
  occurredAt: string | null;
  statusLabel: string;
  statusBadge: BadgeVariant;
  deliveryId?: string;
  message?: RentalInboundMessage;
};

/**
 * Unifica las tres entidades "requieren atención" en una cola única.
 * Las entidades se mantienen explícitamente distintas (columna Tipo), pero
 * comparten tabla: no se finge que son la misma entidad.
 */
export function buildCommunicationsAttentionRows(input: {
  deliveries: RentalAttentionDeliveryItem[];
  planningIssues: RentalAttentionPlanningIssueItem[];
  inbound: RentalInboundMessage[];
}): CommunicationsAttentionRow[] {
  const rows: CommunicationsAttentionRow[] = [];

  for (const delivery of input.deliveries) {
    rows.push({
      id: delivery.id,
      kind: "delivery",
      kindLabel: "Envío fallido",
      kindBadge: "danger",
      detail: `${COMMUNICATION_CHANNEL_LABELS[delivery.channel]} a ${maskChannelDestination(
        delivery.channel,
        delivery.destinationSnapshot,
      )}`,
      secondary: null,
      contractHref: null,
      occurredAt: delivery.failedAt,
      statusLabel: COMMUNICATION_DELIVERY_STATUS_LABELS[delivery.status],
      statusBadge: DELIVERY_STATUS_BADGE_VARIANT[delivery.status],
      deliveryId: delivery.id,
    });
  }

  for (const issue of input.planningIssues) {
    rows.push({
      id: issue.id,
      kind: "planning",
      kindLabel: "Inconveniente de planificación",
      kindBadge: "warning",
      detail: PLANNING_ISSUE_TYPE_LABELS[issue.type] ?? issue.type,
      secondary: issue.channel
        ? `Canal: ${COMMUNICATION_CHANNEL_LABELS[issue.channel]}`
        : null,
      contractHref: issue.contractId ? `/alquileres/${issue.contractId}` : null,
      occurredAt: issue.lastDetectedAt,
      statusLabel: PLANNING_ISSUE_STATUS_LABELS[issue.status],
      statusBadge: "warning",
    });
  }

  for (const message of input.inbound) {
    rows.push({
      id: message.id,
      kind: "inbound",
      kindLabel: "Mensaje sin atender",
      kindBadge: "warning",
      detail: message.body || "Mensaje vacío",
      secondary: message.contact?.name ?? "Contacto no identificado",
      contractHref: message.contract
        ? `/alquileres/${message.contract.id}`
        : null,
      occurredAt: message.receivedAt,
      statusLabel: "Sin atender",
      statusBadge: "warning",
      message,
    });
  }

  rows.sort((a, b) => (b.occurredAt ?? "").localeCompare(a.occurredAt ?? ""));
  return rows;
}

/**
 * Convierte un día inclusive (Recibidos hasta: incluye todo el día) al
 * bound exclusivo (inicio del día siguiente) que espera la API. Devuelve ""
 * si el valor no es una fecha YYYY-MM-DD válida.
 */
export function inclusiveDayToExclusiveIso(day: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return "";
  const [, year, month, date] = match;
  const nextDay =
    Date.UTC(Number(year), Number(month) - 1, Number(date)) + 86_400_000;
  return new Date(nextDay).toISOString();
}

/** Feedback de producto para cada reason canónico de retry. */
export function retryDeliveryFeedback(
  reason: RentalRetryConflictReason | "NOT_FOUND",
): RetryFeedback {
  switch (reason) {
    case "NOT_FOUND":
      return {
        variant: "error",
        message: "El envío ya no existe o no corresponde a esta organización.",
      };
    case "NOT_FAILED":
      return {
        variant: "info",
        message: "El envío ya no está fallido y no requiere reintento.",
      };
    case "IN_FLIGHT":
      return {
        variant: "warning",
        message: "Ya hay un reintento en curso para este envío.",
      };
    case "MAX_ATTEMPTS":
      return {
        variant: "error",
        message: "Se alcanzó el máximo de reintentos permitidos.",
      };
    case "CONCURRENT":
      return {
        variant: "warning",
        message: "Otro operador está reintentando este envío.",
      };
  }
}
