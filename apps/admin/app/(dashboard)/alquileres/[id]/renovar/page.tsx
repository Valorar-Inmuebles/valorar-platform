import { notFound, redirect } from "next/navigation";
import { RentalContractRenewal } from "@/components/rental/rental-contract-renewal";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { PageShell } from "@/components/shared/page-shell";
import { SuperAdminTenantEmptyState } from "@/components/shared/super-admin-tenant-empty-state";
import { ApiError } from "@/lib/api/client";
import { mapUnknownError } from "@/lib/api/error-map";
import { getRentalContractGeneral } from "@/lib/api/rental";
import { getActiveTenantId } from "@/lib/auth/active-tenant";
import { resolveActiveTenantGate } from "@/lib/auth/require-active-tenant";
import { getSession } from "@/lib/auth/session";
import { sessionHasPermission } from "@/lib/auth/types";

const breadcrumbs = (contract?: { id: string; internalNumber: string }) => [
  { label: "Inicio", href: "/" },
  { label: "Gestión de alquileres", href: "/alquileres" },
  { label: "Contratos", href: "/alquileres/contratos" },
  ...(contract
    ? [{ label: contract.internalNumber, href: `/alquileres/${contract.id}` }]
    : []),
  { label: "Renovar contrato" },
];

export default async function RenovarContratoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [session, activeTenantId, route] = await Promise.all([
    getSession(),
    getActiveTenantId(),
    params,
  ]);
  if (!session) redirect("/login");
  const gate = resolveActiveTenantGate(session.user, activeTenantId);
  if (!gate.ok)
    return (
      <PageShell title="Renovar contrato">
        <SuperAdminTenantEmptyState />
      </PageShell>
    );

  if (!sessionHasPermission(session.user, "rental.contract.renew"))
    return (
      <PageShell title="Renovar contrato" breadcrumbs={breadcrumbs()}>
        <ApiErrorPanel
          title="Sin permiso para renovar"
          message="Tu rol no permite crear renovaciones de contratos."
        />
      </PageShell>
    );

  try {
    const contract = await getRentalContractGeneral(route.id);
    if (!["ACTIVE", "ENDED"].includes(contract.status))
      return (
        <PageShell title="Renovar contrato" breadcrumbs={breadcrumbs(contract)}>
          <ApiErrorPanel
            title="Este contrato no se puede renovar"
            message="La renovación está disponible para contratos activos o finalizados."
          />
        </PageShell>
      );

    return (
      <PageShell
        title="Renovar contrato"
        description="Se creará un nuevo contrato relacionado. El contrato actual y su historial se conservarán sin modificaciones."
        breadcrumbs={breadcrumbs(contract)}
      >
        <RentalContractRenewal contract={contract} />
      </PageShell>
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    return (
      <PageShell title="Renovar contrato">
        <ApiErrorPanel message={mapUnknownError(error)} />
      </PageShell>
    );
  }
}
