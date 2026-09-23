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
