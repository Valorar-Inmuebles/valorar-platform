import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./lib/cn";

export type BadgeVariant = "success" | "warning" | "danger" | "neutral" | "info";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  children: ReactNode;
  /** Native tooltip text */
  tooltip?: string;
};

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  danger: "bg-red-100 text-red-700",
  neutral: "bg-gray-100 text-gray-600",
  info: "bg-blue-100 text-blue-700",
};

export function Badge({
  variant = "neutral",
  tooltip,
  className,
  children,
  title,
  ...props
}: BadgeProps) {
  return (
    <span
      title={tooltip ?? title}
      className={cn(
        "inline-flex cursor-default items-center rounded-md px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
