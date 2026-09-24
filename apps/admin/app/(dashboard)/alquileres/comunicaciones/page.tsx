import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@repo/ui/button";
import { CommunicationsView } from "@/components/rental/communications/communications-view";
import { RentalModuleNav } from "@/components/rental/rental-module-nav";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { PageShell } from "@/components/shared/page-shell";
import { SuperAdminTenantEmptyState } from "@/components/shared/super-admin-tenant-empty-state";
import {
  getRentalCommunicationsSummary,
  listFailedDeliveries,
  listOpenPlanningIssues,
  listRentalHistory,
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
  toExclusiveDayBound,
} from "@/lib/rental/rental-communications";
import type {
  PaginatedResponse,
  RentalAttentionDeliveryItem,
  RentalAttentionPlanningIssueItem,
  RentalCommunicationsSummary,
  RentalDeliveryChannel,
  RentalDispatchEventType,
  RentalDispatchHistoryItem,
  RentalDispatchHistoryQuery,
  RentalDispatchStatus,
  RentalInboundMessage,
} from "@repo/shared-types";

const PAGE_SIZE = 10;
const HISTORY_PAGE_SIZE = 20;
const HISTORY_PAGE_SIZES = new Set([20, 50, 100]);
const HISTORY_EVENT_TYPES = new Set(["PRE_DUE", "DUE", "POST_DUE"]);
const HISTORY_STATUSES = new Set([
  "PLANNED",
  "READY",
  "PROCESSING",
  "COMPLETED",
  "PARTIALLY_COMPLETED",
  "FAILED",
  "SKIPPED",
]);
const HISTORY_CHANNELS = new Set(["EMAIL", "WHATSAPP"]);
const HISTORY_SORT_COLUMNS = new Set([
  "scheduledFor",
  "internalNumber",
  "status",
  "eventType",
]);

function parseBoolParam(value: string | undefined): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

/**
 * Traduce los params crudos de la URL (la URL es la fuente de estado) a la
 * query del API. `scheduledTo` y las ventanas `*To` se convierten a bound
 * exclusivo con `toExclusiveDayBound`: un día YYYY-MM-DD (DatePicker Hasta)
 * pasa al ISO del día siguiente; un ISO ya exclusivo (KPI "Resumen de hoy")
 * se reenvía sin conversión.
 */
