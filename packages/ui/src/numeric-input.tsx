"use client";

import { Input, type InputProps } from "./input";

export type NumericInputProps = Omit<
  InputProps,
  "value" | "defaultValue" | "onChange" | "type" | "inputMode"
> & {
  value: string;
  onChange: (value: string) => void;
  /** Zero for integer quantities; never strips invalid characters or rounds. */
  decimalScale?: number;
};

export function NumericInput({
  value,
  onChange,
  decimalScale = 0,
  ...props
}: NumericInputProps) {
  const pattern =
    decimalScale === 0
      ? /^\d*$/
      : new RegExp(`^\\d*(?:[.,]\\d{0,${decimalScale}})?$`);
  return (
    <Input
      {...props}
      type="text"
      inputMode={decimalScale ? "decimal" : "numeric"}
      value={value.replace(".", ",")}
      onChange={(event) => {
        const next = event.target.value;
        if (pattern.test(next)) onChange(next.replace(".", ","));
      }}
    />
  );
}
