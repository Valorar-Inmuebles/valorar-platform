import Link from "next/link";
import { Button } from "@repo/ui/button";
import { DashboardKpiGrid } from "@/components/dashboard/dashboard-kpi-grid";
import { DashboardPublishAlerts } from "@/components/dashboard/dashboard-publish-alerts";
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { PageShell } from "@/components/shared/page-shell";
import { SuperAdminTenantEmptyState } from "@/components/shared/super-admin-tenant-empty-state";
import { mapUnknownError } from "@/lib/api/error-map";
import { getDashboardSummary } from "@/lib/api/dashboard";
import { resolveActiveTenantGate } from "@/lib/auth/require-active-tenant";
import { getActiveTenantId } from "@/lib/auth/active-tenant";
import { getSession } from "@/lib/auth/session";

export default async function DashboardHomePage() {
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
      <PageShell title="Inicio">
        <SuperAdminTenantEmptyState />
      </PageShell>
    );
  }

  let summary;
  let errorMessage: string | null = null;

  try {
    summary = await getDashboardSummary();
  } catch (error) {
    errorMessage = mapUnknownError(error);
  }

  return (
    <PageShell
      title="Inicio"
      description={`Bienvenido, ${session.user.name}. Resumen operativo de tu inventario inmobiliario.`}
      actions={
        <Link href="/propiedades/crear">
          <Button>Nueva propiedad</Button>
        </Link>
      }
    >
      {errorMessage ? (
        <ApiErrorPanel message={errorMessage} />
      ) : summary ? (
        <div className="space-y-6">
          <DashboardKpiGrid kpis={summary.kpis} />
          <DashboardPublishAlerts alerts={summary.publishAlerts} />
          <div className="max-w-md">
            <DashboardQuickActions />
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
