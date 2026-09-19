import { redirect } from "next/navigation";
import { RentalContractForm } from "@/components/rental/rental-contract-form";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { PageShell } from "@/components/shared/page-shell";
import { SuperAdminTenantEmptyState } from "@/components/shared/super-admin-tenant-empty-state";
import { mapUnknownError } from "@/lib/api/error-map";
import { listProperties } from "@/lib/api/property";
import { listRentalContacts } from "@/lib/api/rental";
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
      <PageShell title="Nuevo contrato">
        <SuperAdminTenantEmptyState />
      </PageShell>
    );

  try {
    const [properties, contacts] = await Promise.all([
      listProperties(),
      listRentalContacts({ isActive: true }),
    ]);
    return (
      <PageShell
        title="Nuevo contrato"
        description="Se guardará como borrador hasta que completes y valides las partes."
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: "Alquileres", href: "/alquileres" },
          { label: "Nuevo" },
        ]}
      >
        <RentalContractForm
          mode="create"
          properties={properties}
          initialContacts={contacts}
        />
      </PageShell>
    );
  } catch (error) {
    return (
      <PageShell title="Nuevo contrato">
        <ApiErrorPanel message={mapUnknownError(error)} />
      </PageShell>
    );
  }
}
