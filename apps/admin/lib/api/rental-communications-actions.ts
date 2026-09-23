"use server";

import { revalidatePath } from "next/cache";
import { ApiError, apiFetch } from "@/lib/api/client";
import { mapRentalError } from "@/lib/api/error-map";
import type {
  RentalInboundAttentionResult,
  RentalRetryConflictReason,
  RentalRetryDeliverySuccess,
} from "@repo/shared-types";

function revalidateCommunications() {
  revalidatePath("/alquileres/comunicaciones");
  revalidatePath("/alquileres", "layout");
}

export type InboundActionStatus =
  | { ok: true; value: RentalInboundAttentionResult }
  | { ok: false; error: string };

export async function markInboundReadAction(
  messageId: string,
): Promise<InboundActionStatus> {
  try {
    const value = await apiFetch<RentalInboundAttentionResult>(
      `/rental-reminder-communications/inbound/${encodeURIComponent(
        messageId,
      )}/read`,
      { method: "POST", cache: "no-store" },
    );
    revalidateCommunications();
    return { ok: true, value };
  } catch (error) {
    return { ok: false, error: mapRentalError(error) };
  }
}

export async function acknowledgeInboundAction(
  messageId: string,
): Promise<InboundActionStatus> {
  try {
    const value = await apiFetch<RentalInboundAttentionResult>(
      `/rental-reminder-communications/inbound/${encodeURIComponent(
        messageId,
      )}/acknowledge`,
      { method: "POST", cache: "no-store" },
    );
    revalidateCommunications();
    return { ok: true, value };
  } catch (error) {
    return { ok: false, error: mapRentalError(error) };
  }
}

/**
 * Reintento manual de un delivery fallido. Devuelve el reason canónico
 * (404/409) cuando la API lo expone para que la UI muestre feedback puntual;
 * la endpoint NO dispara envío: reprograma para el próximo ciclo.
 */
export type RetryDeliveryActionStatus =
  | { ok: true; value: RentalRetryDeliverySuccess }
  | {
      ok: false;
      reason: RentalRetryConflictReason | "NOT_FOUND" | null;
      error: string;
    };

export async function retryDeliveryAction(
  deliveryId: string,
): Promise<RetryDeliveryActionStatus> {
  try {
    const value = await apiFetch<RentalRetryDeliverySuccess>(
      `/rental-reminder-communications/deliveries/${encodeURIComponent(
        deliveryId,
      )}/retry`,
      { method: "POST", cache: "no-store" },
    );
    revalidateCommunications();
    return { ok: true, value };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 404) {
        return { ok: false, reason: "NOT_FOUND", error: "" };
      }
      if (error.status === 409) {
        const body = error.body as { reason?: RentalRetryConflictReason };
        if (body?.reason) {
          return { ok: false, reason: body.reason, error: "" };
        }
      }
    }
    return { ok: false, reason: null, error: mapRentalError(error) };
  }
}
