"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SidePanelWidth = "sm" | "md" | "lg" | "xl";

const widthClass: Record<SidePanelWidth, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-xl",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-3xl",
};

// ── Context ────────────────────────────────────────────────────────────────────

type SidePanelCtxValue = {
  onClose: () => void;
  titleId: string;
  descriptionId: string;
};

const SidePanelCtx = createContext<SidePanelCtxValue | null>(null);

function useSidePanelCtx() {
  const ctx = useContext(SidePanelCtx);
  if (!ctx) throw new Error("SidePanel sub-components must be inside <SidePanel>");
  return ctx;
}

// ── SidePanel ─────────────────────────────────────────────────────────────────

export type SidePanelProps = {
  open: boolean;
  onClose: () => void;
  width?: SidePanelWidth;
  /** Allow closing by clicking the backdrop. Defaults to true. */
  closeOnOverlay?: boolean;
  children: ReactNode;
};

export function SidePanel({
  open,
  onClose,
  width = "md",
  closeOnOverlay = true,
  children,
}: SidePanelProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const titleId = `${uid}-title`;
  const descriptionId = `${uid}-desc`;

  // Mount → animate in; close → animate out → unmount
  useEffect(() => {
    if (open) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setMounted(true);
    } else {
      setVisible(false);
      timerRef.current = setTimeout(() => setMounted(false), 200);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [open]);

  // Start enter animation after mount
  useLayoutEffect(() => {
    if (!mounted) return;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [mounted]);

  // Body scroll lock
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  // ESC to close
  useEffect(() => {
    if (!mounted) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mounted, onClose]);

  // Focus first focusable element on open
  useEffect(() => {
    if (!visible || !panelRef.current) return;
    const focusable = panelRef.current.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();
  }, [visible]);

  if (!mounted) return null;

  return createPortal(
    <SidePanelCtx.Provider value={{ onClose, titleId, descriptionId }}>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Backdrop */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-zinc-900/30 backdrop-blur-[2px]"
          onClick={closeOnOverlay ? onClose : undefined}
        />

        {/* Panel */}
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className={`relative z-10 flex h-full w-full flex-col overflow-hidden border-l border-zinc-200 bg-white shadow-xl shadow-zinc-900/[0.12] ring-1 ring-zinc-900/[0.04] transition-transform duration-200 ${widthClass[width]} ${
            visible ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {children}
        </div>
      </div>
    </SidePanelCtx.Provider>,
    document.body,
  );
}

// ── SidePanelHeader ───────────────────────────────────────────────────────────

export function SidePanelHeader({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { onClose } = useSidePanelCtx();
  return (
    <div
      className={`flex shrink-0 items-start justify-between gap-4 border-b border-zinc-100 px-6 py-5 ${className}`}
    >
      <div className="min-w-0 flex-1">{children}</div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
      >
        <XIcon />
      </button>
    </div>
  );
}

// ── SidePanelTitle ────────────────────────────────────────────────────────────

export function SidePanelTitle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { titleId } = useSidePanelCtx();
  return (
    <h2
      id={titleId}
      className={`text-sm font-medium tracking-tight text-zinc-900 ${className}`}
    >
      {children}
    </h2>
  );
}

// ── SidePanelDescription ──────────────────────────────────────────────────────

export function SidePanelDescription({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { descriptionId } = useSidePanelCtx();
  return (
    <p
      id={descriptionId}
      className={`mt-0.5 text-xs text-zinc-500 ${className}`}
    >
      {children}
    </p>
  );
}

// ── SidePanelContent ──────────────────────────────────────────────────────────

export function SidePanelContent({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`min-h-0 flex-1 overflow-y-auto px-6 py-5 text-sm text-zinc-600 ${className}`}
    >
      {children}
    </div>
  );
}

// ── SidePanelFooter ───────────────────────────────────────────────────────────

export function SidePanelFooter({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-end gap-2 border-t border-zinc-100 px-6 py-4 ${className}`}
    >
      {children}
    </div>
  );
}

// ── X icon ────────────────────────────────────────────────────────────────────

function XIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="size-4"
      aria-hidden="true"
    >
      <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
  );
}
