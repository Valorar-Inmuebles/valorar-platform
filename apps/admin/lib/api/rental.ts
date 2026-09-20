import { apiFetch } from "@/lib/api/client";
import type {
  CreateRentalContactPayload,
  CreateRentalContactPointPayload,
  CreateRentalContractPayload,
  RentalConcept,
  RentalContact,
  RentalContactPoint,
  RentalContactSearchItem,
  RentalPropertySearchItem,
  RentalContract,
  RentalContractListItem,
  RentalContractListQuery,
  RentalDashboard,
  PaginatedResponse,
  UpdateRentalContactPayload,
  UpdateRentalContactPointPayload,
  UpdateRentalContractPayload,
  CreateRentalObligationPayload,
  RentalObligation,
  RentalOccurrence,
  RentalOccurrenceStatus,
  UpdateRentalObligationPayload,
} from "@/lib/api/types/rental";

export function listRentalContracts(options: RentalContractListQuery = {}) {
  const query = new URLSearchParams();
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const suffix = query.size ? `?${query.toString()}` : "";
  return apiFetch<PaginatedResponse<RentalContractListItem>>(
    `/rental-contracts${suffix}`,
    { cache: "no-store" },
  );
}

export function getRentalDashboard() {
  return apiFetch<RentalDashboard>("/rental-contracts/dashboard", {
    cache: "no-store",
  });
}

export function renewRentalContract(id: string) {
  return apiFetch<RentalContract>(`/rental-contracts/${id}/renew`, {
    method: "POST",
    cache: "no-store",
  });
}

export function listRentalObligations(contractId: string) {
  return apiFetch<RentalObligation[]>(
    `/rental-obligations?contractId=${encodeURIComponent(contractId)}`,
    { cache: "no-store" },
  );
}

