import Link from "next/link";
import { Button } from "@repo/ui/button";
import { DevelopmentForm } from "@/components/development/development-form";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { PageShell } from "@/components/shared/page-shell";
import { SuperAdminTenantEmptyState } from "@/components/shared/super-admin-tenant-empty-state";
import { mapUnknownError } from "@/lib/api/error-map";
import { resolveActiveTenantGate } from "@/lib/auth/require-active-tenant";
import { getActiveTenantId } from "@/lib/auth/active-tenant";
import { getSession } from "@/lib/auth/session";
import { developmentCreateBreadcrumbs } from "@/lib/development/breadcrumbs";

export default async function EmprendimientoCrearPage() {
  const [session, activeTenantId] = await Promise.all([
    getSession(),
    getActiveTenantId(),
  ]);

  if (!session) {
    return null;
  }

  const tenantGate = resolveActiveTenantGate(session.user, activeTenantId);
  if (!tenantGate.ok) {
    return (
      <PageShell
        title="Nuevo emprendimiento"
        breadcrumbs={developmentCreateBreadcrumbs()}
      >
        <SuperAdminTenantEmptyState />
      </PageShell>
    );
  }

  try {
    return (
      <PageShell
        title="Nuevo emprendimiento"
        description="Completá los datos principales del emprendimiento."
        breadcrumbs={developmentCreateBreadcrumbs()}
        actions={
          <Link href="/emprendimientos">
            <Button variant="secondary">Volver al listado</Button>
          </Link>
        }
      >
        <DevelopmentForm mode="create" />
      </PageShell>
    );
  } catch (error) {
    return (
      <PageShell
        title="Nuevo emprendimiento"
        breadcrumbs={developmentCreateBreadcrumbs()}
      >
        <ApiErrorPanel message={mapUnknownError(error)} />
      </PageShell>
    );
  }
}
