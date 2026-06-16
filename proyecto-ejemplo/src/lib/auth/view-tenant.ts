import { cookies, headers } from "next/headers";

import { contextRepository } from "@/BBDD/repositories/context.repository";
import { isSuperUsuario, SUPER_TENANT_ID } from "@/lib/auth/super-tenant";

export const VIEW_TENANT_COOKIE = "jx_view_tenant";
export const VIEW_TENANT_NOMBRE_COOKIE = "jx_view_tenant_nombre";

const VIEW_TENANT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const baseCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/** Rutas de configuración con operatoria global de super-tenant (sin view-tenant). */
const CONFIGURACION_SUPER_ADMIN_PREFIXES = [
  "/configuracion/usuarios",
  "/configuracion/tenants",
  "/configuracion/varios",
] as const;

export function isConfiguracionSuperAdminPath(pathname: string): boolean {
  if (pathname === "/configuracion") return true;
  return CONFIGURACION_SUPER_ADMIN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function needsViewTenantSelection(ctx: {
  home_tenant_id?: string | null;
  tenant_id?: string | null;
  view_tenant_id?: string | null;
}): boolean {
  return isSuperUsuario(ctx) && !ctx.view_tenant_id;
}

const CONFIGURACION_API_PREFIXES = [
  "/api/tenants",
  "/api/usuarios",
  "/api/me/view-tenant",
] as const;

export function isConfiguracionApiPath(pathname: string): boolean {
  return CONFIGURACION_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function refererPathname(referer: string | null): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).pathname;
  } catch {
    return null;
  }
}

export function shouldSkipViewTenant(
  pathname: string,
  referer: string | null,
): boolean {
  if (isConfiguracionSuperAdminPath(pathname)) return true;
  if (isConfiguracionApiPath(pathname)) return true;

  const refPath = refererPathname(referer);
  if (refPath && isConfiguracionSuperAdminPath(refPath)) return true;

  return false;
}

export async function getViewTenantIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(VIEW_TENANT_COOKIE)?.value?.trim();
  if (!value || value === SUPER_TENANT_ID) return null;
  return value;
}

export async function getViewTenantNombreFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(VIEW_TENANT_NOMBRE_COOKIE)?.value?.trim();
  return value || null;
}

export async function setViewTenantCookie(
  tenantId: string | null,
  tenantNombre?: string | null,
): Promise<void> {
  const cookieStore = await cookies();

  if (!tenantId) {
    cookieStore.delete(VIEW_TENANT_COOKIE);
    cookieStore.delete(VIEW_TENANT_NOMBRE_COOKIE);
    return;
  }

  cookieStore.set(VIEW_TENANT_COOKIE, tenantId, {
    ...baseCookieOptions,
    maxAge: VIEW_TENANT_COOKIE_MAX_AGE_SECONDS,
  });

  if (tenantNombre?.trim()) {
    cookieStore.set(VIEW_TENANT_NOMBRE_COOKIE, tenantNombre.trim(), {
      ...baseCookieOptions,
      maxAge: VIEW_TENANT_COOKIE_MAX_AGE_SECONDS,
    });
  } else {
    cookieStore.delete(VIEW_TENANT_NOMBRE_COOKIE);
  }
}

export async function getRequestPathContext(): Promise<{
  pathname: string;
  referer: string | null;
}> {
  const headersList = await headers();
  return {
    pathname: headersList.get("x-pathname") ?? "",
    referer: headersList.get("referer"),
  };
}

export type ViewTenantResolution = {
  view_tenant_id: string | null;
  view_tenant_nombre: string | null;
  effective_tenant_id: string | null;
  effective_tenant_nombre: string | null;
};

export async function resolveViewTenant(
  homeTenantId: string | null,
  tenantNombre: string | null,
): Promise<ViewTenantResolution> {
  const base: ViewTenantResolution = {
    view_tenant_id: null,
    view_tenant_nombre: null,
    effective_tenant_id: homeTenantId,
    effective_tenant_nombre: tenantNombre,
  };

  if (!isSuperUsuario({ tenant_id: homeTenantId })) {
    return base;
  }

  const cookieTenantId = await getViewTenantIdFromCookies();
  if (!cookieTenantId) {
    return base;
  }

  const cookieTenantNombre = await getViewTenantNombreFromCookies();
  let viewTenantNombre = cookieTenantNombre;

  if (!viewTenantNombre) {
    const viewTenant = await contextRepository.getTenantNombre(cookieTenantId);
    if (!viewTenant) {
      await setViewTenantCookie(null);
      return base;
    }
    viewTenantNombre = viewTenant.nombre;
  }

  const { pathname, referer } = await getRequestPathContext();
  const applyViewTenant = !shouldSkipViewTenant(pathname, referer);

  return {
    view_tenant_id: cookieTenantId,
    view_tenant_nombre: viewTenantNombre,
    effective_tenant_id: applyViewTenant ? cookieTenantId : homeTenantId,
    effective_tenant_nombre: applyViewTenant ? viewTenantNombre : tenantNombre,
  };
}
