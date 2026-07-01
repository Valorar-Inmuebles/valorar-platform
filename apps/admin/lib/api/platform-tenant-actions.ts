"use server";

import { revalidatePath } from "next/cache";
import {
  createPlatformTenant,
  reactivatePlatformTenant,
  suspendPlatformTenant,
  updatePlatformTenant,
} from "@/lib/api/platform-tenants";
import type {
  CreatePlatformTenantPayload,
  UpdatePlatformTenantPayload,
} from "@/lib/api/types/platform-tenant";
import { mapUnknownError } from "@/lib/api/error-map";

export async function createPlatformTenantAction(
  payload: CreatePlatformTenantPayload,
): Promise<{ ok: true; tenantId: string } | { ok: false; message: string }> {
  try {
    const tenant = await createPlatformTenant(payload);
    revalidatePath("/plataforma/tenants");
    return { ok: true, tenantId: tenant.id };
  } catch (error) {
    return { ok: false, message: mapUnknownError(error) };
  }
}

export async function updatePlatformTenantAction(
  id: string,
  payload: UpdatePlatformTenantPayload,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await updatePlatformTenant(id, payload);
    revalidatePath("/plataforma/tenants");
    revalidatePath(`/plataforma/tenants/${id}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: mapUnknownError(error) };
  }
}

export async function suspendPlatformTenantAction(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await suspendPlatformTenant(id);
    revalidatePath("/plataforma/tenants");
    revalidatePath(`/plataforma/tenants/${id}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: mapUnknownError(error) };
  }
}

export async function reactivatePlatformTenantAction(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await reactivatePlatformTenant(id);
    revalidatePath("/plataforma/tenants");
    revalidatePath(`/plataforma/tenants/${id}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: mapUnknownError(error) };
  }
}
