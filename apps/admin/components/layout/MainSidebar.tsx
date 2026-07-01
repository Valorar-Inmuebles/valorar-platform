"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useToast } from "@repo/ui/toast";
import { NavIcon } from "@/components/layout/icons";
import { AdminBrandMark } from "@/components/branding/admin-brand-mark";
import {
  getVisibleNavigation,
  isNavItemVisible,
  matchNavPath,
  type NavItem,
  type NavViewerContext,
} from "@/components/layout/nav-config";
import { useSidebar } from "@/components/layout/sidebar-context";
import { TenantSwitcher } from "@/components/layout/tenant-switcher";
import { cn } from "@/lib/cn";
import type { AuthUser } from "@/lib/auth/types";

const itemBase =
  "relative flex w-full items-center gap-2 rounded-md text-[13px] font-medium outline-none transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-white/20";

const stateActive = "bg-sidebar-accent text-sidebar-foreground";
const stateIdle =
  "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground";

function ActiveBar() {
  return (
    <span
      className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-brand-orange"
      aria-hidden
    />
  );
}

function NavLinkRow({
  item,
  pathname,
  onNavigate,
  onSignOut,
}: {
  item: NavItem;
  pathname: string;
  onNavigate: () => void;
  onSignOut: () => void;
}) {
  if (item.action === "sign-out") {
    return (
      <li>
        <button
          type="button"
          onClick={onSignOut}
          className={cn(
            itemBase,
            "h-8 cursor-pointer px-2",
            stateIdle,
          )}
        >
          <span className="flex size-[18px] shrink-0 items-center justify-center text-sidebar-muted">
            <NavIcon id={item.iconId} className="size-[1.05rem]" />
          </span>
          <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
        </button>
      </li>
    );
  }

  if (!item.href) return null;
  const active = matchNavPath(pathname, item.href);

  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cn(itemBase, "h-8 px-2", active ? stateActive : stateIdle)}
      >
        {active && <ActiveBar />}
        <span
          className={cn(
            "flex size-[18px] shrink-0 items-center justify-center",
            active ? "text-sidebar-foreground" : "text-sidebar-muted",
          )}
        >
          <NavIcon id={item.iconId} className="size-[1.05rem]" />
        </span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
      </Link>
    </li>
  );
}

function CollapsedItem({
  item,
  pathname,
  onNavigate,
  onSignOut,
}: {
  item: NavItem;
  pathname: string;
  onNavigate: () => void;
  onSignOut: () => void;
}) {
  const active = item.href ? matchNavPath(pathname, item.href) : false;

  const cls = cn(
    "flex size-8 items-center justify-center rounded-md outline-none transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-white/20",
    active
      ? "bg-sidebar-accent text-sidebar-foreground"
      : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground",
  );

  if (item.action === "sign-out") {
    return (
      <li>
        <button
          type="button"
          onClick={onSignOut}
          className={cls}
          title={item.label}
          aria-label={item.label}
        >
          <NavIcon id={item.iconId} className="size-[1.05rem]" />
        </button>
      </li>
    );
  }

  if (!item.href) return null;

  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cls}
        title={item.label}
        aria-label={item.label}
      >
        <NavIcon id={item.iconId} className="size-[1.05rem]" />
      </Link>
    </li>
  );
}

type MainSidebarProps = {
  navContext: NavViewerContext;
  user: AuthUser;
  activeTenantId: string | null;
};

export function MainSidebar({
  navContext,
  user,
  activeTenantId,
}: MainSidebarProps) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { collapsed, mobileOpen, isMobile, closeMobile } = useSidebar();
  const { toast } = useToast();
  const isCollapsed = isMobile ? false : collapsed;

  const handleNavigate = () => {
    if (isMobile) closeMobile();
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("No se pudo cerrar sesión.");
    }
  };

  return (
    <>
      {isMobile && mobileOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-brand-green/40 backdrop-blur-[1px] lg:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        className={cn(
          "flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width,transform] duration-200 ease-out",
          isCollapsed ? "w-14" : "w-[220px]",
          "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:shadow-xl",
          mobileOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full",
          "lg:sticky lg:top-0 lg:translate-x-0",
        )}
      >
        <div
          className={cn(
            "flex shrink-0 flex-col justify-center border-b border-sidebar-border",
            isCollapsed ? "items-center px-2 py-3" : "px-3 py-3",
          )}
        >
          {isCollapsed ? (
            <Link
              href="/"
              onClick={handleNavigate}
              className="rounded-md p-1 transition hover:bg-white/10"
              title="Admin — Inicio"
              aria-label="Valorar Admin — Inicio"
            >
              <AdminBrandMark variant="sidebar-compact" />
            </Link>
          ) : (
            <Link
              href="/"
              onClick={handleNavigate}
              className="min-w-0 transition hover:opacity-90"
              aria-label="Valorar Admin — Inicio"
            >
              <AdminBrandMark variant="sidebar" />
            </Link>
          )}
        </div>

        <nav className="flex-1 overflow-x-hidden overflow-y-auto px-2 py-2">
          {user.role === "SUPER_ADMIN" && !isCollapsed ? (
            <div className="mb-4 px-1 lg:hidden">
              <TenantSwitcher
                user={user}
                activeTenantId={activeTenantId}
                highlighted={!activeTenantId}
                compact
              />
            </div>
          ) : null}

          {getVisibleNavigation(navContext).map((section, idx) => (
            <div key={section.id} className={idx > 0 ? "mt-4" : ""}>
              {!isCollapsed ? (
                <div className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wide text-sidebar-muted">
                  {section.label}
                </div>
              ) : (
                idx > 0 && <div className="mb-2 h-px bg-sidebar-border" />
              )}

              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  if (!isNavItemVisible(item, navContext)) return null;

                  return isCollapsed ? (
                    <CollapsedItem
                      key={item.id}
                      item={item}
                      pathname={pathname}
                      onNavigate={handleNavigate}
                      onSignOut={handleSignOut}
                    />
                  ) : (
                    <NavLinkRow
                      key={item.id}
                      item={item}
                      pathname={pathname}
                      onNavigate={handleNavigate}
                      onSignOut={handleSignOut}
                    />
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
