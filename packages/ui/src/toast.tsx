"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn } from "./lib/cn";

export type ToastVariant = "success" | "error" | "info" | "warning";

type ToastItem = {
  id: string;
  variant: ToastVariant;
  title?: string;
  message: string;
  leaving: boolean;
};

export type ToastOptions = {
  title?: string;
  duration?: number;
};

export type ToastApi = {
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
  warning: (message: string, options?: ToastOptions) => void;
};

type ToastContextValue = {
  add: (variant: ToastVariant, message: string, options?: ToastOptions) => void;
  dismiss: (id: string) => void;
  toast: ToastApi;
};

const EXIT_MS = 220;
const DEFAULT_DURATION = 4000;

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): { toast: ToastApi } {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return { toast: ctx.toast };
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
    );
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      EXIT_MS,
    );
  }, []);

  const add = useCallback(
    (variant: ToastVariant, message: string, options?: ToastOptions) => {
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      const duration = options?.duration ?? DEFAULT_DURATION;
      setToasts((prev) => [
        ...prev,
        { id, variant, message, title: options?.title, leaving: false },
      ]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const toast = useMemo<ToastApi>(
    () => ({
      success: (message, options) => add("success", message, options),
      error: (message, options) => add("error", message, options),
      info: (message, options) => add("info", message, options),
      warning: (message, options) => add("warning", message, options),
    }),
    [add],
  );

  const value = useMemo(
    () => ({ add, dismiss, toast }),
    [add, dismiss, toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function IconCheck() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden
    >
      <circle cx="8" cy="8" r="6.25" />
      <polyline points="5,8.5 7,10.5 11,6" />
    </svg>
  );
}

function IconXCircle() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden
    >
      <circle cx="8" cy="8" r="6.25" />
      <path d="m5.5 5.5 5 5M10.5 5.5l-5 5" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden
    >
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 7.5V11M8 5.25v.5" />
    </svg>
  );
}

function IconWarning() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden
    >
      <path d="M7.13 2.64 1.27 12.5A1 1 0 0 0 2.14 14h11.72a1 1 0 0 0 .87-1.5L8.87 2.64a1 1 0 0 0-1.74 0Z" />
      <path d="M8 6.5V9.5M8 11v.5" />
    </svg>
  );
}

const variantConfig: Record<
  ToastVariant,
  { bar: string; iconClass: string; icon: ReactNode }
> = {
  success: {
    bar: "bg-emerald-500",
    iconClass: "text-emerald-500",
    icon: <IconCheck />,
  },
  error: {
    bar: "bg-red-500",
    iconClass: "text-red-500",
    icon: <IconXCircle />,
  },
  info: {
    bar: "bg-indigo-500",
    iconClass: "text-indigo-500",
    icon: <IconInfo />,
  },
  warning: {
    bar: "bg-amber-500",
    iconClass: "text-amber-500",
    icon: <IconWarning />,
  },
};

function ToastEntry({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: () => void;
}) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const visible = entered && !item.leaving;
  const cfg = variantConfig[item.variant];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex w-80 overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-lg shadow-zinc-900/[0.08] transition-all duration-[220ms] ease-out",
        visible ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0",
      )}
    >
      <div className={cn("w-1 shrink-0", cfg.bar)} />

      <div className="flex flex-1 items-start gap-3 px-3.5 py-3">
        <span className={cn("mt-px shrink-0", cfg.iconClass)}>{cfg.icon}</span>

        <div className="min-w-0 flex-1">
          {item.title && (
            <p className="text-sm font-semibold leading-snug text-zinc-900">
              {item.title}
            </p>
          )}
          <p
            className={cn(
              "text-sm leading-snug",
              item.title ? "mt-0.5 text-zinc-500" : "text-zinc-700",
            )}
          >
            {item.message}
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar notificación"
          className="mt-px inline-flex size-5 shrink-0 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
        >
          <svg
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden
            className="size-2.5"
          >
            <path d="M1.5 1.5 8.5 8.5M8.5 1.5 1.5 8.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed right-4 top-4 z-50 flex flex-col-reverse gap-2"
      aria-label="Notificaciones"
    >
      {toasts.map((item) => (
        <div key={item.id} className="pointer-events-auto">
          <ToastEntry item={item} onDismiss={() => onDismiss(item.id)} />
        </div>
      ))}
    </div>
  );
}
