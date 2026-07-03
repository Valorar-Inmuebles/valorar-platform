"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  developmentSubNavHref,
  resolveDevelopmentSubNavTab,
  type DevelopmentSubNavTab,
} from "@/lib/development/navigation";
import { cn } from "@/lib/cn";

const TABS: Array<{ id: DevelopmentSubNavTab; label: string }> = [
  { id: "general", label: "Datos" },
  { id: "comercializacion", label: "Comercialización" },
  { id: "caracteristicas", label: "Características" },
  { id: "imagenes", label: "Imágenes" },
  { id: "tipologias", label: "Unidades" },
];

type DevelopmentSubNavProps = {
  developmentId: string;
};

export function DevelopmentSubNav({ developmentId }: DevelopmentSubNavProps) {
  const pathname = usePathname() ?? "";
  const activeTab = resolveDevelopmentSubNavTab(pathname, developmentId);

  return (
    <nav
      aria-label="Secciones del emprendimiento"
      className="flex flex-wrap gap-1 border-b border-border"
    >
      {TABS.map((tab) => {
        const href = developmentSubNavHref(developmentId, tab.id);
        const isActive = activeTab === tab.id;

        return (
          <Link
            key={tab.id}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:border-border hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
