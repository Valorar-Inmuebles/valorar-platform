import { unstable_cache, revalidateTag } from "next/cache";

import { queryRows } from "@/BBDD/base/query";

export type TenantListCacheRow = {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
};

const TENANT_LIST_CACHE_TAG = "tenant-list-all";
const TENANT_LIST_CACHE_KEY = "tenant-list-v1";

/** TTL de respaldo si no se invalida manualmente (1 h). */
const TENANT_LIST_REVALIDATE_SECONDS = 3600;

function isMissingColumnError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /column .* does not exist/i.test(error.message)
  );
}

async function queryTenantListUncached(): Promise<TenantListCacheRow[]> {
  try {
    return await queryRows<TenantListCacheRow>(
      `SELECT id, nombre, email, telefono FROM tenant ORDER BY nombre ASC`,
    );
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;
    try {
      const rows = await queryRows<{
        id: string;
        nombre: string;
        email: string | null;
      }>(`SELECT id, nombre, email FROM tenant ORDER BY nombre ASC`);
      return rows.map((row) => ({ ...row, telefono: null }));
    } catch (innerError) {
      if (!isMissingColumnError(innerError)) throw innerError;
      const rows = await queryRows<{ id: string; nombre: string }>(
        `SELECT id, nombre FROM tenant ORDER BY nombre ASC`,
      );
      return rows.map((row) => ({ ...row, email: null, telefono: null }));
    }
  }
}

export const getCachedTenantList = unstable_cache(
  queryTenantListUncached,
  [TENANT_LIST_CACHE_KEY],
  {
    revalidate: TENANT_LIST_REVALIDATE_SECONDS,
    tags: [TENANT_LIST_CACHE_TAG],
  },
);

export function invalidateTenantListCache(): void {
  revalidateTag(TENANT_LIST_CACHE_TAG, "max");
}
