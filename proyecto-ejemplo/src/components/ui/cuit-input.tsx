"use client";

import { Input } from "@/components/ui/input";
import type { InputState } from "@/components/ui/input";
import { useFormattedInput } from "@/lib/formatting/use-formatted-input";
import { cuitFormatter } from "@/lib/formatting/formatters/cuit";

// ── Types ──────────────────────────────────────────────────────────────────────

export type CuitInputProps = {
  /** Raw CUIT/CUIL digits (no dashes): "20123456780". Undefined represents an empty field. */
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
 * Formatted CUIT/CUIL input.
 *
 * Display: "20-12345678-0"  |  Stored value: "20123456780"
 *
 * Always compose with FormField + Label + ErrorMessage:
 *
 *   <FormField state={fieldState.error ? "error" : "default"}>
 *     <Label required>CUIT</Label>
 *     <CuitInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
 *     {fieldState.error && <ErrorMessage>{fieldState.error.message}</ErrorMessage>}
 *   </FormField>
 */
export function CuitInput({
  value,
  onChange,
  onBlur,
  state,
  disabled,
  id,
  className,
}: CuitInputProps) {
  const { ref, inputProps } = useFormattedInput({
    formatter: cuitFormatter,
    value,
    onChange,
    onBlur,
  });

  return (
    <Input
      ref={ref}
      type="text"
      inputMode="numeric"
      placeholder="20-12345678-0"
      autoComplete="off"
      state={state}
      disabled={disabled}
      id={id}
      className={className}
      {...inputProps}
    />
  );
}
