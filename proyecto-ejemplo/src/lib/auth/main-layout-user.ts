import type { MainLayoutCurrentUser } from "@/components/layout/MainLayout";
import type { getServerContext } from "@/lib/server/context/getServerContext";

export function mainLayoutCurrentUser(
  ctx: Awaited<ReturnType<typeof getServerContext>>,
): MainLayoutCurrentUser {
  return {
    id: ctx.user.id,
    name: ctx.displayName,
    email: ctx.user.email ?? "",
    has_foto: Boolean(ctx.usuario.foto_url),
  };
}
