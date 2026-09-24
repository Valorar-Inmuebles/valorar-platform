/**
 * Rental Communications V1 — contratos de read model consumidos por el Admin
 * (C4C.1). Tipos puro de datos (sin runtime).
 *
 * Convenciones:
 * - Enums internos del dominio comunicados como unions de strings literales.
 * - `sender.address` y destinos llegan enmascarados desde la API.
 * - `externalReplyLink` es PII funcional: no loguear.
 */

export type RentalCommunicationsWindow = {
  from: string;
  to: string;
};

export type RentalCommunicationsSummary = {
  asOf: string;
  timeZone: string;
  window: RentalCommunicationsWindow;
  dispatchesScheduledToday: number;
  deliveriesSentToday: number;
  deliveriesDeliveredToday: number;
  deliveriesFailedToday: number;
  planningIssuesOpen: number;
  inboundUnacknowledged: number;
};

export type RentalReminderPolicy = {
  id: string;
  preDueEnabled: boolean;
  preDueDays: number;
  dueEnabled: boolean;
  postDueEnabled: boolean;
  postDueDays: number;
  sendTimeMinutes: number;
  timeZone: string;
  createdAt: string;
  updatedAt: string;
};

export type UpdateRentalReminderPolicy = Pick<
  RentalReminderPolicy,
  | "preDueEnabled"
  | "preDueDays"
  | "dueEnabled"
  | "postDueEnabled"
  | "postDueDays"
  | "sendTimeMinutes"
>;

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type RentalDeliveryChannel = "EMAIL" | "WHATSAPP" | "SMS";

export type RentalDeliveryStatus =
  | "PENDING"
  | "PROCESSING"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED"
  | "SKIPPED";

export type RentalInboundActorRef = {
  id: string;
  name: string;
};

export type RentalInboundContactRef = {
  id: string;
  name: string;
};

export type RentalInboundContractRef = {
  id: string;
  internalNumber: string;
};

export type RentalInboundMessage = {
  id: string;
  receivedAt: string;
  messageType: string;
  body: string;
  sender: { address: string };
  readAt: string | null;
  acknowledgedAt: string | null;
  acknowledgedBy: RentalInboundActorRef | null;
  contact: RentalInboundContactRef | null;
  contract: RentalInboundContractRef | null;
  deliveryCorrelated: boolean;
  /** Destino como enlace wa.me. PII funcional: no loguear. */
  externalReplyLink: string | null;
};

export type RentalInboundQuery = {
  contractId?: string;
  contactId?: string;
  receivedFrom?: string;
  receivedTo?: string;
  unread?: boolean;
  unacknowledged?: boolean;
  page?: number;
  pageSize?: number;
};

export type RentalInboundAttentionResult = {
  ok: true;
  messageId: string;
  readAt: string | null;
  acknowledgedAt: string | null;
  acknowledgedBy: RentalInboundActorRef | null;
  alreadyAcknowledged?: boolean;
};

// ---------------------------------------------------------------------------
// C4C.1 — Historial global de avisos (read model del centro operativo)
// ---------------------------------------------------------------------------

export type RentalDispatchEventType = "PRE_DUE" | "DUE" | "POST_DUE";

export type RentalDispatchStatus =
  | "PLANNED"
  | "READY"
  | "PROCESSING"
  | "COMPLETED"
  | "PARTIALLY_COMPLETED"
  | "FAILED"
  | "SKIPPED";

/** Intentos de envío embebidos en cada delivery (status del intento). */
export type RentalDispatchAttempt = {
  attemptNumber: number;
  status: "PROCESSING" | "ACCEPTED" | "FAILED";
  startedAt: string;
  finishedAt: string | null;
  latencyMs: number | null;
  error: {
    category: string | null;
    code: string | null;
    message: string | null;
  } | null;
};

/**
 * Respuesta entrante correlacionada por `CommunicationInboundMessage.deliveryId`
 * con el delivery saliente. Nunca se infiere una correlación que no exista.
 */
export type RentalDispatchResponse = {
  id: string;
  receivedAt: string;
  body: string | null;
  readAt: string | null;
  acknowledgedAt: string | null;
  acknowledgedBy: RentalInboundActorRef | null;
  contact: RentalInboundContactRef | null;
  /** Destino externo funcional para responder; no se reconstruye en Admin. */
  externalReplyLink: string | null;
};

/** Contenido congelado del envío (nunca se reconstruye desde datos actuales). */
export type RentalDispatchDeliveryContent = {
  subject: string | null;
  body: string | null;
  templateKey: string | null;
  templateVersion: string | null;
  templateRef: string | null;
};

export type RentalDispatchHistoryDelivery = {
  id: string;
  channel: RentalDeliveryChannel;
  status: RentalDeliveryStatus;
  /** Destino enmascarado (mismo criterio que el historial por contrato). */
  destination: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedAt: string | null;
  skippedAt: string | null;
  attemptCount: number;
  /** FAILED con intentos restantes bajo el máximo de la política (4). */
  retryEligible: boolean;
  error: {
    category: string | null;
    code: string | null;
    message: string | null;
  } | null;
  attempts: RentalDispatchAttempt[];
  responses: RentalDispatchResponse[];
  content: RentalDispatchDeliveryContent;
};

