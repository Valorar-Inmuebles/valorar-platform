import type { ReactNode } from "react";

import { mainLayoutCurrentUser } from "@/lib/auth/main-layout-user";
import { isSuperUsuario } from "@/lib/auth/super-tenant";
import { requireAuth } from "@/lib/auth/require-auth";
import MainLayout from "@/components/layout/MainLayout";

export const dynamic = "force-dynamic";

export default async function Layout({
  children,
}: {
  children: ReactNode;
}) {
  const ctx = await requireAuth();

  return (
    <MainLayout
      currentUser={mainLayoutCurrentUser(ctx)}
      isSuperUsuario={isSuperUsuario(ctx)}
      roles={ctx.roles}
      viewTenantId={ctx.view_tenant_id ?? null}
    >
      {children}
    </MainLayout>
  );
}