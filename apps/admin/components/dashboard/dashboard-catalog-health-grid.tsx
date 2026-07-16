import type { ReactNode } from "react";
import { SystemIcon } from "@repo/icons";
import type { DashboardCatalogHealth } from "@/lib/api/types/dashboard";
import { DashboardMetricCard } from "@/components/dashboard/dashboard-metric-card";
import { buildAttentionListHref } from "@/lib/property/property-list-url";

type DashboardCatalogHealthGridProps = {
  catalogHealth: DashboardCatalogHealth;
};

const metricIconClassName = "size-[1.05rem]";

const HEALTH_ITEMS: Array<{
  key: keyof DashboardCatalogHealth;
  label: string;
  hint: string;
  attentionFilter:
    | "without-images"
    | "without-commercialization"
    | "without-description"
    | "without-features"
    | "pending-publication";
  icon: ReactNode;
}> = [
  {
    key: "withoutImages",
    label: "Sin imágenes",
    hint: "Activas sin galería",
    attentionFilter: "without-images",
    icon: <SystemIcon name="image" className={metricIconClassName} />,
  },
  {
    key: "withoutCommercialization",
    label: "Sin comercialización",
    hint: "Sin operaciones",
    attentionFilter: "without-commercialization",
    icon: <SystemIcon name="commercial" className={metricIconClassName} />,
  },
  {
    key: "withoutDescription",
    label: "Sin descripción",
    hint: "Texto corto o vacío",
    attentionFilter: "without-description",
    icon: <SystemIcon name="document" className={metricIconClassName} />,
  },
  {
    key: "withoutFeatures",
    label: "Sin características",
    hint: "Amenities pendientes",
    attentionFilter: "without-features",
    icon: <SystemIcon name="list" className={metricIconClassName} />,
  },
  {
    key: "pendingPublication",
    label: "Pendientes de publicación",
    hint: "Con operaciones incompletas",
    attentionFilter: "pending-publication",
    icon: <SystemIcon name="publication" className={metricIconClassName} />,
  },
];

export function DashboardCatalogHealthGrid({
  catalogHealth,
}: DashboardCatalogHealthGridProps) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">
          Estado del catálogo
        </h2>
        <p className="mt-0.5 text-xs text-muted">
          Propiedades activas que necesitan completarse.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">
        {HEALTH_ITEMS.map((item) => {
          const value = catalogHealth[item.key];
          return (
            <DashboardMetricCard
              key={item.key}
              label={item.label}
              value={value}
              hint={item.hint}
              href={buildAttentionListHref(item.attentionFilter)}
              tone={value > 0 ? "warning" : "default"}
              icon={item.icon}
            />
          );
        })}
      </div>
    </section>
  );
}
