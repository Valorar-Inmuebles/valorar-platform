import { notFound, redirect } from "next/navigation";
import { RentalContractWizard } from "@/components/rental/rental-contract-wizard";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { PageShell } from "@/components/shared/page-shell";
import { SuperAdminTenantEmptyState } from "@/components/shared/super-admin-tenant-empty-state";
import { ApiError } from "@/lib/api/client";
import { mapUnknownError } from "@/lib/api/error-map";
import { getRentalContract } from "@/lib/api/rental";
import { getActiveTenantId } from "@/lib/auth/active-tenant";
import { resolveActiveTenantGate } from "@/lib/auth/require-active-tenant";
import { getSession } from "@/lib/auth/session";
import { sessionHasPermission } from "@/lib/auth/types";

export default async function EditarAlquilerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paso?: string }>;
}) {
  const [session, activeTenantId] = await Promise.all([
    getSession(),
    getActiveTenantId(),
  ]);
  if (!session) redirect("/login");
  if (!sessionHasPermission(session.user, "rental.contract.update"))
    redirect("/alquileres");
  const gate = resolveActiveTenantGate(session.user, activeTenantId);
  if (!gate.ok)
    return (
      <PageShell title="Editar contrato de alquiler">
        <SuperAdminTenantEmptyState />
      </PageShell>
    );

  const [{ id }, query] = await Promise.all([params, searchParams]);
  try {
    const contract = await getRentalContract(id);
    return (
      <PageShell
        title={`Editar contrato ${contract.internalNumber}`}
        description="Actualizá la información del contrato conservando un único flujo de edición."
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: "Gestión de alquileres", href: "/alquileres" },
          { label: "Contratos de alquiler", href: "/alquileres/contratos" },
          {
            label: contract.internalNumber,
            href: `/alquileres/${contract.id}`,
          },
          { label: "Editar" },
        ]}
      >
        <RentalContractWizard
          mode="edit"
          contract={contract}
          initialStep={query.paso === "2" ? 2 : 1}
        />
      </PageShell>
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    return (
      <PageShell title="Editar contrato de alquiler">
        <ApiErrorPanel message={mapUnknownError(error)} />
      </PageShell>
    );
  }
}
