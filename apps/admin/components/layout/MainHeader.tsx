"use client";

import Link from "next/link";
import { Button } from "@repo/ui/button";
import { IconMenu } from "@/components/layout/icons";
import { TenantSwitcher } from "@/components/layout/tenant-switcher";
import { UserAvatar } from "@/components/user/user-avatar";
import { useSidebar } from "@/components/layout/sidebar-context";
import type { AuthUser } from "@/lib/auth/types";

type MainHeaderProps = {
  user: AuthUser;
  activeTenantId: string | null;
};

export function MainHeader({ user, activeTenantId }: MainHeaderProps) {
  const { collapsed, isMobile, toggleSidebar } = useSidebar();
  const isSuperAdmin = user.role === "SUPER_ADMIN";

  return (
    <header className="flex min-h-[3.25rem] shrink-0 flex-col gap-2 border-b border-border bg-surface/90 px-4 py-2 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/80 sm:flex-row sm:items-center sm:gap-3 sm:py-0 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
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
          className="size-8 shrink-0 px-0 text-brand-green hover:bg-surface-alt"
        >
          <IconMenu className="size-[1.125rem]" />
        </Button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {user.name}
          </p>
          <p className="truncate text-xs text-muted">{user.email}</p>
        </div>

        <Link href="/configuracion/perfil" className="sm:hidden" title="Mi perfil">
          <UserAvatar
            name={user.name}
            avatarUrl={user.avatarUrl}
            seed={user.id}
            size="sm"
          />
        </Link>
      </div>

      {isSuperAdmin ? (
        <div className="w-full min-w-0 sm:max-w-[240px] lg:max-w-[280px]">
          <TenantSwitcher
            user={user}
            activeTenantId={activeTenantId}
            highlighted={!activeTenantId}
            compact
          />
        </div>
      ) : null}

      <Link href="/configuracion/perfil" className="hidden sm:block" title="Mi perfil">
        <UserAvatar
          name={user.name}
          avatarUrl={user.avatarUrl}
          seed={user.id}
          size="sm"
        />
      </Link>
    </header>
  );
}
