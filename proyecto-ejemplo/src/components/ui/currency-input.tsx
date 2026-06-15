"use client";

import { useId } from "react";
import { useFormFieldCtx } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import type { InputState } from "@/components/ui/input";
import { useFormattedInput } from "@/lib/formatting/use-formatted-input";
import { currencyFormatter } from "@/lib/formatting/formatters/currency";

// ── Styles ─────────────────────────────────────────────────────────────────────

const hintStyles: Record<InputState, string> = {
  default: "text-zinc-400",
  error: "text-red-500",
  success: "text-emerald-600",
};

// ── Types ──────────────────────────────────────────────────────────────────────

export type CurrencyInputProps = {
  /** Numeric value in ARS. Undefined represents an empty field. */
  value?: number;
  /** Emits the parsed numeric value, or undefined when the field is cleared. */
  onChange?: (value: number | undefined) => void;
  onBlur?: () => void;
  state?: InputState;
  label?: string;
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
};

// ── Component ──────────────────────────────────────────────────────────────────

export function CurrencyInput({
  value,
  onChange,
  onBlur,
  state: stateProp,
  label,
  hint,
  placeholder = "0,00",
  disabled = false,
  id: idProp,
  className = "",
}: CurrencyInputProps) {
  const ctx = useFormFieldCtx();
  const generatedId = useId();

  const id = idProp ?? ctx?.id ?? generatedId;
  const state = (stateProp ?? (ctx?.state as InputState) ?? "default") as InputState;

  const { ref, inputProps } = useFormattedInput({
    formatter: currencyFormatter,
    value,
    onChange,
    onBlur,
  });

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-zinc-600">
          {label}
        </label>
      )}

      <Input
        ref={ref}
        id={id}
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        disabled={disabled}
        state={state}
        className={className}
        leftIcon={
          <span aria-hidden="true" className="text-sm select-none">
            $
          </span>
        }
        {...inputProps}
      />

      {hint && <p className={`text-xs ${hintStyles[state]}`}>{hint}</p>}
    </div>
  );
}
