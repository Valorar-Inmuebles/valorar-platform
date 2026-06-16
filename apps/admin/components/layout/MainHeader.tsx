"use client";

import { Button } from "@repo/ui/button";
import { IconMenu } from "@/components/layout/icons";
import { useSidebar } from "@/components/layout/sidebar-context";

export function MainHeader() {
  const { collapsed, isMobile, toggleSidebar } = useSidebar();

  return (
    <header className="flex h-[3.25rem] shrink-0 items-center gap-3 border-b border-border bg-surface/75 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/65 sm:px-6">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={toggleSidebar}
        aria-label={
          isMobile
            ? "Abrir menú"
            : collapsed
              ? "Expandir barra lateral"
              : "Contraer barra lateral"
        }
        aria-pressed={isMobile ? undefined : !collapsed}
        className="size-8 shrink-0 px-0"
      >
        <IconMenu className="size-[1.125rem]" />
      </Button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          Valorar Platform
        </p>
        <p className="truncate text-xs text-muted">Dashboard administrativo</p>
      </div>

      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600 ring-1 ring-border"
        aria-hidden
        title="Usuario (pendiente auth)"
      >
        VA
      </div>
    </header>
  );
}
