import { notFound, redirect } from "next/navigation";
import { RentalContractActions } from "@/components/rental/rental-contract-actions";
import {
  RentalContractGeneralView,
  RentalContractStatusBadge,
  RentalContractTabs,
} from "@/components/rental/rental-contract-detail";
import {
  RentalContractHistoryView,
  type RentalHistoryFilters,
} from "@/components/rental/rental-contract-history-view";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { PageShell } from "@/components/shared/page-shell";
import { SuperAdminTenantEmptyState } from "@/components/shared/super-admin-tenant-empty-state";
import { ApiError } from "@/lib/api/client";
import { mapUnknownError } from "@/lib/api/error-map";
import {
  getRentalContractGeneral,
  getRentalContractHistory,
  listRentalObligations,
} from "@/lib/api/rental";
import { getActiveTenantId } from "@/lib/auth/active-tenant";
import { resolveActiveTenantGate } from "@/lib/auth/require-active-tenant";
import { getSession } from "@/lib/auth/session";
import { sessionHasPermission } from "@/lib/auth/types";

const TYPES = [
  "ACTIVATED",
  "ENDED",
  "CANCELLED",
  "PARTIES_CHANGED",
  "RENT_VALUE_REVISED",
  "RENEWED",
];

export default async function AlquilerDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, activeTenantId, route, query] = await Promise.all([
    getSession(),
    getActiveTenantId(),
    params,
    searchParams,
  ]);
  if (!session) redirect("/login");
  if (!sessionHasPermission(session.user, "rental.read")) redirect("/");
  const gate = resolveActiveTenantGate(session.user, activeTenantId);
  if (!gate.ok)
    return (
      <PageShell title="Contrato de alquiler">
        <SuperAdminTenantEmptyState />
      </PageShell>
    );
  const value = (key: string) =>
    typeof query[key] === "string" ? query[key] : undefined;
  const tab = value("tab") === "history" ? "history" : "general";
  const category = value("category")?.toUpperCase();
  const type = value("type")?.toUpperCase();
  const filters: RentalHistoryFilters = {
    category:
      category === "CONTRACT" || category === "FULFILLMENT"
        ? category
        : undefined,
    type: type && TYPES.includes(type) ? type : undefined,
    from: /^\d{4}-\d{2}-\d{2}$/.test(value("from") ?? "")
      ? value("from")
      : undefined,
    to: /^\d{4}-\d{2}-\d{2}$/.test(value("to") ?? "") ? value("to") : undefined,
    page: Math.max(1, Number(value("page")) || 1),
    pageSize: [10, 20, 50].includes(Number(value("pageSize")))
      ? Number(value("pageSize"))
      : 10,
  };
  try {
    const [contract, obligations, history] = await Promise.all([
      getRentalContractGeneral(route.id),
      listRentalObligations(route.id),
      tab === "history"
        ? getRentalContractHistory(route.id, filters)
        : Promise.resolve(null),
    ]);
    const canUpdate =
      sessionHasPermission(session.user, "rental.contract.update") &&
      ["DRAFT", "ACTIVE"].includes(contract.status);
    return (
      <PageShell
        title={contract.internalNumber}
        description={contract.propertyAddressSnapshot}
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: "Gestión de alquileres", href: "/alquileres" },
          { label: "Contratos", href: "/alquileres/contratos" },
          { label: contract.internalNumber },
        ]}
        actions={
          <RentalContractActions
            contract={contract}
            canUpdate={canUpdate}
            canEnd={sessionHasPermission(session.user, "rental.contract.end")}
            canRenew={sessionHasPermission(
              session.user,
              "rental.contract.renew",
            )}
          />
        }
      >
        <div className="space-y-4">
          <RentalContractStatusBadge status={contract.status} />
          <RentalContractTabs contractId={contract.id} tab={tab} />
          {tab === "history" && history ? (
            <RentalContractHistoryView result={history} filters={filters} />
          ) : (
            <RentalContractGeneralView
              contract={contract}
              obligations={obligations}
              canUpdate={canUpdate}
              canManageObligations={sessionHasPermission(
                session.user,
                "rental.obligation.manage",
              )}
            />
          )}
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
