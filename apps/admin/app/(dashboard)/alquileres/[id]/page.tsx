import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@repo/ui/button";
import { RentalContractForm } from "@/components/rental/rental-contract-form";
import { RentalObligationManager } from "@/components/rental/rental-obligation-manager";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { PageShell } from "@/components/shared/page-shell";
import { SuperAdminTenantEmptyState } from "@/components/shared/super-admin-tenant-empty-state";
import { ApiError } from "@/lib/api/client";
import { mapUnknownError } from "@/lib/api/error-map";
import {
  getRentalContract,
  listRentalConcepts,
  listRentalObligations,
  listRentalOccurrences,
} from "@/lib/api/rental";
import { getActiveTenantId } from "@/lib/auth/active-tenant";
import { resolveActiveTenantGate } from "@/lib/auth/require-active-tenant";
import { getSession } from "@/lib/auth/session";
import { sessionHasPermission } from "@/lib/auth/types";

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
    const [contract, concepts, obligations, occurrences] = await Promise.all([
      getRentalContract(id),
      listRentalConcepts(),
      listRentalObligations(id),
      listRentalOccurrences({ contractId: id, pageSize: 100 }),
    ]);
    const canUpdate =
      sessionHasPermission(session.user, "rental.contract.update") &&
      ["DRAFT", "ACTIVE"].includes(contract.status);
    return (
      <PageShell
        title={`Contrato ${contract.internalNumber}`}
        description={`Estado: ${{ DRAFT: "Borrador", ACTIVE: "Activo", ENDED: "Finalizado", CANCELLED: "Cancelado" }[contract.status]}`}
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: "Gestión de alquileres", href: "/alquileres" },
          { label: "Contratos", href: "/alquileres/contratos" },
          { label: contract.internalNumber },
        ]}
        actions={
          canUpdate ? (
            <Link href={`/alquileres/${contract.id}/editar`}>
              <Button>Editar contrato</Button>
            </Link>
          ) : undefined
        }
      >
        <div className="space-y-6">
          <RentalContractForm
            mode="edit"
            contract={contract}
            properties={[]}
            initialContacts={[]}
            canUpdate={false}
            canEnd={sessionHasPermission(session.user, "rental.contract.end")}
          />
          <RentalObligationManager
            contract={contract}
            concepts={concepts}
            initialObligations={obligations}
            initialOccurrences={occurrences.items}
            canManage={sessionHasPermission(
              session.user,
              "rental.obligation.manage",
            )}
            canFulfill={sessionHasPermission(
              session.user,
              "rental.fulfillment.manage",
            )}
            canReverse={["SUPER_ADMIN", "TENANT_ADMIN", "MANAGER"].includes(
              session.user.role,
            )}
          />
        </div>
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
