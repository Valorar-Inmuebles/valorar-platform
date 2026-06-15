"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { ActionIconButton } from "@/components/ui/action-icon-button";

export type InfoBannerVariant = "info" | "success" | "warning" | "error";

export type InfoBannerProps = HTMLAttributes<HTMLDivElement> & {
  variant?: InfoBannerVariant;
  title?: string;
  children: ReactNode;
  onDismiss?: () => void;
};

const variantStyles: Record<
  InfoBannerVariant,
  { container: string; title: string; body: string }
> = {
  info: {
    container: "border-blue-200 bg-blue-50",
    title: "text-blue-900",
    body: "text-blue-800",
  },
  success: {
    container: "border-emerald-200 bg-emerald-50",
    title: "text-emerald-900",
    body: "text-emerald-800",
  },
  warning: {
    container: "border-amber-200 bg-amber-50",
    title: "text-amber-900",
    body: "text-amber-800",
  },
  error: {
    container: "border-red-200 bg-red-50",
    title: "text-red-900",
    body: "text-red-800",
  },
};

function DismissIcon() {
  return (
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
  );
}

export function InfoBanner({
  variant = "info",
  title,
  children,
  onDismiss,
  className = "",
  ...props
}: InfoBannerProps) {
  const styles = variantStyles[variant];

  return (
    <div
      role="status"
      className={`rounded-lg border px-4 py-3 text-sm ${styles.container} ${className}`}
      {...props}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {title ? (
            <p className={`font-medium ${styles.title}`}>{title}</p>
          ) : null}
          <div className={`${title ? "mt-1" : ""} ${styles.body}`}>
            {children}
          </div>
        </div>
        {onDismiss ? (
          <ActionIconButton
            type="button"
            aria-label="Cerrar"
            onClick={onDismiss}
            className="shrink-0"
          >
            <DismissIcon />
          </ActionIconButton>
        ) : null}
      </div>
    </div>
  );
}
