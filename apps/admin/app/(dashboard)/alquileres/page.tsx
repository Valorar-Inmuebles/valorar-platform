import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@repo/ui/button";
import { Card, CardContent } from "@repo/ui/card";
import { RentalContractTable } from "@/components/rental/rental-contract-table";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { PageShell } from "@/components/shared/page-shell";
import { SuperAdminTenantEmptyState } from "@/components/shared/super-admin-tenant-empty-state";
import { mapUnknownError } from "@/lib/api/error-map";
import { listRentalContracts } from "@/lib/api/rental";
import { getActiveTenantId } from "@/lib/auth/active-tenant";
import { resolveActiveTenantGate } from "@/lib/auth/require-active-tenant";
import { getSession } from "@/lib/auth/session";
import { sessionHasPermission } from "@/lib/auth/types";

export default async function AlquileresPage() {
  const [session, activeTenantId] = await Promise.all([
    getSession(),
    getActiveTenantId(),
  ]);
  if (!session) redirect("/login");
  if (!sessionHasPermission(session.user, "rental.read")) redirect("/");
  const gate = resolveActiveTenantGate(session.user, activeTenantId);
  if (!gate.ok)
    return (
      <PageShell title="Gestión de alquileres">
        <SuperAdminTenantEmptyState />
      </PageShell>
    );

  try {
    const contracts = await listRentalContracts();
    return (
      <PageShell
        title="Gestión de alquileres"
        description="Contratos operativos y sus referencias históricas."
        breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Alquileres" }]}
        actions={
          sessionHasPermission(session.user, "rental.contract.create") ? (
            <Link href="/alquileres/crear">
              <Button>Nuevo contrato</Button>
            </Link>
          ) : undefined
        }
      >
        {contracts.length ? (
          <RentalContractTable contracts={contracts} />
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <h2 className="font-semibold">Sin contratos todavía</h2>
              <p className="mt-1 text-sm text-muted">
                Creá el primer borrador para comenzar.
              </p>
            </CardContent>
          </Card>
        )}
      </PageShell>
    );
  } catch (error) {
    return (
      <PageShell title="Gestión de alquileres">
        <ApiErrorPanel message={mapUnknownError(error)} />
      </PageShell>
    );
  }
}
