"use client";

import { useId, type InputHTMLAttributes } from "react";

export type SwitchSize = "sm" | "md" | "lg";

export type SwitchProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
> & {
  size?: SwitchSize;
  label?: string;
};

// Full literal class names so Tailwind JIT picks them up during scanning.
const sizeStyles: Record<
  SwitchSize,
  { track: string; thumb: string; peerTranslate: string }
> = {
  sm: {
    track: "h-4 w-7",
    thumb: "size-3",
    peerTranslate: "peer-checked:translate-x-3",
  },
  md: {
    track: "h-5 w-9",
    thumb: "size-4",
    peerTranslate: "peer-checked:translate-x-4",
  },
  lg: {
    track: "h-6 w-11",
    thumb: "size-5",
    peerTranslate: "peer-checked:translate-x-5",
  },
};

const labelText: Record<SwitchSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-sm",
};

export function Switch({
  size = "md",
  label,
  className = "",
  id: idProp,
  disabled,
  ...props
}: SwitchProps) {
  const genId = useId();
  const id = idProp ?? genId;
  const { track, thumb, peerTranslate } = sizeStyles[size];

  return (
    <div
      className={`inline-flex items-center gap-2 ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      } ${className}`}
    >
      <div className="relative shrink-0">
        {/* sr-only input carries the accessible state */}
        <input
          type="checkbox"
          role="switch"
          id={id}
          disabled={disabled}
          className="peer sr-only"
          {...props}
        />
        {/* Track — label so clicking it toggles the hidden input */}
        <label
          htmlFor={id}
          className={`block ${track} rounded-full border border-zinc-300 bg-zinc-200 transition-all duration-200 peer-checked:border-indigo-600 peer-checked:bg-indigo-600 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500/30 peer-focus-visible:ring-offset-1 ${
            disabled ? "cursor-not-allowed" : "cursor-pointer"
          }`}
        />
        {/* Thumb */}
        <span
          aria-hidden
          className={`pointer-events-none absolute left-0.5 top-0.5 ${thumb} rounded-full bg-white shadow-sm transition-transform duration-200 ${peerTranslate}`}
        />
      </div>

      {label != null && (
        <label
          htmlFor={id}
          className={`${labelText[size]} select-none text-zinc-700 ${
            disabled ? "cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          {label}
        </label>
      )}
    </div>
  );
}
