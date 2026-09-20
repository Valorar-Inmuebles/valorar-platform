import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@repo/ui/button";
import { RentalDashboardPeriod } from "@/components/rental/rental-dashboard-period";
import { RentalModuleNav } from "@/components/rental/rental-module-nav";
import { RentalOverview } from "@/components/rental/rental-overview";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { PageShell } from "@/components/shared/page-shell";
import { SuperAdminTenantEmptyState } from "@/components/shared/super-admin-tenant-empty-state";
import { mapUnknownError } from "@/lib/api/error-map";
import {
  getRentalDashboard,
  listRentalContracts,
  listRentalOccurrences,
} from "@/lib/api/rental";
import { getActiveTenantId } from "@/lib/auth/active-tenant";
import { resolveActiveTenantGate } from "@/lib/auth/require-active-tenant";
import { getSession } from "@/lib/auth/session";
import { sessionHasPermission } from "@/lib/auth/types";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function validMonth(value: string | undefined) {
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
    ? value
    : currentMonth();
}

export default async function AlquileresPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const { periodo } = await searchParams;
  const month = validMonth(periodo);
  const [session, activeTenantId] = await Promise.all([
    getSession(),
    getActiveTenantId(),
  ]);
  if (!session) redirect("/login");
  if (!sessionHasPermission(session.user, "rental.read")) redirect("/");

  const gate = resolveActiveTenantGate(session.user, activeTenantId);
  if (!gate.ok) {
    return (
      <PageShell title="Gestión de alquileres" subNav={<RentalModuleNav />}>
        <SuperAdminTenantEmptyState />
      </PageShell>
    );
  }

  try {
    const [dashboard, rent, other, attention, expiring] = await Promise.all([
      getRentalDashboard(),
      listRentalOccurrences({
        month,
        category: "RENT",
        status: "PENDING",
        pageSize: 1,
      }),
      listRentalOccurrences({
        month,
        category: "OTHER",
        status: "PENDING",
        pageSize: 1,
      }),
      listRentalOccurrences({
        month,
        status: "PENDING",
        sortBy: "dueDate",
        sortOrder: "asc",
        pageSize: 5,
      }),
      listRentalContracts({
        endingWithinDays: 60,
        sortBy: "endsOn",
        sortOrder: "asc",
        pageSize: 4,
      }),
    ]);
    const rawPeriodLabel = new Intl.DateTimeFormat("es-AR", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    })
      .format(new Date(`${month}-01T00:00:00.000Z`))
      .replace(" de ", " ");
    const periodLabel =
      rawPeriodLabel.charAt(0).toUpperCase() + rawPeriodLabel.slice(1);

    return (
      <PageShell
        title="Gestión de alquileres"
        description="Resumen operativo de tus contratos y vencimientos."
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: "Gestión de alquileres" },
        ]}
        subNav={<RentalModuleNav />}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <RentalDashboardPeriod value={month} />
            {sessionHasPermission(session.user, "rental.contract.create") ? (
              <Link href="/alquileres/crear">
                <Button>Nuevo contrato</Button>
              </Link>
            ) : null}
          </div>
        }
      >
        <RentalOverview
          dashboard={dashboard}
          rentPending={rent.total}
          otherPending={other.total}
          attention={attention.items}
          expiringContracts={expiring.items}
          periodLabel={periodLabel}
        />
      </PageShell>
    );
  } catch (error) {
    return (
      <PageShell title="Gestión de alquileres" subNav={<RentalModuleNav />}>
        <ApiErrorPanel message={mapUnknownError(error)} />
      </PageShell>
    );
  }
}
