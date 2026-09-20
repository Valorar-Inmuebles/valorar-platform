import { redirect } from "next/navigation";
import { RentalContractWizard } from "@/components/rental/rental-contract-wizard";
import { PageShell } from "@/components/shared/page-shell";
import { SuperAdminTenantEmptyState } from "@/components/shared/super-admin-tenant-empty-state";
import { getActiveTenantId } from "@/lib/auth/active-tenant";
import { resolveActiveTenantGate } from "@/lib/auth/require-active-tenant";
import { getSession } from "@/lib/auth/session";
import { sessionHasPermission } from "@/lib/auth/types";

export default async function CrearAlquilerPage() {
  const [session, activeTenantId] = await Promise.all([
    getSession(),
    getActiveTenantId(),
  ]);
  if (!session) redirect("/login");
  if (!sessionHasPermission(session.user, "rental.contract.create"))
    redirect("/alquileres");
  const gate = resolveActiveTenantGate(session.user, activeTenantId);
  if (!gate.ok)
    return (
      <PageShell title="Nuevo contrato de alquiler">
        <SuperAdminTenantEmptyState />
      </PageShell>
    );

  return (
    <PageShell
      title="Nuevo contrato de alquiler"
      description="Completá la información básica del contrato para continuar."
      breadcrumbs={[
        { label: "Inicio", href: "/" },
        { label: "Gestión de alquileres", href: "/alquileres" },
        { label: "Contratos de alquiler", href: "/alquileres/contratos" },
        { label: "Nuevo contrato" },
      ]}
    >
      <RentalContractWizard mode="create" />
    </PageShell>
  );
}
