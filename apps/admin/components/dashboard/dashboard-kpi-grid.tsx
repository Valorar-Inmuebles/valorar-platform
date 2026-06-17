import type { DashboardKpis } from "@/lib/api/types/dashboard";
import { DashboardKpiCard } from "@/components/dashboard/dashboard-kpi-card";
import { buildPropertyListHref } from "@/lib/property/property-list-url";

type DashboardKpiGridProps = {
  kpis: DashboardKpis;
};

const KPI_ITEMS: Array<{
  key: keyof DashboardKpis;
  label: string;
  href?: string;
}> = [
  {
    key: "totalActiveProperties",
    label: "Propiedades activas",
    href: buildPropertyListHref("active"),
  },
  {
    key: "publishedProperties",
    label: "Publicadas en web",
    href: buildPropertyListHref("published"),
  },
  {
    key: "activeSaleListings",
    label: "Publicaciones activas · venta",
  },
  {
    key: "activeRentListings",
    label: "Publicaciones activas · alquiler",
  },
  {
    key: "featuredListings",
    label: "Publicaciones activas · destacadas",
  },
];

export function DashboardKpiGrid({ kpis }: DashboardKpiGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
      {KPI_ITEMS.map((item) => (
        <DashboardKpiCard
          key={item.key}
          label={item.label}
          value={kpis[item.key]}
          href={item.href}
        />
      ))}
    </div>
  );
}
