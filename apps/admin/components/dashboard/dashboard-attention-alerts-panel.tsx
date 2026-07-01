import Link from "next/link";
import type { DashboardAttentionAlerts } from "@/lib/api/types/dashboard";
import { buildAttentionListHref } from "@/lib/property/property-list-url";
import { cn } from "@/lib/cn";

type DashboardAttentionAlertsPanelProps = {
  alerts: DashboardAttentionAlerts;
};

const ALERT_ITEMS: Array<{
  key: keyof DashboardAttentionAlerts;
  label: string;
  attentionFilter:
    | "without-images"
    | "without-price"
    | "without-description"
    | "without-commercialization"
    | "recently-archived";
}> = [
  {
    key: "withoutImages",
    label: "Propiedades sin imágenes",
    attentionFilter: "without-images",
  },
  {
    key: "withoutPrice",
    label: "Propiedades sin precio",
    attentionFilter: "without-price",
  },
  {
    key: "withoutDescription",
    label: "Propiedades sin descripción",
    attentionFilter: "without-description",
  },
  {
    key: "withoutCommercialization",
    label: "Propiedades sin comercialización",
    attentionFilter: "without-commercialization",
  },
  {
    key: "recentlyArchived",
    label: "Propiedades archivadas recientemente",
    attentionFilter: "recently-archived",
  },
];

export function DashboardAttentionAlertsPanel({
  alerts,
}: DashboardAttentionAlertsPanelProps) {
  const visibleAlerts = ALERT_ITEMS.filter((item) => alerts[item.key] > 0);

  return (
    <section className="space-y-2">
      <div>
        <h2 className="text-sm font-semibold text-foreground">
          Requieren atención
        </h2>
        <p className="text-xs text-muted">
          Acciones prioritarias para mejorar la publicabilidad.
        </p>
      </div>

      {visibleAlerts.length === 0 ? (
        <p className="rounded-lg bg-emerald-50/50 px-3 py-2.5 text-sm text-emerald-800 ring-1 ring-emerald-200/70">
          Todo en orden. No hay alertas pendientes.
        </p>
      ) : (
        <ul className="divide-y divide-border/70 rounded-lg bg-white ring-1 ring-border/70">
          {visibleAlerts.map((item) => (
            <li key={item.key}>
              <Link
                href={buildAttentionListHref(item.attentionFilter)}
                className={cn(
                  "flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition",
                  "hover:bg-zinc-50",
                )}
              >
                <span className="text-foreground">
                  <span aria-hidden className="mr-2">
                    ⚠
                  </span>
                  {item.label}
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-amber-700">
                  {alerts[item.key]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
