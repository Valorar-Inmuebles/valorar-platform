"use client";

import { useEffect, useId, useRef, type InputHTMLAttributes } from "react";

export type CheckboxSize = "sm" | "md" | "lg";

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
> & {
  size?: CheckboxSize;
  label?: string;
  indeterminate?: boolean;
};

const boxSize: Record<CheckboxSize, string> = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-[1.125rem]",
};

const labelText: Record<CheckboxSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-sm",
};

export function Checkbox({
  size = "md",
  label,
  className = "",
  id: idProp,
  disabled,
  indeterminate,
  ...props
}: CheckboxProps) {
  const genId = useId();
  const id = idProp ?? genId;
  const bs = boxSize[size];
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate ?? false;
    }
  }, [indeterminate]);

  return (
    <div
      className={`inline-flex items-center gap-2 ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      } ${className}`}
    >
      {/*
        Container is inline-flex + explicit size.
        Both the input and the SVG overlay are pulled out of normal flow
        with absolute inset-0 so nothing fights for layout space and
        there is no baseline / line-height offset from the input.
      */}
      <div className={`relative inline-flex shrink-0 items-center justify-center ${bs}`}>
        <input
          ref={inputRef}
          type="checkbox"
          id={id}
          disabled={disabled}
          className={`peer absolute inset-0 m-0 cursor-pointer appearance-none rounded-[4px] border border-zinc-300 bg-white transition-all duration-150 checked:border-indigo-600 checked:bg-indigo-600 indeterminate:border-indigo-600 indeterminate:bg-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-500/30 focus-visible:ring-offset-1 disabled:cursor-not-allowed`}
          {...props}
        />
        {/* Checkmark — shown when checked */}
        <svg
          viewBox="0 0 12 12"
          fill="none"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="pointer-events-none w-2.5 h-2.5 z-10 opacity-0 transition-opacity duration-100 peer-checked:opacity-100"
        >
          <polyline points="1.5,6.5 4.5,9.5 10.5,2.5" />
        </svg>
        {/* Dash — shown when indeterminate */}
        <svg
          viewBox="0 0 12 12"
          fill="none"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden
          className="pointer-events-none absolute w-2.5 h-2.5 z-10 opacity-0 transition-opacity duration-100 peer-indeterminate:opacity-100"
        >
          <line x1="2" y1="6" x2="10" y2="6" />
        </svg>
      </div>

      {label != null && (
        <label
          htmlFor={id}
          className={`${labelText[size]} leading-none select-none text-zinc-700 ${
            disabled ? "cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          {label}
        </label>
      )}
    </div>
  );
}
