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
};

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  function CurrencyInput(
    {
      value,
      onChange,
      onBlur,
      unstyled = false,
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

    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const setRefs = (node: HTMLInputElement | null) => {
      inputRef.current = node;
      moneyInput.ref.current = node;
    };

    const sharedInputProps: InputHTMLAttributes<HTMLInputElement> = {
      type: "text",
      inputMode: "numeric",
      autoComplete: "off",
      placeholder,
      disabled,
      value: moneyInput.displayValue,
      onChange: moneyInput.onChange,
      onFocus: moneyInput.onFocus,
      onKeyDown: moneyInput.onKeyDown,
      onBlur: moneyInput.onBlur,
      ...props,
    };

    if (unstyled) {
      return (
        <input
          ref={setRefs}
          className={cn(className)}
          {...sharedInputProps}
        />
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
