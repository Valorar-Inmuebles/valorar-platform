import { apiFetch } from "@/lib/api/client";
import type {
  PaginatedResponse,
  RentalAttentionDeliveryItem,
  RentalAttentionPlanningIssueItem,
  RentalCommunicationsSummary,
  RentalDispatchHistoryItem,
  RentalDispatchHistoryQuery,
  RentalInboundMessage,
  RentalInboundQuery,
} from "@repo/shared-types";

function queryString(
  options: Record<string, string | number | boolean | undefined>,
) {
  const query = new URLSearchParams();
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return query.size ? `?${query.toString()}` : "";
}

export function getRentalCommunicationsSummary() {
  return apiFetch<RentalCommunicationsSummary>(
    "/rental-reminder-communications/summary",
    { cache: "no-store" },
  );
}

/**
 * Historial global (C4C.1): fila = dispatch con canales agrupados.
 * Filtros/sort/paginación server-side; `scheduledTo` y ventanas `*To` son
 * bounds exclusivos ya resueltos por la página antes de llamar.
 */
export function listRentalHistory(
  query: RentalDispatchHistoryQuery = {},
): Promise<PaginatedResponse<RentalDispatchHistoryItem>> {
  return apiFetch(
    `/rental-reminder-communications/history${queryString(query)}`,
    { cache: "no-store" },
  );
}

export function listRentalInbound(
  query: RentalInboundQuery = {},
): Promise<PaginatedResponse<RentalInboundMessage>> {
  return apiFetch(
    `/rental-reminder-communications/inbound${queryString(query)}`,
    { cache: "no-store" },
  );
}

/** Endpoint manage-only: filas crudas de deliveries fallidos (cola global). */
export function listFailedDeliveries(pageSize = 10) {
  return apiFetch<PaginatedResponse<RentalAttentionDeliveryItem>>(
    `/rental-reminder-communications/deliveries?status=FAILED&pageSize=${pageSize}`,
    { cache: "no-store" },
  );
}

/** Endpoint manage-only: filas crudas de planning issues abiertos (cola global). */
export function listOpenPlanningIssues(pageSize = 10) {
  return apiFetch<PaginatedResponse<RentalAttentionPlanningIssueItem>>(
    `/rental-reminder-communications/planning-issues?status=OPEN&pageSize=${pageSize}`,
    { cache: "no-store" },
  );
}
