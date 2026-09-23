"use client";

import { useEffect, useId, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SystemIcon, type SystemIconName } from "@repo/icons";
import { TabPanel, Tabs } from "@repo/ui/tabs";
import { DashboardMetricCard } from "@/components/dashboard/dashboard-metric-card";
import { CommunicationsAttention } from "@/components/rental/communications/communications-attention";
import { CommunicationsInbound } from "@/components/rental/communications/communications-inbound";
import { CommunicationsInboundPanel } from "@/components/rental/communications/communications-inbound-panel";
import {
  COMMUNICATIONS_SUMMARY_METRICS,
  type CommunicationsAttentionRow,
} from "@/lib/rental/rental-communications";
import type {
  PaginatedResponse,
  RentalCommunicationsSummary,
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

type Props = {
  summary: RentalCommunicationsSummary;
  attentionRows: CommunicationsAttentionRow[];
  inbound: PaginatedResponse<RentalInboundMessage>;
  canManage: boolean;
  initialTab: "attention" | "inbound";
};

/** Pantalla global de comunicaciones: summary + cola de atención + inbound. */
export function CommunicationsView({
  summary,
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
          {summary.timeZone}).
        </p>
      </section>

      <Tabs
        id={tabsId}
        ariaLabel="Contenido de comunicaciones"
        value={tab}
        items={[
          { value: "attention", label: "Requieren atención" },
          { value: "inbound", label: "Respuestas recibidas" },
        ]}
        onChange={changeTab}
      />

      <TabPanel
        tabsId={tabsId}
        index={0}
        value={tab}
        tabValue="attention"
        className="pt-4"
      >
        <CommunicationsAttention
          rows={attentionRows}
          canManage={canManage}
          onOpenInbound={setSelected}
        />
      </TabPanel>

      <TabPanel
        tabsId={tabsId}
        index={1}
        value={tab}
        tabValue="inbound"
        className="pt-4"
      >
        <CommunicationsInbound
          result={inbound}
          canManage={canManage}
          onOpenInbound={setSelected}
        />
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
