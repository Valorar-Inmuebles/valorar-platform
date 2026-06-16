import { cache } from "react";
import { revalidateTag, unstable_cache } from "next/cache";

import {
  contextRepository,
  type ContextBundleRow,
} from "@/BBDD/repositories/context.repository";
import { sesionRepository } from "@/BBDD/auth/sesion.repository";
import { UsuarioNoHabilitadoError } from "@/lib/auth/errors";
import { resolveViewTenant } from "@/lib/auth/view-tenant";
import { getAccessPayloadFromCookies } from "@/lib/auth/server-session";
import type { AuthUser } from "@/lib/auth/types";

type PersonaNombreRow = {
  tipo?: string | null;
  nombre?: string | null;
  apellido?: string | null;
};

type DbContextCacheEntry = {
  expiresAt: number;
  usuario: {
    id: string;
    tenant_id: string | null;
    foto_url: string | null;
    persona: PersonaNombreRow | null;
  };
  tenant_id: string | null;
  roles: string[];
  is_superadmin: boolean;
  displayName: string;
  tenant: { nombre: string } | null;
  user: AuthUser;
};

const dbContextCache = new Map<string, DbContextCacheEntry>();
const pendingContextLoads = new Map<string, Promise<ContextBundleRow | null>>();

function contextCacheTag(userId: string): string {
  return `server-context-${userId}`;
}

function getContextCacheTtlSeconds(): number {
  const seconds = Number.parseInt(process.env.CONTEXT_CACHE_TTL_SECONDS ?? "60", 10);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 60;
}

function getContextCacheTtlMs(): number {
  return getContextCacheTtlSeconds() * 1000;
}

function personaDisplayName(persona: PersonaNombreRow | null): string {
  if (!persona) return "Usuario";
  if (persona.tipo === "juridica") {
    return (persona.nombre ?? "").trim() || "Usuario";
  }
  const full = [persona.nombre, persona.apellido].filter(Boolean).join(" ").trim();
  return full || "Usuario";
}

function getCachedDbContext(userId: string): DbContextCacheEntry | null {
  const cached = dbContextCache.get(userId);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    dbContextCache.delete(userId);
    return null;
  }
  return cached;
}

function setCachedDbContext(userId: string, entry: Omit<DbContextCacheEntry, "expiresAt">) {
  dbContextCache.set(userId, {
    ...entry,
    expiresAt: Date.now() + getContextCacheTtlMs(),
  });
}

function bundleToCacheEntry(
  bundle: ContextBundleRow,
  user: AuthUser,
): Omit<DbContextCacheEntry, "expiresAt"> {
  const tenant_id = bundle.tenant_id ?? null;
  const roles = bundle.roles;
  return {
    user,
    usuario: {
      id: bundle.id,
      tenant_id,
      foto_url: bundle.foto_url ?? null,
      persona: bundle.persona,
    },
    tenant_id,
    roles,
    is_superadmin: roles.includes("superadmin"),
    displayName: personaDisplayName(bundle.persona),
    tenant: bundle.tenant,
  };
}

function getContextBundleFromNextCache(userId: string): Promise<ContextBundleRow | null> {
  return unstable_cache(
    () => contextRepository.getContextByUserId(userId),
    ["server-context-bundle-v1", userId],
    {
      revalidate: getContextCacheTtlSeconds(),
      tags: [contextCacheTag(userId)],
    },
  )();
}

async function loadContextBundle(userId: string): Promise<ContextBundleRow | null> {
  const pending = pendingContextLoads.get(userId);
  if (pending) return pending;

  const loadPromise = getContextBundleFromNextCache(userId).finally(() => {
    pendingContextLoads.delete(userId);
  });

  pendingContextLoads.set(userId, loadPromise);
  return loadPromise;
}

async function resolveServerContext() {
  const access = await getAccessPayloadFromCookies();

  if (!access) {
    throw new Error("No autenticado");
  }

  const sessionActive = await sesionRepository.isActive(access.sid);
  if (!sessionActive) {
    throw new Error("No autenticado");
  }

  const user: AuthUser = {
    id: access.sub,
    email: access.email,
  };

  const cachedDb = getCachedDbContext(user.id);
  const baseContext = cachedDb
    ? {
        user: cachedDb.user,
        usuario: cachedDb.usuario,
        displayName: cachedDb.displayName,
        tenant_id: cachedDb.tenant_id,
        roles: cachedDb.roles,
        is_superadmin: cachedDb.is_superadmin,
        tenant: cachedDb.tenant,
      }
    : null;

  if (!baseContext) {
    const bundle = await loadContextBundle(user.id);
    if (!bundle) {
      throw new UsuarioNoHabilitadoError();
    }

    const cacheEntry = bundleToCacheEntry(bundle, user);
    setCachedDbContext(user.id, cacheEntry);

    return finalizeServerContext({
      user: cacheEntry.user,
      usuario: cacheEntry.usuario,
      displayName: cacheEntry.displayName,
      tenant_id: cacheEntry.tenant_id,
      roles: cacheEntry.roles,
      is_superadmin: cacheEntry.is_superadmin,
      tenant: cacheEntry.tenant,
    });
  }

  return finalizeServerContext(baseContext);
}

async function finalizeServerContext(context: {
  user: AuthUser;
  usuario: DbContextCacheEntry["usuario"];
  displayName: string;
  tenant_id: string | null;
  roles: string[];
  is_superadmin: boolean;
  tenant: { nombre: string } | null;
}) {
  const homeTenantId = context.tenant_id;
  const viewTenant = await resolveViewTenant(
    homeTenantId,
    context.tenant?.nombre ?? null,
  );

  return {
    ...context,
    home_tenant_id: homeTenantId,
    tenant_id: viewTenant.effective_tenant_id,
    tenant: viewTenant.effective_tenant_nombre
      ? { nombre: viewTenant.effective_tenant_nombre }
      : context.tenant,
    view_tenant_id: viewTenant.view_tenant_id,
    view_tenant_nombre: viewTenant.view_tenant_nombre,
  };
}

/** Contexto de servidor: React.cache por request + TTL in-process + unstable_cache entre requests. */
export const getServerContext = cache(resolveServerContext);

/** Invalida cache de contexto (p. ej. tras cambiar roles o tenant del usuario). */
export function invalidateServerContextCache(userId?: string): void {
  if (userId) {
    dbContextCache.delete(userId);
    pendingContextLoads.delete(userId);
    revalidateTag(contextCacheTag(userId), "max");
    return;
  }

  dbContextCache.clear();
  pendingContextLoads.clear();
}
