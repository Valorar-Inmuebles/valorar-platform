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

// ── Context ────────────────────────────────────────────────────────────────────

type DropdownCtx = {
  open: boolean;
  visible: boolean;
  toggle: () => void;
  close: () => void;
  triggerId: string;
  panelId: string;
  align: "start" | "end";
};

const Ctx = createContext<DropdownCtx | null>(null);

function useCtx() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Dropdown sub-components must be inside <Dropdown>");
  return ctx;
}

// ── Dropdown ──────────────────────────────────────────────────────────────────

export type DropdownProps = {
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
};

export function Dropdown({ children, align = "end", className = "" }: DropdownProps) {
  const baseId = useId();
  const triggerId = `${baseId}-trigger`;
  const panelId = `${baseId}-panel`;

  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doOpen = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(true);
  }, []);

  const doClose = useCallback(() => {
    setVisible(false);
    timerRef.current = setTimeout(() => setOpen(false), 150);
  }, []);

  const toggle = useCallback(() => {
    if (open) doClose(); else doOpen();
  }, [open, doOpen, doClose]);

  // Trigger enter animation after mount
  useLayoutEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const ctx = useMemo(
    () => ({ open, visible, toggle, close: doClose, triggerId, panelId, align }),
    [open, visible, toggle, doClose, triggerId, panelId, align],
  );

  return (
    <Ctx.Provider value={ctx}>
      <div className={`relative ${className}`}>{children}</div>
    </Ctx.Provider>
  );
}

// ── DropdownTrigger ───────────────────────────────────────────────────────────
// Wraps any element. Clicks bubble up and call toggle.

export function DropdownTrigger({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { toggle, open, triggerId, panelId } = useCtx();
  return (
    <div
      id={triggerId}
      role="none"
      onClick={toggle}
      aria-haspopup="true"
      aria-expanded={open}
      aria-controls={panelId}
      className={`inline-flex ${className}`}
    >
      {children}
    </div>
  );
}

// ── DropdownContent ───────────────────────────────────────────────────────────

type Pos = { top: number; left?: number; right?: number };

export function DropdownContent({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { open, visible, close, align, triggerId, panelId } = useCtx();
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Pos | null>(null);

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
    else setPos(null);
  }, [open, recalc]);

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

  // ── Outside click / ESC ───────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onMouse = (e: MouseEvent) => {
      const trigger = document.getElementById(triggerId);
      if (
        panelRef.current?.contains(e.target as Node) ||
        trigger?.contains(e.target as Node)
      ) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouse);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, triggerId]);

  if (!open || pos === null) return null;

  const origin = align === "end" ? "origin-top-right" : "origin-top-left";

  return createPortal(
    <div
      ref={panelRef}
      id={panelId}
      role="menu"
      aria-labelledby={triggerId}
      style={pos}
      className={`fixed z-[300] min-w-[12.5rem] ${origin} rounded-xl border border-zinc-200/90 bg-white/95 py-1.5 shadow-xl shadow-zinc-900/[0.08] ring-1 ring-zinc-900/[0.04] backdrop-blur-md transition-[opacity,transform] duration-150 ${
        visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
      } ${className}`}
    >
      {children}
    </div>,
    document.body,
  );
}

// ── DropdownItem ──────────────────────────────────────────────────────────────

export type DropdownItemProps = {
  children: ReactNode;
  icon?: ReactNode;
  variant?: "default" | "danger";
  disabled?: boolean;
  onClick?: () => void;
};

export function DropdownItem({
  children,
  icon,
  variant = "default",
  disabled = false,
  onClick,
}: DropdownItemProps) {
  const { close } = useCtx();

  const colorCls =
    variant === "danger"
      ? "text-red-600 hover:bg-red-50 hover:text-red-700"
      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900";

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={() => {
        if (!disabled) { onClick?.(); close(); }
      }}
      className={`mx-1 flex w-[calc(100%-0.5rem)] items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium outline-none transition-colors duration-100 disabled:pointer-events-none disabled:opacity-40 ${colorCls}`}
    >
      {icon && <span className="shrink-0 opacity-70">{icon}</span>}
      {children}
    </button>
  );
}

// ── DropdownSeparator ─────────────────────────────────────────────────────────

export function DropdownSeparator({ className = "" }: { className?: string }) {
  return (
    <div role="separator" className={`my-1.5 h-px bg-zinc-100 ${className}`} />
  );
}

// ── DropdownLabel ─────────────────────────────────────────────────────────────

export function DropdownLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
      {children}
    </p>
  );
}
