import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { IconAlertTriangle } from "@/components/layout/icons";
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
    <Card className="flex h-full min-h-[22rem] flex-col border-border bg-surface shadow-sm ring-1 ring-black/[0.03]">
      <CardHeader className="flex-col items-start gap-1 border-border px-5 py-4">
        <CardTitle className="text-sm text-foreground">
          Requieren atención
        </CardTitle>
        <p className="text-xs text-muted">
          Acciones prioritarias para mejorar la publicabilidad.
        </p>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col px-0 py-0">
        {visibleAlerts.length === 0 ? (
          <p className="m-5 rounded-lg bg-emerald-50/60 px-4 py-3.5 text-sm text-emerald-800 ring-1 ring-emerald-200/70">
            Todo en orden. No hay alertas pendientes.
          </p>
        ) : (
          <ul className="divide-y divide-border/70">
            {visibleAlerts.map((item) => (
              <li key={item.key}>
                <Link
                  href={buildAttentionListHref(item.attentionFilter)}
                  className={cn(
                    "flex items-center justify-between gap-3 px-5 py-3.5 text-sm transition",
                    "hover:bg-surface-alt/70",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2.5 text-foreground">
                    <span
                      aria-hidden
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 ring-1 ring-amber-200/70"
                    >
                      <IconAlertTriangle className="size-[1.05rem]" />
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
      </CardContent>
    </Card>
  );
}
