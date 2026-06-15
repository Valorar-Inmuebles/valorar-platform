import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline-primary"
  | "outline-secondary";

export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus-visible:ring-blue-500/30 disabled:bg-blue-300",
  secondary:
    "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100 focus-visible:ring-gray-500/20 disabled:text-gray-400",
  ghost:
    "text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 focus-visible:ring-gray-500/20 disabled:text-gray-300",
  "outline-primary":
    "border border-blue-500 text-blue-600 hover:bg-blue-50 active:bg-blue-100 focus-visible:ring-blue-500/30 disabled:border-blue-200 disabled:text-blue-400",
  "outline-secondary":
    "border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100 focus-visible:ring-gray-500/20 disabled:border-gray-200 disabled:text-gray-400",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-6 px-2.5 text-xs",
  md: "h-8 px-3 text-sm",
  lg: "h-9 px-3.5 text-sm",
};

const spinnerSize: Record<ButtonSize, string> = {
  sm: "size-3",
  md: "size-3.5",
  lg: "size-4",
};

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin ${className ?? ""}`}
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="42 14"
      />
    </svg>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  className = "",
  children,
  type = "button",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <Spinner className={spinnerSize[size]} />
      ) : leftIcon != null ? (
        <span className="inline-flex shrink-0">{leftIcon}</span>
      ) : null}

      {children}

      {!loading && rightIcon != null && (
        <span className="inline-flex shrink-0">{rightIcon}</span>
      )}
    </button>
  );
}
