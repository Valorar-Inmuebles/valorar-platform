"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

export type SelectableCardProps = Omit<
  HTMLAttributes<HTMLButtonElement>,
  "onClick"
> & {
  title: string;
  description?: string;
  selected?: boolean;
  disabled?: boolean;
  recommended?: boolean;
  onSelect?: () => void;
  leading?: ReactNode;
  children?: ReactNode;
};

export function SelectableCard({
  title,
  description,
  selected = false,
  disabled = false,
  recommended = false,
  onSelect,
  leading,
  children,
  className = "",
  ...props
}: SelectableCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full rounded-xl border bg-white p-4 text-left outline-none transition-colors duration-150 ${
        disabled
          ? "cursor-not-allowed border-zinc-200 opacity-60"
          : selected
            ? "border-indigo-500 ring-2 ring-indigo-500/10"
            : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
      } focus-visible:ring-2 focus-visible:ring-indigo-500/20 ${className}`}
      {...props}
    >
      <div className="flex items-start gap-3">
        {leading ? <div className="shrink-0">{leading}</div> : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-zinc-900">{title}</span>
                {recommended ? (
                  <Badge variant="info">Recomendado</Badge>
                ) : null}
              </div>
              {description ? (
                <p className="text-sm text-zinc-500">{description}</p>
              ) : null}
            </div>
            <span
              className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border ${
                selected
                  ? "border-indigo-600 bg-indigo-600"
                  : "border-zinc-300 bg-white"
              }`}
              aria-hidden
            >
              {selected ? (
                <span className="size-1.5 rounded-full bg-white" />
              ) : null}
            </span>
          </div>
          {children ? (
            <div className="mt-3 border-t border-zinc-100 pt-3">{children}</div>
          ) : null}
        </div>
      </div>
    </button>
  );
}
