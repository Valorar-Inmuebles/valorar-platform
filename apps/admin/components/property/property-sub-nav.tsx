"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  propertySubNavHref,
  resolvePropertySubNavTab,
  type PropertySubNavTab,
} from "@/lib/property/navigation";
import { cn } from "@/lib/cn";

const TABS: Array<{ id: PropertySubNavTab; label: string }> = [
  { id: "general", label: "Datos" },
  { id: "publicaciones", label: "Comercialización" },
  { id: "caracteristicas", label: "Características" },
  { id: "imagenes", label: "Imágenes" },
];

type PropertySubNavProps = {
  propertyId: string;
};

export function PropertySubNav({ propertyId }: PropertySubNavProps) {
  const pathname = usePathname() ?? "";
  const activeTab = resolvePropertySubNavTab(pathname, propertyId);

  return (
    <nav
      aria-label="Secciones de la propiedad"
      className="flex flex-wrap gap-1 border-b border-border"
    >
      {TABS.map((tab) => {
        const href = propertySubNavHref(propertyId, tab.id);
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
