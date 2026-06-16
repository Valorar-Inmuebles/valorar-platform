import type { HTMLAttributes, ReactNode } from "react";

export type ContextIconTone =
  | "primary"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "neutral"
  | "violet"
  | "amber";

export type ContextIconSize = "xs" | "sm" | "md" | "lg";

export type ContextIconProps = HTMLAttributes<HTMLDivElement> & {
  tone?: ContextIconTone;
  size?: ContextIconSize;
  children: ReactNode;
};

const toneStyles: Record<ContextIconTone, string> = {
  primary: "bg-blue-50 text-blue-600",
  info: "bg-sky-50 text-sky-600",
  success: "bg-green-50 text-green-600",
  warning: "bg-yellow-50 text-yellow-600",
  danger: "bg-red-50 text-red-600",
  neutral: "bg-gray-50 text-gray-600",
  violet: "bg-violet-50 text-violet-600",
  amber: "bg-amber-50 text-amber-600",
};

const sizeStyles: Record<ContextIconSize, string> = {
  xs: "size-8",
  sm: "size-9",
  md: "size-10",
  lg: "size-12",
};

export function ContextIcon({
  tone = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ContextIconProps) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl ${toneStyles[tone]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
