import { notFound, redirect } from "next/navigation";
import { RentalContractForm } from "@/components/rental/rental-contract-form";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { PageShell } from "@/components/shared/page-shell";
import { ApiError } from "@/lib/api/client";
import { mapUnknownError } from "@/lib/api/error-map";
import { listProperties } from "@/lib/api/property";
import { getRentalContract, listRentalContacts } from "@/lib/api/rental";
import { getActiveTenantId } from "@/lib/auth/active-tenant";
import { resolveActiveTenantGate } from "@/lib/auth/require-active-tenant";
import { getSession } from "@/lib/auth/session";
import { sessionHasPermission } from "@/lib/auth/types";
import { SuperAdminTenantEmptyState } from "@/components/shared/super-admin-tenant-empty-state";

export default async function AlquilerDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [session, activeTenantId] = await Promise.all([
    getSession(),
    getActiveTenantId(),
  ]);
  if (!session) redirect("/login");
  if (!sessionHasPermission(session.user, "rental.read")) redirect("/");
  const gate = resolveActiveTenantGate(session.user, activeTenantId);
  if (!gate.ok) {
    return (
      <PageShell title="Contrato de alquiler">
        <SuperAdminTenantEmptyState />
      </PageShell>
    );
  }
  const { id } = await params;
  try {
    const [contract, properties, contacts] = await Promise.all([
      getRentalContract(id),
      listProperties({ isActive: true }),
      listRentalContacts(),
    ]);
    return (
      <PageShell
        title="Contrato de alquiler"
        description={`Estado: ${contract.status}`}
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: "Alquileres", href: "/alquileres" },
          { label: contract.propertyAddressSnapshot },
        ]}
      >
        <RentalContractForm
          mode="edit"
          contract={contract}
          properties={properties}
          initialContacts={contacts}
          canUpdate={sessionHasPermission(
            session.user,
            "rental.contract.update",
          )}
          canEnd={sessionHasPermission(session.user, "rental.contract.end")}
        />
      </PageShell>
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    return (
      <PageShell title="Contrato de alquiler">
        <ApiErrorPanel message={mapUnknownError(error)} />
      </PageShell>
    );
  }
}
