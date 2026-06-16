import type { HTMLAttributes, ReactNode } from "react";
import { Tooltip } from "@/components/ui/tooltip";
export type BadgeVariant = "success" | "warning" | "danger" | "neutral" | "info";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  children: ReactNode;
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
  className = "",
  children,
  ...props
}: BadgeProps) {
  const tooltipContent = tooltip?.trim() ?? "";
  const hasTooltip = tooltipContent.length > 0;

  const badgeContent = (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium cursor-default ${variantStyles[variant]} ${className}`}
      data-tooltip-content={hasTooltip ? tooltip : undefined}
      data-tooltip-id={hasTooltip ? "tooltip" : undefined}
      {...props}
    >
      {children}
    </span>
  );

  if (!hasTooltip) return badgeContent;

  return <Tooltip content={tooltipContent}>{badgeContent}</Tooltip>;
}
