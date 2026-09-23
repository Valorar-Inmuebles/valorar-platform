import { notFound, redirect } from "next/navigation";
import { RentalContractActions } from "@/components/rental/rental-contract-actions";
import {
  RentalContractGeneralView,
  RentalContractStatusBadge,
  RentalContractTabs,
} from "@/components/rental/rental-contract-detail";
import { CommunicationsHistory } from "@/components/rental/communications/communications-history";
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
import { listRentalHistory } from "@/lib/api/rental-communications";
import { toExclusiveDayBound } from "@/lib/rental/rental-communications";
import { getActiveTenantId } from "@/lib/auth/active-tenant";
import { resolveActiveTenantGate } from "@/lib/auth/require-active-tenant";
import { getSession } from "@/lib/auth/session";
import { sessionHasPermission } from "@/lib/auth/types";
import type {
  RentalDeliveryChannel,
  RentalDispatchEventType,
  RentalDispatchHistoryQuery,
  RentalDispatchStatus,
} from "@repo/shared-types";

const TYPES = [
  "ACTIVATED",
  "ENDED",
  "CANCELLED",
  "PARTIES_CHANGED",
  "RENT_VALUE_REVISED",
  "RENEWED",
];
const COMMUNICATION_EVENTS = new Set(["PRE_DUE", "DUE", "POST_DUE"]);
const COMMUNICATION_STATUSES = new Set([
  "PLANNED",
  "READY",
  "PROCESSING",
  "COMPLETED",
  "PARTIALLY_COMPLETED",
  "FAILED",
  "SKIPPED",
]);
const COMMUNICATION_CHANNELS = new Set(["EMAIL", "WHATSAPP"]);
const COMMUNICATION_SORTS = new Set(["scheduledFor", "status", "eventType"]);

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
  const tab =
    value("tab") === "history"
      ? "history"
      : value("tab") === "communications"
        ? "communications"
        : "general";
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
  const communicationQuery: RentalDispatchHistoryQuery = {
    contractId: route.id,
    eventType: COMMUNICATION_EVENTS.has(value("eventType") ?? "")
      ? (value("eventType") as RentalDispatchEventType)
      : undefined,
    status: COMMUNICATION_STATUSES.has(value("status") ?? "")
      ? (value("status") as RentalDispatchStatus)
      : undefined,
    channel: COMMUNICATION_CHANNELS.has(value("channel") ?? "")
      ? (value("channel") as RentalDeliveryChannel)
      : undefined,
    scheduledFrom: value("scheduledFrom") || undefined,
    scheduledTo: value("scheduledTo")
      ? toExclusiveDayBound(value("scheduledTo")!) || undefined
      : undefined,
    sortBy: COMMUNICATION_SORTS.has(value("sortBy") ?? "")
      ? (value("sortBy") as RentalDispatchHistoryQuery["sortBy"])
      : undefined,
    sortOrder: value("sortOrder") === "asc" ? "asc" : "desc",
    page: Math.max(1, Number(value("page")) || 1),
    pageSize: [20, 50, 100].includes(Number(value("pageSize")))
      ? Number(value("pageSize"))
      : 20,
  };
  try {
    const [contract, obligations, history, communications] = await Promise.all([
      getRentalContractGeneral(route.id),
      listRentalObligations(route.id),
      tab === "history"
        ? getRentalContractHistory(route.id, filters)
        : Promise.resolve(null),
      tab === "communications"
        ? listRentalHistory(communicationQuery)
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
          ) : tab === "communications" && communications ? (
            <CommunicationsHistory
              result={communications}
              canManage={sessionHasPermission(
                session.user,
                "rental.reminder.manage",
              )}
              scope="contract"
              contractId={contract.id}
            />
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
