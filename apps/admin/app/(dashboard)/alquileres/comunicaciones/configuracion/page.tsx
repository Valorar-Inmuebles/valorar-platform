import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@repo/ui/button";
import { RentalReminderPolicyForm } from "@/components/rental/communications/rental-reminder-policy-form";
import { RentalModuleNav } from "@/components/rental/rental-module-nav";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { PageShell } from "@/components/shared/page-shell";
import { SuperAdminTenantEmptyState } from "@/components/shared/super-admin-tenant-empty-state";
import { getRentalReminderPolicy } from "@/lib/api/rental-reminder-policy";
import { mapUnknownError } from "@/lib/api/error-map";
import { getActiveTenantId } from "@/lib/auth/active-tenant";
import { resolveActiveTenantGate } from "@/lib/auth/require-active-tenant";
import { getSession } from "@/lib/auth/session";
import { sessionHasPermission } from "@/lib/auth/types";

export default async function RentalCommunicationsSettingsPage() {
  const [session, activeTenantId] = await Promise.all([
    getSession(),
    getActiveTenantId(),
  ]);

  if (!session) redirect("/login");
  if (!sessionHasPermission(session.user, "rental.read")) redirect("/");

  const gate = resolveActiveTenantGate(session.user, activeTenantId);
  if (!gate.ok) {
    return (
      <PageShell title="Recordatorios automáticos" subNav={<RentalModuleNav />}>
        <SuperAdminTenantEmptyState />
      </PageShell>
    );
  }

  try {
    const policy = await getRentalReminderPolicy();
    const canManage = sessionHasPermission(
      session.user,
      "rental.reminder.manage",
    );

    return (
      <PageShell
        title="Recordatorios automáticos"
        description="Definí cuándo se planifican los avisos para toda la inmobiliaria."
        breadcrumbs={[
          { label: "Gestión de alquileres", href: "/alquileres" },
          { label: "Comunicaciones", href: "/alquileres/comunicaciones" },
          { label: "Configuración" },
        ]}
        actions={
          <Link href="/alquileres/comunicaciones">
            <Button type="button" variant="secondary">
              Volver a Comunicaciones
            </Button>
          </Link>
        }
        subNav={<RentalModuleNav />}
      >
        <div className="space-y-6">
          <div className="max-w-3xl text-sm text-muted">
            Los destinatarios, canales y conceptos se configuran por contrato.
          </div>
          <RentalReminderPolicyForm policy={policy} canManage={canManage} />
        </div>
      </PageShell>
    );
  } catch (error) {
    return (
      <PageShell
        title="Recordatorios automáticos"
        breadcrumbs={[
          { label: "Gestión de alquileres", href: "/alquileres" },
          { label: "Comunicaciones", href: "/alquileres/comunicaciones" },
          { label: "Configuración" },
        ]}
        subNav={<RentalModuleNav />}
      >
        <ApiErrorPanel message={mapUnknownError(error)} />
      </PageShell>
    );
  }
}