export type RentalDispatchRecipientRef = {
  contactId: string | null;
  name: string | null;
};

/** Concepto congelado en `contentSnapshot.occurrences` (para el panel). */
export type RentalDispatchConceptDetail = {
  conceptId: string | null;
  conceptName: string | null;
  dueDate: string | null;
  amount: string | null;
  currency: string | null;
  showAmount: boolean;
};

/** Parámetros congelados de política al planear el dispatch (sólo esta proyección). */
export type RentalDispatchPolicySnapshot = {
  timeZone: string | null;
  preDueEnabled: boolean;
  preDueDays: number;
  dueEnabled: boolean;
  postDueEnabled: boolean;
  postDueDays: number;
  sendTimeMinutes: number;
};

/** Fila del historial global: 1 dispatch con sus canales agrupados. */
export type RentalDispatchHistoryItem = {
  dispatchId: string;
  scheduledFor: string;
  eventType: RentalDispatchEventType;
  status: RentalDispatchStatus;
  dueDate: string | null;
  firstAttemptAt: string | null;
  completedAt: string | null;
  contract: RentalInboundContractRef;
  recipients: RentalDispatchRecipientRef[];
  /** Nombres de concepto únicos en orden congelado (celda compacta). */
  concepts: string[];
  conceptDetails: RentalDispatchConceptDetail[];
  /** Canales presentes en los deliveries, orden canónico EMAIL/WHATSAPP/SMS. */
  channels: RentalDeliveryChannel[];
  deliveries: RentalDispatchHistoryDelivery[];
  responsesCount: number;
  responsesPending: boolean;
  policy: RentalDispatchPolicySnapshot | null;
};

export type RentalDispatchHistorySortBy =
  | "scheduledFor"
  | "internalNumber"
  | "status"
  | "eventType";

export type RentalDispatchHistoryQuery = {
  /** Contrato específico; siempre queda acotado por la organización activa. */
  contractId?: string;
  /** Contrato (internalNumber) o destinatario/contacto. Nunca teléfono/email. */
  search?: string;
  eventType?: RentalDispatchEventType;
  /** Estado del dispatch (no de sus deliveries). */
  status?: RentalDispatchStatus;
  channel?: RentalDeliveryChannel;
  /** Ventana de programación `scheduledFor [from, to)`. */
  scheduledFrom?: string;
  scheduledTo?: string;
  /** Ventanas de delivery (`deliveries: { some }`); 1 ISN al menos coincide. */
  sentFrom?: string;
  sentTo?: string;
  deliveredFrom?: string;
  deliveredTo?: string;
  failedFrom?: string;
  failedTo?: string;
  sortBy?: RentalDispatchHistorySortBy;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

/** Fila cruda expuesta por GET /deliveries (endpoint manage-only). */
export type RentalAttentionDeliveryItem = {
  id: string;
  dispatchId: string;
  channel: RentalDeliveryChannel;
  status: RentalDeliveryStatus;
  destinationSnapshot: string;
  failedAt: string | null;
  attemptCount: number;
};

export type RentalPlanningIssueType =
  | "DUE_DATE_MISSING"
  | "DISPLAY_AMOUNT_MISSING"
  | "NO_ENABLED_ROUTE"
  | "CONTACT_POINT_INELIGIBLE"
  | "TENANT_TIME_ZONE_MISSING_OR_INVALID"
  | "PROVIDER_CONFIGURATION_INVALID"
  | "PROVIDER_TEMPLATE_INVALID"
  | "PLANNING_WINDOW_EXPIRED";

export type RentalPlanningIssueStatus = "OPEN" | "RESOLVED";

/** Fila cruda expuesta por GET /planning-issues (endpoint manage-only). */
export type RentalAttentionPlanningIssueItem = {
  id: string;
  contractId: string | null;
  occurrenceId: string | null;
  channel: RentalDeliveryChannel | null;
  type: RentalPlanningIssueType;
  status: RentalPlanningIssueStatus;
  lastDetectedAt: string;
};

export type RentalRetryDeliverySuccess = {
  ok: true;
  attemptCount: number;
  nextAttemptNumber: number;
  dispatchReopened: boolean;
};

export type RentalRetryConflictReason =
  | "NOT_FAILED"
  | "IN_FLIGHT"
  | "MAX_ATTEMPTS"
  | "CONCURRENT";

export type RentalRetryDeliveryFailure =
  | { ok: false; reason: "NOT_FOUND" }
  | { ok: false; reason: RentalRetryConflictReason };

export type RentalRetryDeliveryResult =
  | RentalRetryDeliverySuccess
  | RentalRetryDeliveryFailure;
