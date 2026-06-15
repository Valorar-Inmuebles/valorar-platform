"use client";

import { Input } from "@/components/ui/input";
import type { InputState } from "@/components/ui/input";
import { useFormattedInput } from "@/lib/formatting/use-formatted-input";
import { dniFormatter } from "@/lib/formatting/formatters/dni";

// ── Types ──────────────────────────────────────────────────────────────────────

export type DniInputProps = {
  /** Raw DNI digits (no dots): "12345678". Undefined represents an empty field. */
  value?: string;
  /** Emits raw digits, or undefined when the field is cleared. */
  onChange?: (value: string | undefined) => void;
  onBlur?: () => void;
  state?: InputState;
  disabled?: boolean;
  id?: string;
  className?: string;
};

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Formatted DNI input.
 *
 * Display: "12.345.678"  |  Stored value: "12345678"
 *
 * Always compose with FormField + Label + ErrorMessage:
 *
 *   <FormField state={fieldState.error ? "error" : "default"}>
 *     <Label required>DNI</Label>
 *     <DniInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
 *     {fieldState.error && <ErrorMessage>{fieldState.error.message}</ErrorMessage>}
 *   </FormField>
 */
export function DniInput({
  value,
  onChange,
  onBlur,
  state,
  disabled,
  id,
  className,
}: DniInputProps) {
  const { ref, inputProps } = useFormattedInput({
    formatter: dniFormatter,
    value,
    onChange,
    onBlur,
  });

  return (
    <Input
      ref={ref}
      type="text"
      inputMode="numeric"
      placeholder="12.345.678"
      autoComplete="off"
      state={state}
      disabled={disabled}
      id={id}
      className={className}
      {...inputProps}
    />
  );
}
