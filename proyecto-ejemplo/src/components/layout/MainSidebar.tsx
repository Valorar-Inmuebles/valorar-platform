"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  navigation,
  isNavItemVisible,
  visibleNavChildren,
  type NavChildItem,
  type NavItem,
  type NavViewerContext,
} from "@/components/layout/nav-config";
import { useSidebar } from "@/components/layout/sidebar-context";
import { IconChevronDown, NavIcon } from "@/components/ui/icons";
import { useSignOut } from "@/lib/auth/use-sign-out";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Must match the w-14 class (Tailwind = 3.5rem = 56px at 16px base) */
const W_COLLAPSED = 56;

// ── Utilities ─────────────────────────────────────────────────────────────────

function matchPath(pathname: string, href?: string): boolean {
  if (!href) return false;
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

function groupIsActive(
  item: NavItem,
  pathname: string,
  navCtx: NavViewerContext,
): boolean {
  return (
    visibleNavChildren(item, navCtx)?.some((c) =>
      matchPath(pathname, c.href),
    ) ?? false
  );
}

// ── Shared token strings ───────────────────────────────────────────────────────

const itemBase =
  "relative flex w-full items-center gap-2 rounded-md text-[13px] font-medium outline-none transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-white/20";

const stateActive = "bg-white/10 text-white";
const stateIdle   = "text-gray-300 hover:bg-white/10 hover:text-white";

// ── Active left-edge bar ───────────────────────────────────────────────────────

function ActiveBar() {
  return (
      <span
      className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-blue-400"
      aria-hidden
    />
  );
}

// ── Expanded: direct link row ─────────────────────────────────────────────────

function NavLinkRow({
  item,
  pathname,
  onSignOut,
  isSigningOut,
}: {
  item: NavItem;
  pathname: string;
  onSignOut: () => void;
  isSigningOut: boolean;
}) {
  if (item.action === "sign-out") {
    return (
      <li>
        <button
          type="button"
          onClick={onSignOut}
          disabled={isSigningOut}
          className={`${itemBase} h-8 cursor-pointer px-2 ${stateIdle} disabled:opacity-60`}
        >
          <span className="flex size-[18px] shrink-0 items-center justify-center text-gray-400">
            <NavIcon id={item.iconId} className="size-[1.05rem]" />
          </span>
          <span className="min-w-0 flex-1 truncate text-left">
            {isSigningOut ? "Saliendo…" : item.label}
          </span>
        </button>
      </li>
    );
  }

  if (!item.href) return null;
  const active = matchPath(pathname, item.href);

  return (
    <li>
      <Link
        href={item.href}
        className={`${itemBase} h-8 px-2 ${active ? stateActive : stateIdle}`}
      >
        {active && <ActiveBar />}
        <span
          className={`flex size-[18px] shrink-0 items-center justify-center ${
            active ? "text-white" : "text-gray-400"
          }`}
        >
          <NavIcon id={item.iconId} className="size-[1.05rem]" />
        </span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
      </Link>
    </li>
  );
}

// ── Expanded: group row (toggle + animated children) ─────────────────────────

function NavGroupRow({
  item,
  pathname,
  open,
  onToggle,
  navCtx,
}: {
  item: NavItem;
  pathname: string;
  open: boolean;
  onToggle: () => void;
  navCtx: NavViewerContext;
}) {
  const childActive = groupIsActive(item, pathname, navCtx);
  const children = visibleNavChildren(item, navCtx);

  if (!children?.length) return null;

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`${itemBase} h-8 cursor-pointer px-2 ${
          childActive ? "text-white" : stateIdle
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
    <span
      className={`flex size-[18px] shrink-0 items-center justify-center ${
        childActive ? "text-white" : "text-gray-400"
      }`}
    >
      <NavIcon id={item.iconId} className="size-[1.05rem]" />
    </span>

    <span className="truncate">{item.label}</span>
  </div>
        <IconChevronDown
          className={`size-3.5 shrink-0 text-gray-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Children — grid-rows animation avoids fixed max-height hacks */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <ul className="ml-[22px] space-y-0.5 border-l border-white/10 py-1 pl-3">
            {children.map((child) => (
              <ChildRow key={child.id} child={child} pathname={pathname} />
            ))}
          </ul>
        </div>
      </div>
    </li>
  );
}

