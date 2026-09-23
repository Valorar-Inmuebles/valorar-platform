"use client";

import { useEffect, useId, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SystemIcon, type SystemIconName } from "@repo/icons";
import { TabPanel, Tabs } from "@repo/ui/tabs";
import { DashboardMetricCard } from "@/components/dashboard/dashboard-metric-card";
import { CommunicationsAttention } from "@/components/rental/communications/communications-attention";
import { CommunicationsHistory } from "@/components/rental/communications/communications-history";
import { CommunicationsInbound } from "@/components/rental/communications/communications-inbound";
import { CommunicationsInboundPanel } from "@/components/rental/communications/communications-inbound-panel";
import {
  buildHistoryQuickFilter,
  COMMUNICATIONS_SUMMARY_METRICS,
  type CommunicationsAttentionRow,
} from "@/lib/rental/rental-communications";
import { formatDateTime } from "@/lib/rental/rental-ui";
import type {
  PaginatedResponse,
  RentalCommunicationsSummary,
  RentalDispatchHistoryItem,
  RentalInboundMessage,
} from "@repo/shared-types";

type CounterKey =
  | "dispatchesScheduledToday"
  | "deliveriesSentToday"
  | "deliveriesDeliveredToday"
  | "deliveriesFailedToday"
  | "planningIssuesOpen"
  | "inboundUnacknowledged";

const METRIC_ICONS: Record<CounterKey, SystemIconName> = {
  dispatchesScheduledToday: "calendar",
  deliveriesSentToday: "publication",
  deliveriesDeliveredToday: "check",
  deliveriesFailedToday: "alert",
  planningIssuesOpen: "list",
  inboundUnacknowledged: "document",
};

const METRIC_TONES: Record<CounterKey, "default" | "success" | "warning"> = {
  dispatchesScheduledToday: "default",
  deliveriesSentToday: "default",
  deliveriesDeliveredToday: "success",
  deliveriesFailedToday: "warning",
  planningIssuesOpen: "warning",
  inboundUnacknowledged: "warning",
};

function metricHint(summary: RentalCommunicationsSummary, key: CounterKey) {
  switch (key) {
    case "dispatchesScheduledToday":
    case "deliveriesSentToday":
    case "deliveriesDeliveredToday":
    case "deliveriesFailedToday":
      return `Ventana: ${formatDateTime(summary.window.from)} – ${formatDateTime(
        summary.window.to,
      )}`;
    case "planningIssuesOpen":
      return "Ver cola de atención";
    case "inboundUnacknowledged":
      return "Ver respuestas sin atender";
  }
}

type Props = {
  summary: RentalCommunicationsSummary;
  history: PaginatedResponse<RentalDispatchHistoryItem> | null;
  attentionRows: CommunicationsAttentionRow[];
  inbound: PaginatedResponse<RentalInboundMessage> | null;
  canManage: boolean;
  initialTab: "history" | "inbound" | "attention";
};

/**
 * Centro operativo de comunicaciones (C4C.1): resumen 3×2 como filtros
 * rápidos + tabs de Historial de avisos (default), Respuestas recibidas y
 * Requieren atención. El orden de tabs es fijo; la URL es el estado.
 */
export function CommunicationsView({
  summary,
  history,
  attentionRows,
  inbound,
  canManage,
  initialTab,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabsId = useId();
  const [tab, setTab] = useState(initialTab);
  const [selected, setSelected] = useState<RentalInboundMessage | null>(null);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  function changeTab(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    params.delete("page");
    router.push(`/alquileres/comunicaciones?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <section aria-label="Resumen del día" className="space-y-2">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {COMMUNICATIONS_SUMMARY_METRICS.map((metric) => (
            <DashboardMetricCard
              key={metric.key}
              label={metric.label}
              value={summary[metric.key]}
              hint={metricHint(summary, metric.key)}
              href={buildHistoryQuickFilter(summary, metric.key) ?? undefined}
              icon={
                <SystemIcon
                  name={METRIC_ICONS[metric.key]}
                  aria-hidden="true"
                  className="size-4"
                />
              }
              tone={METRIC_TONES[metric.key]}
            />
          ))}
        </div>
        <p className="text-xs text-muted">
          Resumen del día en la zona horaria de la organización (
          {summary.timeZone}). Los indicadores abren el historial con la ventana
          real del día.
        </p>
      </section>

      <Tabs
        id={tabsId}
        ariaLabel="Contenido de comunicaciones"
        value={tab}
        items={[
          { value: "history", label: "Historial de avisos" },
          { value: "inbound", label: "Respuestas recibidas" },
          { value: "attention", label: "Requieren atención" },
        ]}
        onChange={changeTab}
      />

      <TabPanel
        tabsId={tabsId}
        index={0}
        value={tab}
        tabValue="history"
        className="pt-4"
      >
        {history ? (
          <CommunicationsHistory result={history} canManage={canManage} />
        ) : null}
      </TabPanel>

      <TabPanel
        tabsId={tabsId}
        index={1}
        value={tab}
        tabValue="inbound"
        className="pt-4"
      >
        {inbound ? (
          <CommunicationsInbound
            result={inbound}
            canManage={canManage}
            onOpenInbound={setSelected}
          />
        ) : null}
      </TabPanel>

      <TabPanel
        tabsId={tabsId}
        index={2}
        value={tab}
        tabValue="attention"
        className="pt-4"
      >
        <CommunicationsAttention rows={attentionRows} canManage={canManage} />
      </TabPanel>

      {selected ? (
        <CommunicationsInboundPanel
          message={selected}
          canManage={canManage}
          onClose={() => setSelected(null)}
          onUpdated={setSelected}
        />
      ) : null}
    </div>
  );
}