function buildHistoryQuery(value: (key: string) => string | undefined) {
  const rawPageSize = Number(value("pageSize"));
  const pageSize =
    Number.isInteger(rawPageSize) && HISTORY_PAGE_SIZES.has(rawPageSize)
      ? rawPageSize
      : HISTORY_PAGE_SIZE;

  const search = value("search")?.trim();
  const rawEventType = value("eventType");
  const eventType =
    rawEventType && HISTORY_EVENT_TYPES.has(rawEventType)
      ? (rawEventType as RentalDispatchEventType)
      : undefined;
  const rawStatus = value("status");
  const status =
    rawStatus && HISTORY_STATUSES.has(rawStatus)
      ? (rawStatus as RentalDispatchStatus)
      : undefined;
  const rawChannel = value("channel");
  const channel =
    rawChannel && HISTORY_CHANNELS.has(rawChannel)
      ? (rawChannel as RentalDeliveryChannel)
      : undefined;
  const rawSortBy = value("sortBy");
  const sortBy =
    rawSortBy && HISTORY_SORT_COLUMNS.has(rawSortBy)
      ? (rawSortBy as RentalDispatchHistoryQuery["sortBy"])
      : undefined;
  const rawSortOrder = value("sortOrder");
  const sortOrder: RentalDispatchHistoryQuery["sortOrder"] =
    rawSortOrder === "asc"
      ? "asc"
      : rawSortOrder === "desc"
        ? "desc"
        : undefined;

  const scheduledFrom = value("scheduledFrom") || undefined;
  const rawScheduledTo = value("scheduledTo") || undefined;
  const scheduledTo = rawScheduledTo
    ? toExclusiveDayBound(rawScheduledTo) || undefined
    : undefined;
  const sentFrom = value("sentFrom") || undefined;
  const rawSentTo = value("sentTo") || undefined;
  const sentTo = rawSentTo
    ? toExclusiveDayBound(rawSentTo) || undefined
    : undefined;
  const deliveredFrom = value("deliveredFrom") || undefined;
  const rawDeliveredTo = value("deliveredTo") || undefined;
  const deliveredTo = rawDeliveredTo
    ? toExclusiveDayBound(rawDeliveredTo) || undefined
    : undefined;
  const failedFrom = value("failedFrom") || undefined;
  const rawFailedTo = value("failedTo") || undefined;
  const failedTo = rawFailedTo
    ? toExclusiveDayBound(rawFailedTo) || undefined
    : undefined;

  return {
    ...(search ? { search } : {}),
    ...(eventType ? { eventType } : {}),
    ...(status ? { status } : {}),
    ...(channel ? { channel } : {}),
    ...(scheduledFrom ? { scheduledFrom } : {}),
    ...(scheduledTo ? { scheduledTo } : {}),
    ...(sentFrom ? { sentFrom } : {}),
    ...(sentTo ? { sentTo } : {}),
    ...(deliveredFrom ? { deliveredFrom } : {}),
    ...(deliveredTo ? { deliveredTo } : {}),
    ...(failedFrom ? { failedFrom } : {}),
    ...(failedTo ? { failedTo } : {}),
    ...(sortBy ? { sortBy } : {}),
    ...(sortOrder ? { sortOrder } : {}),
    page: Math.max(1, Number(value("page")) || 1),
    pageSize,
  };
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
  const rawTab = value("tab");
  const initialTab =
    rawTab === "inbound"
      ? "inbound"
      : rawTab === "attention"
        ? "attention"
        : "history";

  const inboundPage = Math.max(1, Number(value("page")) || 1);
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
    let summary: RentalCommunicationsSummary | null = null;
    let historyResult: PaginatedResponse<RentalDispatchHistoryItem> | null =
      null;
    let inboundResult: PaginatedResponse<RentalInboundMessage> | null = null;
    let deliveries: RentalAttentionDeliveryItem[] = [];
    let planningIssues: RentalAttentionPlanningIssueItem[] = [];

    // Fetch por tab activo (la URL es el estado; cambiar de tab re-navega).
    if (initialTab === "history") {
      const [summaryValue, history] = await Promise.all([
        getRentalCommunicationsSummary(),
        listRentalHistory(buildHistoryQuery(value)),
      ]);
      summary = summaryValue;
      historyResult = history;
    } else if (initialTab === "inbound") {
      const [summaryValue, inbound] = await Promise.all([
        getRentalCommunicationsSummary(),
        listRentalInbound({
          page: inboundPage,
          pageSize: PAGE_SIZE,
          unread,
          unacknowledged,
          receivedFrom,
          receivedTo,
        }),
      ]);
      summary = summaryValue;
      inboundResult = inbound;
    } else {
      summary = await getRentalCommunicationsSummary();
      if (canManage) {
        const [deliveriesResult, issuesResult] = await Promise.all([
          listFailedDeliveries(PAGE_SIZE),
          listOpenPlanningIssues(PAGE_SIZE),
        ]);
        deliveries = deliveriesResult.items;
        planningIssues = issuesResult.items;
      }
    }

    if (!summary) return null;
    const attentionRows = buildCommunicationsAttentionRows({
      deliveries,
      planningIssues,
    });

    return (
      <PageShell
        title="Comunicaciones"
        description="Estado de los avisos de alquiler y las respuestas recibidas."
        breadcrumbs={[
          { label: "Gestión de alquileres", href: "/alquileres" },
          { label: "Comunicaciones" },
        ]}
        actions={
          <Link href="/alquileres/comunicaciones/configuracion">
            <Button variant="secondary">Configurar avisos</Button>
          </Link>
        }
        subNav={<RentalModuleNav />}
      >
        <CommunicationsView
          summary={summary}
          history={historyResult}
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