function ChildRow({
  child,
  pathname,
}: {
  child: NavChildItem;
  pathname: string;
}) {
  const active = matchPath(pathname, child.href);
  return (
    <li>
      <Link
        href={child.href}
        className={`${itemBase} h-7 px-2 ${active ? stateActive : "text-gray-400 hover:bg-white/10 hover:text-white"}`}
      >
        {active && <ActiveBar />}
        <span className="min-w-0 flex-1 truncate">{child.label}</span>
      </Link>
    </li>
  );
}

// ── Collapsed: icon-only button / link ────────────────────────────────────────

function CollapsedItem({
  item,
  pathname,
  popoverOpen,
  onTogglePopover,
  onSignOut,
  isSigningOut,
  navCtx,
}: {
  item: NavItem;
  pathname: string;
  popoverOpen: boolean;
  onTogglePopover: (id: string, el: HTMLButtonElement) => void;
  onSignOut: () => void;
  isSigningOut: boolean;
  navCtx: NavViewerContext;
}) {
  if (!isNavItemVisible(item, navCtx)) return null;

  const children = visibleNavChildren(item, navCtx);

  if (item.children && !children?.length) {
    return null;
  }

  const active = item.href
    ? matchPath(pathname, item.href)
    : groupIsActive(item, pathname, navCtx);

  const cls = `flex size-8 items-center justify-center rounded-md outline-none transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-white/20 ${
    active
      ? "bg-white/10 text-white"
      : popoverOpen
      ? "bg-white/10 text-gray-200"
      : "text-gray-400 hover:bg-white/10 hover:text-gray-200"
  }`;

  if (item.action === "sign-out") {
    return (
      <li>
        <button
          type="button"
          onClick={onSignOut}
          disabled={isSigningOut}
          className={`${cls} disabled:opacity-60`}
          title={isSigningOut ? "Saliendo…" : item.label}
          aria-label={item.label}
        >
          <NavIcon id={item.iconId} className="size-[1.05rem]" />
        </button>
      </li>
    );
  }

  if (!item.children && item.href) {
    return (
      <li>
        <Link href={item.href} className={cls} title={item.label} aria-label={item.label}>
          <NavIcon id={item.iconId} className="size-[1.05rem]" />
        </Link>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        className={cls}
        title={item.label}
        aria-label={item.label}
        aria-haspopup="true"
        aria-expanded={popoverOpen}
        onClick={(e) => onTogglePopover(item.id, e.currentTarget)}
      >
        <NavIcon id={item.iconId} className="size-[1.05rem]" />
      </button>
    </li>
  );
}

// ── Collapsed flyout popover (fixed position) ─────────────────────────────────

type PopoverState = { id: string; top: number } | null;

// ── Main sidebar ──────────────────────────────────────────────────────────────

export default function Sidebar() {
  const { collapsed, isSuperUsuario, roles } = useSidebar();
  const navCtx: NavViewerContext = { isSuperUsuario, roles };
  const { signOut, isSigningOut } = useSignOut();
  const pathname = usePathname() ?? "/";
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [popover, setPopover]       = useState<PopoverState>(null);
  const popoverRef                  = useRef<HTMLDivElement>(null);

  // Auto-expand groups that contain the active route
  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const section of navigation) {
        for (const item of section.items) {
          if (
            item.children &&
            groupIsActive(item, pathname, navCtx)
          ) {
            next[item.id] = true;
          }
        }
      }
      return next;
    });
  }, [pathname, isSuperUsuario, roles]);

  // Close popover when sidebar expands
  useEffect(() => {
    if (!collapsed) setPopover(null);
  }, [collapsed]);

  // Close popover on outside click or Escape
  useEffect(() => {
    if (!popover) return;

    const onMouse = (e: MouseEvent) => {
      if (!popoverRef.current?.contains(e.target as Node)) setPopover(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPopover(null);
    };

    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouse);
      document.removeEventListener("keydown", onKey);
    };
  }, [popover]);

  const handleTogglePopover = useCallback(
    (id: string, el: HTMLButtonElement) => {
      if (popover?.id === id) {
        setPopover(null);
      } else {
        const rect = el.getBoundingClientRect();
        setPopover({ id, top: rect.top });
      }
    },
    [popover],
  );

  const toggleGroup = useCallback((id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Look up the item whose popover is currently open
  const popoverItem = popover
    ? navigation.flatMap((s) => s.items).find((i) => i.id === popover.id)
    : null;
  const popoverChildren = popoverItem
    ? visibleNavChildren(popoverItem, navCtx)
    : undefined;

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-white/10 bg-blue-950 transition-[width] duration-200 ease-out ${
        collapsed ? "w-14" : "w-[220px]"
      }`}
    >
      {/* ── Brand ── */}
      <div
        className={`flex h-[3.25rem] shrink-0 items-center gap-2.5 border-b border-white/10 ${
          collapsed ? "justify-center" : "px-3"
        }`}
      >
        <div className="grid size-7 shrink-0 place-items-center rounded-md bg-blue-600 text-[11px] font-bold text-white">
          EOT
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">
              EOT Abogados
            </div>
            <div className="truncate text-[11px] text-blue-300">by JuriLexIA</div>
          </div>
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2">
        {navigation.map((section, idx) => (
          <div key={section.id} className={idx > 0 ? "mt-4" : ""}>

            {/* Section title — hidden when collapsed; replaced by thin rule */}
            {!collapsed ? (
              <div className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                {section.label}
              </div>
            ) : (
              idx > 0 && <div className="mb-2 h-px bg-white/10" />
            )}

            <ul className="space-y-0.5">
              {collapsed
                ? section.items.map((item) => (
                    <CollapsedItem
                      key={item.id}
                      item={item}
                      pathname={pathname}
                      popoverOpen={popover?.id === item.id}
                      onTogglePopover={handleTogglePopover}
                      onSignOut={signOut}
                      isSigningOut={isSigningOut}
                      navCtx={navCtx}
                    />
                  ))
                : section.items.map((item) => {
                    if (!isNavItemVisible(item, navCtx)) return null;

                    return item.children ? (
                      visibleNavChildren(item, navCtx)?.length ? (
                        <NavGroupRow
                          key={item.id}
                          item={item}
                          pathname={pathname}
                          open={openGroups[item.id] ?? false}
                          onToggle={() => toggleGroup(item.id)}
                          navCtx={navCtx}
                        />
                      ) : null
                    ) : (
                      <NavLinkRow
                        key={item.id}
                        item={item}
                        pathname={pathname}
                        onSignOut={signOut}
                        isSigningOut={isSigningOut}
                      />
                    );
                  })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Collapsed flyout popover ── */}
      {/* position: fixed so it escapes the sticky/overflow context cleanly */}
      {collapsed && popover && popoverItem && popoverChildren?.length ? (
        <div
          ref={popoverRef}
          role="menu"
          aria-label={popoverItem.label}
          style={{ top: popover.top, left: W_COLLAPSED + 6 }}
          className="fixed z-[200] min-w-[11rem] rounded-xl border border-zinc-200 bg-white py-1.5 shadow-xl shadow-zinc-900/[0.08] ring-1 ring-zinc-900/[0.03]"
        >
          <div className="border-b border-zinc-100 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            {popoverItem.label}
          </div>
          <div className="py-1">
            {popoverChildren.map((child) => {
              const active = matchPath(pathname, child.href);
              return (
                <Link
                  key={child.id}
                  href={child.href}
                  role="menuitem"
                  onClick={() => setPopover(null)}
                  className={`mx-1 flex h-8 items-center rounded-md px-3 text-[13px] font-medium transition-colors duration-100 ${
                    active
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                  }`}
                >
                  {child.label}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
