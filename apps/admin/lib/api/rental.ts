import { apiFetch } from "@/lib/api/client";
import type {
  CreateRentalContactPayload,
  CreateRentalContactPointPayload,
  CreateRentalContractPayload,
  RentalConcept,
  RentalContact,
  RentalContactPoint,
  RentalContract,
  RentalContractStatus,
  UpdateRentalContactPayload,
  UpdateRentalContactPointPayload,
  UpdateRentalContractPayload,
} from "@/lib/api/types/rental";

export function listRentalContracts(status?: RentalContractStatus) {
  const query = status ? `?status=${status}` : "";
  return apiFetch<RentalContract[]>(`/rental-contracts${query}`, {
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
