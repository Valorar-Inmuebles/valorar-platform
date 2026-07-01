"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/configuracion/organizacion", label: "Organización" },
  { href: "/configuracion/usuarios", label: "Usuarios" },
  { href: "/configuracion/roles", label: "Roles y permisos" },
  { href: "/configuracion/perfil", label: "Perfil" },
  { href: "/configuracion/preferencias", label: "Preferencias" },
] as const;

export function ConfigSubNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 border-b border-border pb-3">
      {ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
              active
                ? "bg-brand-green/10 font-medium text-brand-green"
                : "text-muted hover:bg-surface-alt hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
