"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { useFormFieldCtx } from "@/components/ui/form-field";
import { useInputGroupCtx } from "@/components/ui/input-group";

function InputSpinner() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className="size-3.5 animate-spin text-zinc-400"
      aria-hidden="true"
    >
      <circle
        cx="8"
        cy="8"
        r="5.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="24 10"
      />
    </svg>
  );
}

export type InputState = "default" | "error" | "success";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  state?: InputState;
  label?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  /** Shows a spinner in the right slot and makes the input read-only. */
  loading?: boolean;
};

const borderStyles: Record<InputState, string> = {
  default:
    "border-zinc-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10",
  error:
    "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-500/10",
  success:
    "border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10",
};

const hintStyles: Record<InputState, string> = {
  default: "text-zinc-400",
  error: "text-red-500",
  success: "text-emerald-600",
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    state: stateProp,
    label,
    hint,
    leftIcon,
    rightIcon,
    loading = false,
    className = "",
    id: idProp,
    disabled,
    ...props
  },
  ref,
) {
  const ctx      = useFormFieldCtx();
  const groupCtx = useInputGroupCtx();

  // Props → FormField context → InputGroup context → default
  const id    = idProp ?? ctx?.id;
  const state: InputState =
    stateProp ?? (ctx?.state as InputState) ?? (groupCtx?.state as InputState) ?? "default";

  const isGrouped = groupCtx != null;

  // Loading spinner overrides any provided rightIcon
  const trailingIcon = loading ? <InputSpinner /> : rightIcon;

  const pl      = leftIcon != null ? "pl-8" : "pl-3";
  const pr      = trailingIcon != null ? "pr-8" : "pr-3";
  // Rounding is resolved by InputGroup at render time; fallback to rounded-lg standalone
  const rounded = groupCtx?.inputRounding ?? "rounded-lg";

  return (
    <div className={isGrouped ? "relative z-[1] flex-1 focus-within:z-[2]" : "flex flex-col gap-1.5"}>
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-zinc-600">
          {label}
        </label>
      )}

      <div className="relative">
        {leftIcon != null && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-zinc-400">
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          id={id}
          disabled={disabled || loading}
          aria-describedby={state === "error" && ctx?.errorId ? ctx.errorId : undefined}
          aria-invalid={state === "error" || undefined}
          className={`h-8 w-full border bg-white text-sm text-zinc-900 outline-none placeholder:text-zinc-400 transition-all duration-150 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400 ${rounded} ${pl} ${pr} ${borderStyles[state]} ${className}`}
          {...props}
        />

        {trailingIcon != null && (
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-zinc-400">
            {trailingIcon}
          </span>
        )}
      </div>

      {hint && <p className={`text-xs ${hintStyles[state]}`}>{hint}</p>}
    </div>
  );
});

Input.displayName = "Input";
