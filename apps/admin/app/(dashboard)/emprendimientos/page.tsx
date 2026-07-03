import Link from "next/link";
import { Button } from "@repo/ui/button";
import { DevelopmentEmptyState } from "@/components/development/development-empty-state";
import { DevelopmentListView } from "@/components/development/development-list-view";
import { SuperAdminTenantEmptyState } from "@/components/shared/super-admin-tenant-empty-state";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { PageShell } from "@/components/shared/page-shell";
import { mapUnknownError } from "@/lib/api/error-map";
import { listDevelopments } from "@/lib/api/development";
import { resolveActiveTenantGate } from "@/lib/auth/require-active-tenant";
import { getActiveTenantId } from "@/lib/auth/active-tenant";
import { getSession } from "@/lib/auth/session";
import { developmentListBreadcrumbs } from "@/lib/development/breadcrumbs";

export default async function EmprendimientosPage() {
  const [session, activeTenantId] = await Promise.all([
    getSession(),
    getActiveTenantId(),
  ]);

  const tenantGate = session
    ? resolveActiveTenantGate(session.user, activeTenantId)
    : { ok: true as const };

  if (!tenantGate.ok) {
    return (
      <PageShell
        title="Emprendimientos"
        breadcrumbs={developmentListBreadcrumbs()}
      >
        <SuperAdminTenantEmptyState />
      </PageShell>
    );
  }

  let developments;
  let errorMessage: string | null = null;

  try {
    developments = await listDevelopments();
  } catch (error) {
    errorMessage = mapUnknownError(error);
  }

  return (
    <PageShell
      title="Emprendimientos"
      breadcrumbs={developmentListBreadcrumbs()}
      actions={
        <Link href="/emprendimientos/crear">
          <Button>Nuevo emprendimiento</Button>
        </Link>
      }
    >
      {errorMessage ? (
        <ApiErrorPanel message={errorMessage} />
      ) : developments && developments.length === 0 ? (
        <DevelopmentEmptyState
          title="Sin emprendimientos todavía"
          description="Creá el primer emprendimiento del tenant para comenzar a gestionar unidades e imágenes."
          action={
            <Link href="/emprendimientos/crear">
              <Button>Nuevo emprendimiento</Button>
            </Link>
          }
        />
      ) : developments ? (
        <DevelopmentListView developments={developments} />
      ) : null}
    </PageShell>
  );
}
