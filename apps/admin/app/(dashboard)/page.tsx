import Link from "next/link";
import { DashboardAttentionAlertsPanel } from "@/components/dashboard/dashboard-attention-alerts-panel";
import { DashboardCatalogHealthGrid } from "@/components/dashboard/dashboard-catalog-health-grid";
import { DashboardKpiGrid } from "@/components/dashboard/dashboard-kpi-grid";
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions";
import { DashboardRecentActivity } from "@/components/dashboard/dashboard-recent-activity";
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

  const pendingAttention =
    summary &&
    Object.values(summary.attentionAlerts).reduce(
      (total, count) => total + count,
      0,
    );

  return (
    <PageShell
      title="Inicio"
      description="Centro operativo de tu inventario inmobiliario."
      actions={
        <Link
          href="/propiedades/crear"
          className="inline-flex items-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          Nueva propiedad
        </Link>
      }
    >
      {errorMessage ? (
        <ApiErrorPanel message={errorMessage} />
      ) : summary ? (
        <div className="space-y-8">
          <section className="space-y-2">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Resumen
              </h2>
              <p className="text-xs text-muted">
                Hola {session.user.name}.{" "}
                {pendingAttention
                  ? `${pendingAttention} alerta${pendingAttention === 1 ? "" : "s"} requieren atención.`
                  : "Tu catálogo está al día."}
              </p>
            </div>
            <DashboardKpiGrid kpis={summary.kpis} />
          </section>

          <DashboardCatalogHealthGrid catalogHealth={summary.catalogHealth} />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <DashboardAttentionAlertsPanel alerts={summary.attentionAlerts} />
            <DashboardRecentActivity items={summary.recentActivity} />
          </div>

          <DashboardQuickActions />

          {/*
            Future metrics row (Leads, Visitas, Consultas, Agentes, Analytics)
            will slot below Quick Actions without changing the grid above.
          */}
        </div>
      ) : null}
    </PageShell>
  );
}
