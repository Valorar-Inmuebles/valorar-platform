"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

const sizeMaxW: Record<ModalSize, string> = {
  sm:   "max-w-sm",
  md:   "max-w-md",
  lg:   "max-w-lg",
  xl:   "max-w-xl",
  full: "max-w-none",
};

// ── Context ────────────────────────────────────────────────────────────────────

const ModalCtx = createContext<{ onClose: () => void } | null>(null);

function useModalCtx() {
  const ctx = useContext(ModalCtx);
  if (!ctx) throw new Error("Modal sub-components must be inside <Modal>");
  return ctx;
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  size?: ModalSize;
  /** Custom CSS width, e.g. "80vw" or "640px". Overrides size width. */
  width?: string;
  /** Custom CSS height, e.g. "70vh" or "500px". Enables fixed-height scrolling. */
  height?: string;
  /** Allow closing by clicking the backdrop. Defaults to true. */
  closeOnOverlay?: boolean;
  children: ReactNode;
};

export function Modal({
  open,
  onClose,
  size = "md",
  width,
  height,
  closeOnOverlay = true,
  children,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mount → animate in; close → animate out → unmount
  useEffect(() => {
    if (open) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setMounted(true);
    } else {
      setVisible(false);
      timerRef.current = setTimeout(() => setMounted(false), 200);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
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
    return () => { document.body.style.overflow = prev; };
  }, [mounted]);

  // ESC to close
  useEffect(() => {
    if (!mounted) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mounted, onClose]);

  if (!mounted) return null;

  // "full" without custom dims → edge-to-edge (no overlay padding, no rounding)
  const hasCustomDims = !!(width || height);
  const isFullScreen = size === "full" && !hasCustomDims;

  // Overlay padding: full-screen needs none so the panel truly fills the viewport
  const overlayPadding = isFullScreen ? "p-0" : "p-4";

  // Panel width/height Tailwind classes
  let panelSizeClass: string;
  if (isFullScreen) {
    panelSizeClass = "w-full h-full max-w-none";
  } else if (hasCustomDims) {
    // Custom dims arrive via style; only suppress max-w if width is set
    panelSizeClass = `${width ? "max-w-none" : sizeMaxW[size]} ${height ? "" : "max-h-[calc(100vh-2rem)]"}`;
  } else {
    panelSizeClass = `${sizeMaxW[size]} max-h-[calc(100vh-2rem)]`;
  }

  const panelStyle: React.CSSProperties = {};
  if (width) panelStyle.width = width;
  if (height) panelStyle.height = height;

  const panelRounding = isFullScreen ? "rounded-none" : "rounded-xl";

  return createPortal(
    <ModalCtx.Provider value={{ onClose }}>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${overlayPadding} ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Backdrop */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-zinc-900/30 backdrop-blur-[2px]"
          onClick={closeOnOverlay ? onClose : undefined}
        />

        {/* Panel — flex column so header/footer stay pinned and content scrolls */}
        <div
          role="dialog"
          aria-modal="true"
          style={panelStyle}
          className={`relative z-10 flex w-full flex-col overflow-hidden border border-zinc-200 bg-white shadow-xl shadow-zinc-900/[0.12] ring-1 ring-zinc-900/[0.04] transition-[opacity,transform] duration-200 ${panelRounding} ${panelSizeClass} ${
            visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
        >
          {children}
        </div>
      </div>
    </ModalCtx.Provider>,
    document.body,
  );
}

// ── ModalHeader ───────────────────────────────────────────────────────────────
// Renders children in a flex-1 zone + close button pinned to the right.

export function ModalHeader({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { onClose } = useModalCtx();
  return (
    <div
      className={`flex shrink-0 items-start justify-between gap-4 border-b border-zinc-100 px-6 py-5 ${className}`}
    >
      <div className="flex-1">{children}</div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
      >
        <XIcon />
      </button>
    </div>
  );
}

// ── ModalTitle ────────────────────────────────────────────────────────────────

export function ModalTitle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2 className={`text-sm font-medium tracking-tight text-zinc-900 ${className}`}>
      {children}
    </h2>
  );
}

// ── ModalContent ──────────────────────────────────────────────────────────────

export function ModalContent({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-h-0 flex-1 overflow-y-auto px-6 py-5 text-sm text-zinc-600 ${className}`}>
      {children}
    </div>
  );
}

// ── ModalFooter ───────────────────────────────────────────────────────────────

export function ModalFooter({
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

// ── ConfirmModal ───────────────────────────────────────────────────────────────

function DangerIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 text-red-500"
      aria-hidden="true"
    >
      <path d="M7.13 2.64 1.27 12.5A1 1 0 0 0 2.14 14h11.72a1 1 0 0 0 .87-1.5L8.87 2.64a1 1 0 0 0-1.74 0Z" />
      <path d="M8 6.5V9.5M8 11v.5" />
    </svg>
  );
}

export type ConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
};

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <ModalHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-50">
            <DangerIcon />
          </span>
          <ModalTitle>{title}</ModalTitle>
        </div>
      </ModalHeader>

      <ModalContent>{description}</ModalContent>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant="primary"
          className="bg-red-600 hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500/30"
          onClick={onConfirm}
          loading={loading}
          autoFocus
        >
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
