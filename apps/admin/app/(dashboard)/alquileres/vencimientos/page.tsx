import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { RentalOccurrenceTable } from "@/components/rental/rental-occurrence-table";
import { PageShell } from "@/components/shared/page-shell";
import { SuperAdminTenantEmptyState } from "@/components/shared/super-admin-tenant-empty-state";
import { listRentalOccurrences } from "@/lib/api/rental";
import { getActiveTenantId } from "@/lib/auth/active-tenant";
import { resolveActiveTenantGate } from "@/lib/auth/require-active-tenant";
import { getSession } from "@/lib/auth/session";
import { sessionHasPermission } from "@/lib/auth/types";

export default async function RentalDueDatesPage() {
  const [session, activeTenantId] = await Promise.all([
    getSession(),
    getActiveTenantId(),
  ]);
  if (!session) redirect("/login");
  if (!sessionHasPermission(session.user, "rental.read")) redirect("/");
  const gate = resolveActiveTenantGate(session.user, activeTenantId);
  if (!gate.ok) {
    return (
      <PageShell title="Vencimientos">
        <SuperAdminTenantEmptyState />
      </PageShell>
    );
  }
  const [overdue, pending] = await Promise.all([
    listRentalOccurrences({ status: "OVERDUE" }),
    listRentalOccurrences({ status: "PENDING" }),
  ]);
  const canManage = sessionHasPermission(
    session.user,
    "rental.obligation.manage",
  );
  const canFulfill = sessionHasPermission(
    session.user,
    "rental.fulfillment.manage",
  );
  const canReverse = ["SUPER_ADMIN", "TENANT_ADMIN", "MANAGER"].includes(
    session.user.role,
  );

  return (
    <PageShell
      title="Vencimientos de alquileres"
      description="Agenda operativa de obligaciones vencidas y próximas."
      breadcrumbs={[
        { label: "Inicio", href: "/" },
        { label: "Alquileres", href: "/alquileres" },
        { label: "Vencimientos" },
      ]}
    >
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Vencidos</CardTitle>
          </CardHeader>
          <CardContent>
            <RentalOccurrenceTable
              initialOccurrences={overdue}
              canManage={canManage}
              canFulfill={canFulfill}
              canReverse={canReverse}
              showContract
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Próximos pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <RentalOccurrenceTable
              initialOccurrences={pending}
              canManage={canManage}
              canFulfill={canFulfill}
              canReverse={canReverse}
              showContract
            />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
