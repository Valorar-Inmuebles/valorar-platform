import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import type { DashboardPublishAlerts } from "@/lib/api/types/dashboard";
import { buildPropertyListHref } from "@/lib/property/property-list-url";

type DashboardPublishAlertsProps = {
  alerts: DashboardPublishAlerts;
};

const ALERT_ITEMS: Array<{
  key: keyof DashboardPublishAlerts;
  href: string;
  label: (count: number) => string;
}> = [
  {
    key: "withoutCover",
    href: buildPropertyListHref("active"),
    label: (count) =>
      `${count} ${count === 1 ? "propiedad activa sin portada" : "propiedades activas sin portada"}`,
  },
  {
    key: "draftListingsWithPrice",
    href: buildPropertyListHref("commercial-draft"),
    label: (count) =>
      `${count} ${count === 1 ? "publicación borrador con precio" : "publicaciones borrador con precio"}`,
  },
  {
    key: "activePropertiesWithoutActiveListing",
    href: buildPropertyListHref("active"),
    label: (count) =>
      `${count} ${count === 1 ? "propiedad activa sin publicación activa" : "propiedades activas sin publicación activa"}`,
  },
];

export function DashboardPublishAlerts({ alerts }: DashboardPublishAlertsProps) {
  const visibleAlerts = ALERT_ITEMS.filter((item) => alerts[item.key] > 0);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Publicación pendiente</CardTitle>
      </CardHeader>
      <CardContent>
        {visibleAlerts.length === 0 ? (
          <p className="text-sm text-muted">
            No hay alertas de publicación pendientes. ¡Buen trabajo!
          </p>
        ) : (
          <ul className="space-y-3">
            {visibleAlerts.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="text-sm font-medium text-foreground underline-offset-2 hover:text-primary hover:underline"
                >
                  {item.label(alerts[item.key])}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
