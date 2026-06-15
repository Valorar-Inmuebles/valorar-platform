import type { SVGAttributes } from "react";

export type SpinnerSize = "sm" | "md" | "lg";

const sizeClass: Record<SpinnerSize, string> = {
  sm: "size-3.5",
  md: "size-5",
  lg: "size-6",
};

export type SpinnerProps = SVGAttributes<SVGElement> & {
  size?: SpinnerSize;
};

export function Spinner({ size = "md", className = "", ...props }: SpinnerProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="Loading"
      className={`animate-spin text-zinc-400 ${sizeClass[size]} ${className}`}
      {...props}
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
