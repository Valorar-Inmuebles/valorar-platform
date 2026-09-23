import { redirect } from "next/navigation";
import { CommunicationsView } from "@/components/rental/communications/communications-view";
import { RentalModuleNav } from "@/components/rental/rental-module-nav";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { PageShell } from "@/components/shared/page-shell";
import { SuperAdminTenantEmptyState } from "@/components/shared/super-admin-tenant-empty-state";
import {
  getRentalCommunicationsSummary,
  listFailedDeliveries,
  listOpenPlanningIssues,
  listRentalInbound,
} from "@/lib/api/rental-communications";
import { mapUnknownError } from "@/lib/api/error-map";
import { getActiveTenantId } from "@/lib/auth/active-tenant";
import { resolveActiveTenantGate } from "@/lib/auth/require-active-tenant";
import { getSession } from "@/lib/auth/session";
import { sessionHasPermission } from "@/lib/auth/types";
import {
  buildCommunicationsAttentionRows,
  inclusiveDayToExclusiveIso,
} from "@/lib/rental/rental-communications";
import type {
  RentalAttentionDeliveryItem,
  RentalAttentionPlanningIssueItem,
} from "@repo/shared-types";

const PAGE_SIZE = 10;

function parseBoolParam(value: string | undefined): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export default async function RentalCommunicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, activeTenantId, raw] = await Promise.all([
    getSession(),
    getActiveTenantId(),
    searchParams,
  ]);
  if (!session) redirect("/login");
  if (!sessionHasPermission(session.user, "rental.read")) redirect("/");

  const gate = resolveActiveTenantGate(session.user, activeTenantId);
  if (!gate.ok) {
    return (
      <PageShell title="Comunicaciones" subNav={<RentalModuleNav />}>
        <SuperAdminTenantEmptyState />
      </PageShell>
    );
  }

  const value = (key: string) =>
    typeof raw[key] === "string" ? (raw[key] as string) : undefined;

  const initialTab = value("tab") === "inbound" ? "inbound" : "attention";
  const page = Math.max(1, Number(value("page")) || 1);
  const unread = parseBoolParam(value("unread"));
  const unacknowledged = parseBoolParam(value("unacknowledged"));
  const receivedFrom = value("receivedFrom") || undefined;
  const rawReceivedTo = value("receivedTo") || undefined;
  const receivedTo = rawReceivedTo
    ? inclusiveDayToExclusiveIso(rawReceivedTo) || undefined
    : undefined;
  const canManage = sessionHasPermission(
    session.user,
    "rental.reminder.manage",
  );

  try {
    const [summary, attentionInbound, inboundResult] = await Promise.all([
      getRentalCommunicationsSummary(),
      listRentalInbound({ unacknowledged: true, pageSize: PAGE_SIZE }),
      listRentalInbound({
        page,
        pageSize: PAGE_SIZE,
        unread,
        unacknowledged,
        receivedFrom,
        receivedTo,
      }),
    ]);

    let deliveries: RentalAttentionDeliveryItem[] = [];
    let planningIssues: RentalAttentionPlanningIssueItem[] = [];
    if (canManage) {
      const [deliveriesResult, issuesResult] = await Promise.all([
        listFailedDeliveries(PAGE_SIZE),
        listOpenPlanningIssues(PAGE_SIZE),
      ]);
      deliveries = deliveriesResult.items;
      planningIssues = issuesResult.items;
    }

    const attentionRows = buildCommunicationsAttentionRows({
      deliveries,
      planningIssues,
      inbound: attentionInbound.items,
    });

    return (
      <PageShell
        title="Comunicaciones"
        description="Estado de los avisos de alquiler y las respuestas recibidas."
        breadcrumbs={[
          { label: "Gestión de alquileres", href: "/alquileres" },
          { label: "Comunicaciones" },
        ]}
        subNav={<RentalModuleNav />}
      >
        <CommunicationsView
          summary={summary}
          attentionRows={attentionRows}
          inbound={inboundResult}
          canManage={canManage}
          initialTab={initialTab}
        />
      </PageShell>
    );
  } catch (error) {
    return (
      <PageShell
        title="Comunicaciones"
        breadcrumbs={[
          { label: "Gestión de alquileres", href: "/alquileres" },
          { label: "Comunicaciones" },
        ]}
        subNav={<RentalModuleNav />}
      >
        <ApiErrorPanel message={mapUnknownError(error)} />
      </PageShell>
    );
  }
}
