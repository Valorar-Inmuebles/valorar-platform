import type { ReactNode } from "react";
import { PropertyTypeIcon, SystemIcon } from "@repo/icons";
import type { DashboardKpis } from "@/lib/api/types/dashboard";
import { DashboardMetricCard } from "@/components/dashboard/dashboard-metric-card";
import { buildPropertyListHref } from "@/lib/property/property-list-url";

type DashboardKpiGridProps = {
  kpis: DashboardKpis;
};

const metricIconClassName = "size-[1.05rem]";

const KPI_ITEMS: Array<{
  key: keyof DashboardKpis;
  label: string;
  hint: string;
  href: string;
  tone?: "default" | "success" | "warning" | "muted";
  icon: ReactNode;
}> = [
  {
    key: "totalProperties",
    label: "Propiedades",
    hint: "Inventario total",
    href: buildPropertyListHref("all"),
    icon: <PropertyTypeIcon type="house" className={metricIconClassName} />,
  },
  {
    key: "published",
    label: "Publicadas",
    hint: "Visibles en web",
    href: buildPropertyListHref("published"),
    tone: "success",
    icon: <SystemIcon name="publication" className={metricIconClassName} />,
  },
  {
    key: "drafts",
    label: "Borradores",
    hint: "Activas sin publicar",
    href: buildPropertyListHref("commercial-draft"),
    tone: "warning",
    icon: <SystemIcon name="document" className={metricIconClassName} />,
  },
  {
    key: "archived",
    label: "Archivadas",
    hint: "Fuera de operación",
    href: buildPropertyListHref("archived"),
    tone: "muted",
    icon: <SystemIcon name="archive" className={metricIconClassName} />,
  },
];

export function DashboardKpiGrid({ kpis }: DashboardKpiGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {KPI_ITEMS.map((item) => (
        <DashboardMetricCard
          key={item.key}
          label={item.label}
          value={kpis[item.key]}
          hint={item.hint}
          href={item.href}
          tone={item.tone}
          icon={item.icon}
        />
      ))}
    </div>
  );
}
