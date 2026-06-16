"use client";

import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificacionesMenu } from "@/components/modules/notificaciones";
import { IconMenu, IconMessage } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/icon-button";
import { SearchInput } from "@/components/ui/search-input";
import { TenantSwitcher } from "@/components/layout/TenantSwitcher";
import { useSidebar } from "@/components/layout/sidebar-context";
import { useSignOut } from "@/lib/auth/use-sign-out";
import type { MainLayoutCurrentUser } from "@/components/layout/MainLayout";

export default function Header({
  currentUser,
  isSuperUsuario = false,
  viewTenantId = null,
}: {
  currentUser?: MainLayoutCurrentUser;
  isSuperUsuario?: boolean;
  viewTenantId?: string | null;
}) {
  const { collapsed, toggleCollapsed } = useSidebar();

  return (
    <header className="flex h-[3.25rem] items-center gap-4 border-b border-zinc-200/70 bg-white/75 px-5 backdrop-blur-xl supports-[backdrop-filter]:bg-white/65 sm:px-6">
      <IconButton
        type="button"
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
        aria-pressed={!collapsed}
        title={collapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
      >
        <IconMenu className="size-[1.125rem]" />
      </IconButton>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <SearchInput
          placeholder="Buscar en el workspace…"
          aria-label="Buscar"
        />
        {isSuperUsuario ? (
          <TenantSwitcher viewTenantId={viewTenantId} />
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
        <NotificacionesMenu />
        <IconButton aria-label="Mensajes" title="Mensajes">
          <IconMessage className="size-[1.125rem]" />
        </IconButton>

        <div className="ml-1 pl-1 sm:ml-2 sm:pl-2 sm:border-l sm:border-zinc-200/80">
          <UserMenu currentUser={currentUser} />
        </div>
      </div>
    </header>
  );
}

function UserMenu({
  currentUser,
}: {
  currentUser?: MainLayoutCurrentUser;
}) {
  const { signOut, isSigningOut } = useSignOut();
  const name = currentUser?.name ?? "";
  const email = currentUser?.email ?? "";

  return (
    <DropdownMenu align="end">
      <DropdownMenuTrigger className="p-0.5">
        <Avatar
          usuarioId={currentUser?.id ?? ""}
          name={name}
          hasFoto={currentUser?.has_foto ?? false}
          size="md"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <div className="px-4 py-3">
          <div className="text-sm font-medium text-zinc-900">{name}</div>
          {email ? (
            <div className="mt-0.5 truncate text-sm text-zinc-500">{email}</div>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Perfil</DropdownMenuItem>
        <DropdownMenuItem>Configuración</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isSigningOut}
          className="text-rose-600 hover:bg-rose-100 hover:text-rose-700 focus:bg-rose-100 focus-visible:bg-rose-100 disabled:opacity-60"
          onClick={signOut}
        >
          {isSigningOut ? "Cerrando sesión…" : "Cerrar sesión"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
