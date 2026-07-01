import type { DashboardKpis } from "@/lib/api/types/dashboard";
import { DashboardMetricCard } from "@/components/dashboard/dashboard-metric-card";
import { buildPropertyListHref } from "@/lib/property/property-list-url";

type DashboardKpiGridProps = {
  kpis: DashboardKpis;
};

const KPI_ITEMS: Array<{
  key: keyof DashboardKpis;
  label: string;
  hint: string;
  href: string;
  tone?: "default" | "success" | "warning" | "muted";
}> = [
  {
    key: "totalProperties",
    label: "Propiedades",
    hint: "Inventario total",
    href: buildPropertyListHref("all"),
  },
  {
    key: "published",
    label: "Publicadas",
    hint: "Visibles en web",
    href: buildPropertyListHref("published"),
    tone: "success",
  },
  {
    key: "drafts",
    label: "Borradores",
    hint: "Activas sin publicar",
    href: buildPropertyListHref("commercial-draft"),
    tone: "warning",
  },
  {
    key: "archived",
    label: "Archivadas",
    hint: "Fuera de operación",
    href: buildPropertyListHref("archived"),
    tone: "muted",
  },
];

export function DashboardKpiGrid({ kpis }: DashboardKpiGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
      {KPI_ITEMS.map((item) => (
        <DashboardMetricCard
          key={item.key}
          label={item.label}
          value={kpis[item.key]}
          hint={item.hint}
          href={item.href}
          tone={item.tone}
        />
      ))}
    </div>
  );
}
