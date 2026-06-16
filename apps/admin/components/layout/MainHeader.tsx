"use client";

import { Button } from "@repo/ui/button";
import { IconMenu } from "@/components/layout/icons";
import { TenantSwitcher } from "@/components/layout/tenant-switcher";
import { useSidebar } from "@/components/layout/sidebar-context";
import { getUserInitials } from "@/lib/auth/nav-context";
import type { AuthUser } from "@/lib/auth/types";

type MainHeaderProps = {
  user: AuthUser;
  activeTenantId: string | null;
};

export function MainHeader({ user, activeTenantId }: MainHeaderProps) {
  const { collapsed, isMobile, toggleSidebar } = useSidebar();
  const initials = getUserInitials(user.name);

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
          {user.name}
        </p>
        <p className="truncate text-xs text-muted">{user.email}</p>
      </div>

      <div className="hidden max-w-[220px] lg:block">
        <TenantSwitcher user={user} activeTenantId={activeTenantId} />
      </div>

      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600 ring-1 ring-border"
        title={user.name}
        aria-label={`Usuario: ${user.name}`}
      >
        {initials}
      </div>
    </header>
  );
}
