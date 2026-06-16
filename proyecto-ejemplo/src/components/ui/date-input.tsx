"use client";

import { Input } from "@/components/ui/input";
import type { InputState } from "@/components/ui/input";
import { useFormattedInput } from "@/lib/formatting/use-formatted-input";
import { dateFormatter } from "@/lib/formatting/formatters/date";

// ── Types ──────────────────────────────────────────────────────────────────────

export type DateInputProps = {
  /** ISO date string "YYYY-MM-DD". Undefined represents an empty field. */
  value?: string;
  /**
   * Emits an ISO date string when the typed date is complete and valid,
   * or undefined when the field is empty or the date is incomplete/invalid.
   */
  onChange?: (value: string | undefined) => void;
  onBlur?: () => void;
  state?: InputState;
  disabled?: boolean;
  id?: string;
  className?: string;
};

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Typed date input for known dates (birthdates, fixed dates).
 *
 * Display: "25/03/1985"  |  Stored value: "1985-03-25" (ISO 8601)
 *
 * This is a text-entry date field, not a calendar picker. Use DatePicker
 * from components/ui/date-picker when a calendar widget is needed.
 *
 * Always compose with FormField + Label + ErrorMessage:
 *
 *   <FormField state={fieldState.error ? "error" : "default"}>
 *     <Label required>Fecha de nacimiento</Label>
 *     <DateInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
 *     {fieldState.error && <ErrorMessage>{fieldState.error.message}</ErrorMessage>}
 *   </FormField>
 */
export function DateInput({
  value,
  onChange,
  onBlur,
  state,
  disabled,
  id,
  className,
}: DateInputProps) {
  const { ref, inputProps } = useFormattedInput({
    formatter: dateFormatter,
    value,
    onChange,
    onBlur,
  });

  return (
    <Input
      ref={ref}
      type="text"
      inputMode="numeric"
      placeholder="dd/mm/aaaa"
      autoComplete="off"
      state={state}
      disabled={disabled}
      id={id}
      className={className}
      {...inputProps}
    />
  );
}