export function createRentalObligation(payload: CreateRentalObligationPayload) {
  return apiFetch<RentalObligation>("/rental-obligations", {
    method: "POST",
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

export function updateRentalObligation(
  id: string,
  payload: UpdateRentalObligationPayload,
) {
  return apiFetch<RentalObligation>(`/rental-obligations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

export function materializeRentalObligation(id: string) {
  return apiFetch<RentalOccurrence[]>(`/rental-obligations/${id}/materialize`, {
    method: "POST",
    cache: "no-store",
  });
}

export function createRentAdjustment(
  id: string,
  payload: {
    effectiveFrom: string;
    amount: number;
    currency: "ARS" | "USD";
    reason?: string | null;
  },
) {
  return apiFetch(`/rental-obligations/${id}/rent-adjustments`, {
    method: "POST",
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

export function listRentalOccurrences(
  options: {
    contractId?: string;
    status?: RentalOccurrenceStatus;
    dueFrom?: string;
    dueTo?: string;
    month?: string;
    category?: "ALL" | "RENT" | "OTHER" | "OVERDUE";
    conceptId?: string;
    search?: string;
    sortBy?: "dueDate" | "internalNumber" | "concept" | "amount" | "status";
    sortOrder?: "asc" | "desc";
    page?: number;
    pageSize?: number;
  } = {},
) {
  const query = new URLSearchParams();
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const suffix = query.size ? `?${query.toString()}` : "";
  return apiFetch<PaginatedResponse<RentalOccurrence>>(
    `/rental-occurrences${suffix}`,
    { cache: "no-store" },
  );
}

export function updateRentalOccurrenceAmount(
  id: string,
  amount: number | null,
) {
  return apiFetch<RentalOccurrence>(`/rental-occurrences/${id}/amount`, {
    method: "PATCH",
    body: JSON.stringify({ amount }),
    cache: "no-store",
  });
}

export function updateRentalOccurrenceDueDate(id: string, dueDate: string) {
  return apiFetch<RentalOccurrence>(`/rental-occurrences/${id}/due-date`, {
    method: "PATCH",
    body: JSON.stringify({ dueDate }),
    cache: "no-store",
  });
}

export function recordRentalFulfillment(
  occurrenceId: string,
  payload: {
    fulfilledOn: string;
    amount?: number | null;
    notes?: string | null;
  },
) {
  return apiFetch<{ occurrence: RentalOccurrence }>(
    `/rental-occurrences/${occurrenceId}/fulfillments`,
    { method: "POST", body: JSON.stringify(payload), cache: "no-store" },
  );
}

export function reverseRentalFulfillment(id: string, reason: string) {
  return apiFetch<RentalOccurrence>(`/rental-fulfillments/${id}/reverse`, {
    method: "POST",
    body: JSON.stringify({ reason }),
    cache: "no-store",
  });
}

export function getRentalContract(id: string) {
  return apiFetch<RentalContract>(`/rental-contracts/${id}`, {
    cache: "no-store",
  });
}

export function createRentalContract(payload: CreateRentalContractPayload) {
  return apiFetch<RentalContract>("/rental-contracts", {
    method: "POST",
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

export function updateRentalContract(
  id: string,
  payload: UpdateRentalContractPayload,
) {
  return apiFetch<RentalContract>(`/rental-contracts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

export function transitionRentalContract(
  id: string,
  transition: "activate" | "end" | "cancel",
) {
  return apiFetch<RentalContract>(`/rental-contracts/${id}/${transition}`, {
    method: "POST",
    cache: "no-store",
  });
}

export function listRentalContacts(
  options: { isActive?: boolean; search?: string } = {},
) {
  const query = new URLSearchParams();
  if (options.isActive !== undefined)
    query.set("isActive", String(options.isActive));
  if (options.search) query.set("search", options.search);
  const suffix = query.size ? `?${query.toString()}` : "";
  return apiFetch<RentalContact[]>(`/contacts${suffix}`, { cache: "no-store" });
}

export function searchRentalProperties(search: string, pageSize = 12) {
  const query = new URLSearchParams({
    search,
    page: "1",
    pageSize: String(pageSize),
  });
  return apiFetch<PaginatedResponse<RentalPropertySearchItem>>(
    `/properties/rental-search?${query.toString()}`,
    { cache: "no-store" },
  );
}

export function searchRentalContacts(search: string, pageSize = 12) {
  const query = new URLSearchParams({
    search,
    isActive: "true",
    page: "1",
    pageSize: String(pageSize),
  });
  return apiFetch<PaginatedResponse<RentalContactSearchItem>>(
    `/contacts/rental-search?${query.toString()}`,
    { cache: "no-store" },
  );
}

export function getRentalContact(id: string) {
  return apiFetch<RentalContact>(`/contacts/${id}`, { cache: "no-store" });
}
export function createRentalContact(payload: CreateRentalContactPayload) {
  return apiFetch<RentalContact>("/contacts", {
    method: "POST",
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

export function updateRentalContact(
  id: string,
  payload: UpdateRentalContactPayload,
) {
  return apiFetch<RentalContact>(`/contacts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

export function addRentalContactPoint(
  contactId: string,
  payload: CreateRentalContactPointPayload,
) {
  return apiFetch<RentalContactPoint>(`/contacts/${contactId}/points`, {
    method: "POST",
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

export function updateRentalContactPoint(
  contactId: string,
  pointId: string,
  payload: UpdateRentalContactPointPayload,
) {
  return apiFetch<RentalContactPoint>(
    `/contacts/${contactId}/points/${pointId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );
}

export function markRentalContactPointDefault(
  contactId: string,
  pointId: string,
) {
  return apiFetch<RentalContactPoint>(
    `/contacts/${contactId}/points/${pointId}/default`,
    { method: "POST", cache: "no-store" },
  );
}

export function listRentalConcepts(includeInactive = false) {
  return apiFetch<RentalConcept[]>(
    includeInactive ? "/rental-concepts/all" : "/rental-concepts",
    { cache: "no-store" },
  );
}

export function createRentalConcept(payload: { name: string; slug: string }) {
  return apiFetch<RentalConcept>("/rental-concepts", {
    method: "POST",
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

export function setRentalConceptActive(id: string, isActive: boolean) {
  return apiFetch<RentalConcept>(`/rental-concepts/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
    cache: "no-store",
  });
}
