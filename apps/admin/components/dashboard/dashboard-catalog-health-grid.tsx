import type { DashboardCatalogHealth } from "@/lib/api/types/dashboard";
import { DashboardMetricCard } from "@/components/dashboard/dashboard-metric-card";
import { buildAttentionListHref } from "@/lib/property/property-list-url";

type DashboardCatalogHealthGridProps = {
  catalogHealth: DashboardCatalogHealth;
};

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
}> = [
  {
    key: "withoutImages",
    label: "Sin imágenes",
    hint: "Activas sin galería",
    attentionFilter: "without-images",
  },
  {
    key: "withoutCommercialization",
    label: "Sin comercialización",
    hint: "Sin operaciones",
    attentionFilter: "without-commercialization",
  },
  {
    key: "withoutDescription",
    label: "Sin descripción",
    hint: "Texto corto o vacío",
    attentionFilter: "without-description",
  },
  {
    key: "withoutFeatures",
    label: "Sin características",
    hint: "Amenities pendientes",
    attentionFilter: "without-features",
  },
  {
    key: "pendingPublication",
    label: "Pendientes de publicación",
    hint: "Con operaciones incompletas",
    attentionFilter: "pending-publication",
  },
];

export function DashboardCatalogHealthGrid({
  catalogHealth,
}: DashboardCatalogHealthGridProps) {
  return (
    <section className="space-y-2">
      <div>
        <h2 className="text-sm font-semibold text-foreground">
          Estado del catálogo
        </h2>
        <p className="text-xs text-muted">
          Propiedades activas que necesitan completarse.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5 lg:gap-3">
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
            />
          );
        })}
      </div>
    </section>
  );
}
