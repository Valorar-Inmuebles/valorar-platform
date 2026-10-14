"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ConfigSubNavLinks({
  items,
}: {
  items: { href: string; label: string }[];
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones de configuración"
      className="flex max-w-full gap-1 overflow-x-auto border-b border-border"
    >
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative inline-flex min-h-10 shrink-0 items-center px-3 text-sm font-medium text-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/30 ${active ? "text-primary after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary" : ""}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
