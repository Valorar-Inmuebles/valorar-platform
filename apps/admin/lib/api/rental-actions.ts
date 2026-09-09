"use server";

import { revalidatePath } from "next/cache";
import { mapUnknownError } from "@/lib/api/error-map";
import {
  addRentalContactPoint,
  createRentalConcept,
  createRentalContact,
  createRentalContract,
  markRentalContactPointDefault,
  setRentalConceptActive,
  transitionRentalContract,
  updateRentalContact,
  updateRentalContactPoint,
  updateRentalContract,
} from "@/lib/api/rental";
import type {
  CreateRentalContactPayload,
  CreateRentalContactPointPayload,
  CreateRentalContractPayload,
  RentalConcept,
  RentalContact,
  RentalContactPoint,
  RentalContract,
  UpdateRentalContactPayload,
  UpdateRentalContactPointPayload,
  UpdateRentalContractPayload,
} from "@/lib/api/types/rental";

export type RentalActionResult<T = undefined> =
  | { ok: true; value: T }
  | { ok: false; error: string };

async function run<T>(
  operation: () => Promise<T>,
): Promise<RentalActionResult<T>> {
  try {
    return { ok: true, value: await operation() };
  } catch (error) {
    return { ok: false, error: mapUnknownError(error) };
  }
}

function revalidateRental(id?: string) {
  revalidatePath("/alquileres");
  if (id) revalidatePath(`/alquileres/${id}`);
}

export async function createRentalContractAction(
  payload: CreateRentalContractPayload,
) {
  const result = await run<RentalContract>(() => createRentalContract(payload));
  if (result.ok) revalidateRental(result.value.id);
  return result;
}

export async function updateRentalContractAction(
  id: string,
  payload: UpdateRentalContractPayload,
) {
  const result = await run<RentalContract>(() =>
    updateRentalContract(id, payload),
  );
  if (result.ok) revalidateRental(id);
  return result;
}

export async function transitionRentalContractAction(
  id: string,
  transition: "activate" | "end" | "cancel",
) {
  const result = await run<RentalContract>(() =>
    transitionRentalContract(id, transition),
  );
  if (result.ok) revalidateRental(id);
  return result;
}

export async function createRentalContactAction(
  payload: CreateRentalContactPayload,
) {
  const result = await run<RentalContact>(() => createRentalContact(payload));
  if (result.ok) revalidatePath("/alquileres");
  return result;
}

export async function updateRentalContactAction(
  id: string,
  payload: UpdateRentalContactPayload,
) {
  return run<RentalContact>(() => updateRentalContact(id, payload));
}

export async function addRentalContactPointAction(
  contactId: string,
  payload: CreateRentalContactPointPayload,
) {
  return run<RentalContactPoint>(() =>
    addRentalContactPoint(contactId, payload),
  );
}

export async function updateRentalContactPointAction(
  contactId: string,
  pointId: string,
  payload: UpdateRentalContactPointPayload,
) {
  return run<RentalContactPoint>(() =>
    updateRentalContactPoint(contactId, pointId, payload),
  );
}

export async function markRentalContactPointDefaultAction(
  contactId: string,
  pointId: string,
) {
  return run<RentalContactPoint>(() =>
    markRentalContactPointDefault(contactId, pointId),
  );
}

export async function createRentalConceptAction(payload: {
  name: string;
  slug: string;
}) {
  const result = await run<RentalConcept>(() => createRentalConcept(payload));
  if (result.ok) revalidatePath("/configuracion/conceptos-alquiler");
  return result;
}

export async function setRentalConceptActiveAction(
  id: string,
  isActive: boolean,
) {
  const result = await run<RentalConcept>(() =>
    setRentalConceptActive(id, isActive),
  );
  if (result.ok) revalidatePath("/configuracion/conceptos-alquiler");
  return result;
}
