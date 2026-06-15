"use client";

import { Input } from "@/components/ui/input";
import type { InputState } from "@/components/ui/input";
import { useFormattedInput } from "@/lib/formatting/use-formatted-input";
import { phoneFormatter } from "@/lib/formatting/formatters/phone";

// ── Types ──────────────────────────────────────────────────────────────────────

export type PhoneInputProps = {
  /** Raw phone digits (no spaces or dashes): "01144445678". Undefined represents an empty field. */
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
 * Formatted Argentine phone input (simple 3-4-4 structural grouping).
 *
 * Display: "011 4444-5678"  |  Stored value: "01144445678"
 *
 * Designed for Buenos Aires landline format. Digits only; max 11 characters.
 *
 * Always compose with FormField + Label + ErrorMessage:
 *
 *   <FormField state={fieldState.error ? "error" : "default"}>
 *     <Label required>Teléfono</Label>
 *     <PhoneInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
 *     {fieldState.error && <ErrorMessage>{fieldState.error.message}</ErrorMessage>}
 *   </FormField>
 */
export function PhoneInput({
  value,
  onChange,
  onBlur,
  state,
  disabled,
  id,
  className,
}: PhoneInputProps) {
  const { ref, inputProps } = useFormattedInput({
    formatter: phoneFormatter,
    value,
    onChange,
    onBlur,
  });

  return (
    <Input
      ref={ref}
      type="text"
      inputMode="tel"
      placeholder="011 4444-5678"
      autoComplete="tel"
      state={state}
      disabled={disabled}
      id={id}
      className={className}
      {...inputProps}
    />
  );
}
