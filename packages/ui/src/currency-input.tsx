"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type InputHTMLAttributes,
} from "react";
import { Input, type InputProps } from "./input";
import { cn } from "./lib/cn";
import { useMoneyInput } from "./lib/use-money-input";

export type CurrencyInputProps = Omit<
  InputProps,
  "type" | "value" | "onChange" | "inputMode" | "defaultValue"
> & {
  /** Raw digit string, e.g. "1250000". Empty string when cleared. */
  value: string;
  onChange: (value: string) => void;
  /** Renders a native input without the shared Input chrome (for custom layouts). */
  unstyled?: boolean;
  /** Accepts a comma decimal separator and keeps at most two decimal places. */
  allowDecimals?: boolean;
};

function sanitizeDecimalInput(input: string): string {
  const commaIndex = input.lastIndexOf(",");
  const integer = (
    commaIndex >= 0 ? input.slice(0, commaIndex) : input
  ).replace(/\D/g, "");
  const normalizedInteger = integer ? String(Number.parseInt(integer, 10)) : "";
  if (commaIndex < 0) return normalizedInteger;
  const decimal = input
    .slice(commaIndex + 1)
    .replace(/\D/g, "")
    .slice(0, 2);
  return `${normalizedInteger || "0"}.${decimal}`;
}

function formatDecimalInput(value: string): string {
  if (!value) return "";
  const [integer = "0", decimal] = value.split(".");
  const formattedInteger = new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(Number(integer || 0));
  return decimal === undefined
    ? formattedInteger
    : `${formattedInteger},${decimal}`;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  function CurrencyInput(
    {
      value,
      onChange,
      onBlur,
      unstyled = false,
      allowDecimals = false,
      className,
      disabled,
      loading,
      placeholder = "0",
      ...props
    },
    ref,
  ) {
    const inputRef = useRef<HTMLInputElement>(null);
    const moneyInput = useMoneyInput({ value, onChange, onBlur });
    const decimalInput = {
      displayValue: formatDecimalInput(value),
      onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
        onChange(sanitizeDecimalInput(event.target.value)),
      onFocus: undefined,
      onKeyDown: undefined,
      onBlur: (event: React.FocusEvent<HTMLInputElement>) => {
        if (value.endsWith(".")) onChange(value.slice(0, -1));
        onBlur?.(event);
      },
    };
    const inputBehavior = allowDecimals ? decimalInput : moneyInput;

    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const setRefs = (node: HTMLInputElement | null) => {
      inputRef.current = node;
      moneyInput.ref.current = node;
    };

    const sharedInputProps: InputHTMLAttributes<HTMLInputElement> = {
      type: "text",
      inputMode: allowDecimals ? "decimal" : "numeric",
      autoComplete: "off",
      placeholder,
      disabled,
      value: inputBehavior.displayValue,
      onChange: inputBehavior.onChange,
      onFocus: inputBehavior.onFocus,
      onKeyDown: inputBehavior.onKeyDown,
      onBlur: inputBehavior.onBlur,
      ...props,
    };

    if (unstyled) {
      return (
        <input ref={setRefs} className={cn(className)} {...sharedInputProps} />
      );
    }

    return (
      <Input
        ref={setRefs}
        className={className}
        disabled={disabled}
        loading={loading}
        {...sharedInputProps}
      />
    );
  },
);

CurrencyInput.displayName = "CurrencyInput";
