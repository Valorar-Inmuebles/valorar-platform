import type {
  RentalAttentionDeliveryItem,
  RentalAttentionPlanningIssueItem,
  RentalCommunicationsSummary,
  RentalDeliveryChannel,
  RentalDeliveryStatus,
  RentalDispatchEventType,
  RentalDispatchStatus,
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
  kind: "delivery" | "planning";
  kindLabel: string;
  kindBadge: BadgeVariant;
  detail: string;
  secondary: string | null;
  contractHref: string | null;
  occurredAt: string | null;
  statusLabel: string;
  statusBadge: BadgeVariant;
  deliveryId?: string;
};

/**
 * Cola de excepciones del sistema de comunicaciones. Las respuestas entrantes
 * no pertenecen aquí: se gestionan exclusivamente en "Respuestas recibidas".
 */
export function buildCommunicationsAttentionRows(input: {
  deliveries: RentalAttentionDeliveryItem[];
  planningIssues: RentalAttentionPlanningIssueItem[];
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

// ---------------------------------------------------------------------------
// C4C.1 — Historial global de avisos
// ---------------------------------------------------------------------------

export const REMINDER_EVENT_LABELS: Record<RentalDispatchEventType, string> = {
  PRE_DUE: "Recordatorio previo",
  DUE: "Vencimiento",
  POST_DUE: "Recordatorio vencido",
};

export const DISPATCH_STATUS_LABELS: Record<RentalDispatchStatus, string> = {
  PLANNED: "Planificado",
  READY: "Listo",
  PROCESSING: "En proceso",
  COMPLETED: "Completado",
  PARTIALLY_COMPLETED: "Parcialmente completado",
  FAILED: "Fallido",
  SKIPPED: "Omitido",
};

export const DISPATCH_STATUS_BADGE_VARIANT: Record<
  RentalDispatchStatus,
  BadgeVariant
> = {
  PLANNED: "neutral",
  READY: "neutral",
  PROCESSING: "info",
  COMPLETED: "success",
  PARTIALLY_COMPLETED: "warning",
  FAILED: "danger",
  SKIPPED: "neutral",
};

export type DispatchStatusSummary = {
  label: string;
  variant: BadgeVariant;
  /** true cuando conviven entregas en estados distintos (multicanal). */
  mixed: boolean;
};

/**
 * Estado "multicanal" de un dispatch: si todas sus entregas comparten estado
 * se usa el label/badge único; si no, se agregan conteos por estado distintivo
 * ("1 entregado · 1 fallido"). Es el ÚNICO mapper de estado multicanal del
 * admin: la tabla y el panel lo consumen vía este helper.
 */
export function buildDispatchStatusSummary(
  statuses: Array<{ status: RentalDeliveryStatus }>,
): DispatchStatusSummary {
  if (statuses.length === 0) {
    return { label: "Sin envíos", variant: "neutral", mixed: false };
  }
  const first = statuses[0];
  if (!first) {
    return { label: "Sin envíos", variant: "neutral", mixed: false };
  }
  if (statuses.every((delivery) => delivery.status === first.status)) {
    return {
      label: COMMUNICATION_DELIVERY_STATUS_LABELS[first.status],
      variant: DELIVERY_STATUS_BADGE_VARIANT[first.status],
      mixed: false,
    };
  }
  const counts = new Map<RentalDeliveryStatus, number>();
  for (const { status } of statuses) {
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  const segments: string[] = [];
  for (const [status, count] of counts) {
    const base = COMMUNICATION_DELIVERY_STATUS_LABELS[status].toLowerCase();
    const plural =
      count > 1 && status !== "PROCESSING" && status !== "SKIPPED"
        ? `${base}s`
        : base;
    segments.push(`${count} ${plural}`);
  }
  const variant: BadgeVariant = statuses.some(
    (delivery) => delivery.status === "FAILED",
  )
    ? "danger"
    : statuses.some(
          (delivery) =>
            delivery.status === "PENDING" || delivery.status === "PROCESSING",
        )
      ? "warning"
      : "neutral";
  return { label: segments.join(" · "), variant, mixed: true };
}

/** "Alquiler" con un concepto; "Alquiler + varios" cuando hay más de uno. */
export function formatConceptsLabel(names: string[]): string {
  const [first, ...rest] = names;
  if (!first) return "—";
  if (rest.length === 0) return first;
  return `${first} + varios`;
}

/** Destinatarios compactos: nombre único o "+N más" (el ellipsis es del UI). */
export function formatRecipientsLabel(
  recipients: Array<{ name: string | null }>,
): string {
  const names = recipients
    .map((recipient) => recipient.name)
    .filter((name): name is string => Boolean(name));
  const [first, ...rest] = names;
  if (!first) return "—";
  if (rest.length === 0) return first;
  return `${first} +${rest.length} más`;
}

/**
 * Convierte un bound superior a exclusivo según su formato: un día
 * `YYYY-MM-DD` (inclusive Hasta) pasa a ISO del día siguiente; un ISO
 * completo (p. ej. `summary.window.to` desde un KPI) se reenvía tal cual.
 */
export function toExclusiveDayBound(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return inclusiveDayToExclusiveIso(value);
  }
  if (Number.isNaN(Date.parse(value))) return "";
  return value;
}

/** Claves de los 6 KPIs del "Resumen de hoy" (mismas del summary). */
export type CommunicationsSummaryMetricKey =
  | "dispatchesScheduledToday"
  | "deliveriesSentToday"
  | "deliveriesDeliveredToday"
  | "deliveriesFailedToday"
  | "planningIssuesOpen"
  | "inboundUnacknowledged";

/**
 * Href del filtro rápido de cada KPI (3×2). Las 4 métricas de ventana llevan
 * al Historial con la ventana real del día local; inconvenientes a la cola de
 * atención; mensajes sin atender a Respuestas con `unacknowledged`. Devuelve
 * null para la inversión KPI→vista que no corresponde (no debería pasar).
 */
export function buildHistoryQuickFilter(
  summary: RentalCommunicationsSummary,
  key: CommunicationsSummaryMetricKey,
): string | null {
  const { from, to } = summary.window;
  switch (key) {
    case "dispatchesScheduledToday":
      return `/alquileres/comunicaciones?tab=history&scheduledFrom=${encodeURIComponent(
        from,
      )}&scheduledTo=${encodeURIComponent(to)}`;
    case "deliveriesSentToday":
      return `/alquileres/comunicaciones?tab=history&sentFrom=${encodeURIComponent(
        from,
      )}&sentTo=${encodeURIComponent(to)}`;
    case "deliveriesDeliveredToday":
      return `/alquileres/comunicaciones?tab=history&deliveredFrom=${encodeURIComponent(
        from,
      )}&deliveredTo=${encodeURIComponent(to)}`;
    case "deliveriesFailedToday":
      return `/alquileres/comunicaciones?tab=history&failedFrom=${encodeURIComponent(
        from,
      )}&failedTo=${encodeURIComponent(to)}`;
    case "planningIssuesOpen":
      return "/alquileres/comunicaciones?tab=attention";
    case "inboundUnacknowledged":
      return "/alquileres/comunicaciones?tab=inbound&unacknowledged=true";
  }
}

/** Columnas del historial con su semántica responsive y de sorting. */
export type HistoryColumnKey =
  | "scheduledFor"
  | "eventType"
  | "contract"
  | "recipients"
  | "concepts"
  | "channels"
  | "status"
  | "responses"
  | "actions";

export type HistoryColumnDefinition = {
  key: HistoryColumnKey;
  label: string;
  /** Columnas que no se pueden ocultar (Fecha/hora, Estado, Acciones). */
  locked?: boolean;
  /** Clases aplicadas cuando la columna está visible (breakpoint de corte). */
  className?: string;
  /** Columna sortable: valor de `sortBy` que activa. `null` = no sort. */
  sortable?: "scheduledFor" | "internalNumber" | "status" | "eventType" | null;
  headerClassName?: string;
};

export const HISTORY_COLUMNS: HistoryColumnDefinition[] = [
  {
    key: "scheduledFor",
    label: "Fecha/hora",
    locked: true,
    sortable: "scheduledFor",
  },
  { key: "eventType", label: "Evento", sortable: "eventType" },
  {
    key: "contract",
    label: "Contrato",
    sortable: "internalNumber",
    className: "hidden sm:table-cell",
  },
  {
    key: "recipients",
    label: "Destinatario",
    className: "hidden md:table-cell",
  },
  {
    key: "concepts",
    label: "Conceptos",
    className: "hidden lg:table-cell",
  },
  {
    key: "channels",
    label: "Canales",
    className: "hidden md:table-cell",
  },
  { key: "status", label: "Estado", locked: true, sortable: "status" },
  {
    key: "responses",
    label: "Respuestas",
    className: "hidden lg:table-cell",
  },
  { key: "actions", label: "Acciones", locked: true },
];

/** Columnas que pueden alternarse desde "Columnas ▾" (las bloqueadas no). */
export const HISTORY_TOGGLEABLE_COLUMNS = HISTORY_COLUMNS.filter(
  (column) => !column.locked,
);

/** localStorage namespaced del selector de columnas. */
export const HISTORY_COLUMNS_STORAGE_KEY =
  "valar:rental-communications:history:columns";

export function historyColumnsFromStorage(
  raw: string | null,
): HistoryColumnKey[] {
  if (!raw) return HISTORY_COLUMNS.map((column) => column.key);
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return HISTORY_COLUMNS.map((column) => column.key);
    }
    const validKeys = new Set<string>(HISTORY_COLUMNS.map((c) => c.key));
    const filtered = parsed.filter(
      (key): key is HistoryColumnKey =>
        typeof key === "string" && validKeys.has(key),
    );
    if (filtered.length === 0) return HISTORY_COLUMNS.map((c) => c.key);
    return filtered;
  } catch {
    return HISTORY_COLUMNS.map((column) => column.key);
  }
}
