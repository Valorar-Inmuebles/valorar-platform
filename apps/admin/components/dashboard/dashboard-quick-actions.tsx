import Link from "next/link";
import type { ReactNode } from "react";
import {
  IconAlertCircle,
  IconCircleDashed,
  IconExternalLink,
  IconPlus,
} from "@/components/layout/icons";
import { getPublicWebBaseUrl } from "@/lib/property/publishability";
import { buildAttentionListHref, buildPropertyListHref } from "@/lib/property/property-list-url";
import { cn } from "@/lib/cn";

const ACTIONS: Array<{
  href: string;
  label: string;
  icon: ReactNode;
  primary?: boolean;
}> = [
  {
    href: "/propiedades/crear",
    label: "Nueva propiedad",
    icon: <IconPlus className="size-[1.05rem]" />,
    primary: true,
  },
  {
    href: buildPropertyListHref("commercial-draft"),
    label: "Ver borradores",
    icon: <IconCircleDashed className="size-[1.05rem]" />,
  },
  {
    href: buildAttentionListHref("pending-publication"),
    label: "Propiedades pendientes",
    icon: <IconAlertCircle className="size-[1.05rem]" />,
  },
];

export function DashboardQuickActions() {
  const publicWebUrl = getPublicWebBaseUrl();

  return (
    <section className="space-y-2">
      <div>
        <h2 className="text-sm font-semibold text-foreground">
          Acciones rápidas
        </h2>
        <p className="text-xs text-muted">Atajos para el trabajo diario.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition",
              action.primary
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "bg-white text-foreground ring-1 ring-border/70 hover:ring-primary/25",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "flex size-[18px] shrink-0 items-center justify-center",
                action.primary ? "text-primary-foreground/90" : "text-muted",
              )}
            >
              {action.icon}
            </span>
            {action.label}
          </Link>
        ))}

        {publicWebUrl ? (
          <Link
            href={publicWebUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-foreground ring-1 ring-border/70 transition hover:ring-primary/25"
          >
            <span
              aria-hidden
              className="flex size-[18px] shrink-0 items-center justify-center text-muted"
            >
              <IconExternalLink className="size-[1.05rem]" />
            </span>
            Ver sitio web
          </Link>
        ) : null}
      </div>
    </section>
  );
}
