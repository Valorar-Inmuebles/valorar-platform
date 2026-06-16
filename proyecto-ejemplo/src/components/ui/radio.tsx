"use client";

import { useId, type InputHTMLAttributes } from "react";

export type RadioSize = "sm" | "md" | "lg";

export type RadioProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
> & {
  size?: RadioSize;
  label?: string;
};

const boxSize: Record<RadioSize, string> = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-[1.125rem]",
};

const dotSize: Record<RadioSize, string> = {
  sm: "size-1.5",
  md: "size-2",
  lg: "size-2.5",
};

const labelText: Record<RadioSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-sm",
};

export function Radio({
  size = "md",
  label,
  className = "",
  id: idProp,
  disabled,
  ...props
}: RadioProps) {
  const genId = useId();
  const id = idProp ?? genId;
  const bs = boxSize[size];
  const ds = dotSize[size];

  return (
    <div
      className={`inline-flex items-center gap-2 ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      } ${className}`}
    >
      {/*
        Container is inline-flex + explicit size.
        Input is absolute inset-0 to remove it from flow and eliminate
        any browser baseline / margin offset.
        Dot is a peer sibling (comes after the input in the DOM) so
        peer-checked: variants work, and it uses flexbox centering.
      */}
      <div className={`relative inline-flex shrink-0 ${bs}`}>
        <input
          type="radio"
          id={id}
          disabled={disabled}
          className={`peer absolute inset-0 m-0 cursor-pointer appearance-none rounded-full border border-zinc-300 bg-white transition-all duration-150 checked:border-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-500/30 focus-visible:ring-offset-1 disabled:cursor-not-allowed`}
          {...props}
        />
        {/*
          Outer span is a direct sibling of the peer input — peer-checked
          works here. scale-0 → scale-100 animates the dot in.
          Inner span is the visual dot, always at its final size, flex-centered.
        */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center scale-0 transition-transform duration-150 peer-checked:scale-100"
        >
          <span className={`${ds} rounded-full bg-indigo-600`} />
        </span>
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
