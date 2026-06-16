"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type Align = "start" | "end";

type DropdownMenuContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerId: string;
  menuId: string;
  align: Align;
};

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(
  null,
);

function useDropdownMenu() {
  const ctx = useContext(DropdownMenuContext);
  if (!ctx) {
    throw new Error("DropdownMenu components must be used within DropdownMenu");
  }
  return ctx;
}

export function DropdownMenu({
  children,
  align = "end",
  onOpenChange,
}: {
  children: ReactNode;
  align?: Align;
  onOpenChange?: (open: boolean) => void;
}) {
  const baseId = useId();
  const triggerId = `${baseId}-trigger`;
  const menuId = `${baseId}-menu`;
  const [open, setOpenState] = useState(false);

  const setOpen = useCallback(
    (next: boolean) => {
      setOpenState(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );

  const value = useMemo(
    () => ({
      open,
      setOpen,
      triggerId,
      menuId,
      align,
    }),
    [open, setOpen, triggerId, menuId, align],
  );

  return (
    <DropdownMenuContext.Provider value={value}>
      <div className="relative">{children}</div>
    </DropdownMenuContext.Provider>
  );
}

export function DropdownMenuTrigger({
  className = "",
  children,
  ...props
}: React.ComponentProps<"button">) {
  const { open, setOpen, triggerId, menuId } = useDropdownMenu();

  return (
    <button
      type="button"
      id={triggerId}
      className={`rounded-full outline-none transition-[box-shadow,transform] duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.97] ${className}`}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={menuId}
      onClick={() => setOpen(!open)}
      {...props}
    >
      {children}
    </button>
  );
}

type Pos = { top: number; left?: number; right?: number };

export function DropdownMenuContent({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const { open, setOpen, triggerId, menuId, align } = useDropdownMenu();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Pos | null>(null);
  const [ready, setReady] = useState(false);

  // ── Calculate fixed position from trigger rect ────────────────────────────
  const recalc = useCallback(() => {
    const trigger = document.getElementById(triggerId);
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    if (align === "end") {
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    } else {
      setPos({ top: r.bottom + 6, left: r.left });
    }
  }, [triggerId, align]);

  useLayoutEffect(() => {
    if (open) recalc();
    else { setPos(null); setReady(false); }
  }, [open, recalc]);

  // ── Animate entry after position is set ──────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  // ── Keep position in sync while open ─────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", recalc, true);
    window.addEventListener("resize", recalc);
    return () => {
      window.removeEventListener("scroll", recalc, true);
      window.removeEventListener("resize", recalc);
    };
  }, [open, recalc]);

  // ── Close on outside click ────────────────────────────────────────────────
  const onDocMouseDown = useCallback(
    (event: MouseEvent) => {
      const el = ref.current;
      if (!el || el.contains(event.target as Node)) return;
      const trigger = document.getElementById(triggerId);
      if (trigger?.contains(event.target as Node)) return;
      setOpen(false);
    },
    [setOpen, triggerId],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open, onDocMouseDown]);

  // ── Close on ESC ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open || pos === null) return null;

  const origin = align === "end" ? "origin-top-right" : "origin-top-left";

  return createPortal(
    <div
      ref={ref}
      id={menuId}
      role="menu"
      aria-labelledby={triggerId}
      style={pos}
      className={`
        fixed z-[300]
        min-w-[12.5rem]
        rounded-xl border border-zinc-200/90
        bg-white py-1.5
        shadow-xl shadow-zinc-900/[0.08]
        ring-1 ring-zinc-900/[0.04]
        transition-[opacity,transform] duration-150
        ${ready ? "opacity-100 scale-100" : "opacity-0 scale-95"}
        ${origin}
        ${className}
      `}
    >
      {children}
    </div>,
    document.body,
  );
}

export function DropdownMenuItem({
  className = "",
  children,
  onClick,
  ...props
}: React.ComponentProps<"button">) {
  const { setOpen } = useDropdownMenu();

  return (
    <button
      type="button"
      role="menuitem"
      className={`mx-1 flex w-[calc(100%-0.5rem)] items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-600 outline-none transition-colors duration-150 hover:bg-zinc-100 hover:text-zinc-900 focus:bg-zinc-100 focus-visible:bg-zinc-100 ${className}`}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) setOpen(false);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      role="separator"
      className={`my-1.5 h-px bg-zinc-100 ${className}`}
    />
  );
}
