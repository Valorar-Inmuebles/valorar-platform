import { cache } from "react";

import { getServerContext } from "@/lib/server/context/getServerContext";
import type { ServerContext } from "@/lib/server/context/types";

async function resolveOptionalServerContext(): Promise<ServerContext | null> {
  try {
    return await getServerContext();
  } catch {
    return null;
  }
}

/** Contexto de servidor sin redirigir ni lanzar si no hay sesión. */
export const getOptionalServerContext = cache(resolveOptionalServerContext);
