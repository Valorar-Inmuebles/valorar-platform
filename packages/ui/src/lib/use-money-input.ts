"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEventHandler,
  type FocusEventHandler,
  type KeyboardEventHandler,
  type RefObject,
} from "react";
import {
  formatMoneyInput,
  sanitizeMoneyInput,
} from "@repo/shared-types/format-money";
import { toFormattedPos, toRawPos } from "./money-input-cursor";

const isSeparator = (char: string) => char === ".";

type UseMoneyInputOptions = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: FocusEventHandler<HTMLInputElement>;
};

export type UseMoneyInputReturn = {
  ref: RefObject<HTMLInputElement | null>;
  displayValue: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onFocus: FocusEventHandler<HTMLInputElement>;
  onKeyDown: KeyboardEventHandler<HTMLInputElement>;
  onBlur: FocusEventHandler<HTMLInputElement>;
};

export function useMoneyInput({
  value,
  onChange,
  onBlur,
}: UseMoneyInputOptions): UseMoneyInputReturn {
  const ref = useRef<HTMLInputElement>(null);
  const isFocusedRef = useRef(false);
  const pendingCursor = useRef<number | null>(null);

  const [displayValue, setDisplayValue] = useState(() => formatMoneyInput(value));

  useEffect(() => {
    if (!isFocusedRef.current) {
      setDisplayValue(formatMoneyInput(value));
    }
  }, [value]);

  useLayoutEffect(() => {
    if (pendingCursor.current !== null && ref.current) {
      const pos = pendingCursor.current;
      pendingCursor.current = null;
      ref.current.setSelectionRange(pos, pos);
    }
  });

  function applyChange(typedValue: string, typedCursor: number) {
    const rawCursor = toRawPos(typedValue, typedCursor, isSeparator);
    const raw = sanitizeMoneyInput(typedValue);
    const formatted = formatMoneyInput(raw);
    pendingCursor.current = toFormattedPos(formatted, rawCursor, isSeparator);
    setDisplayValue(formatted);
    onChange(raw);
  }

  function handleChange(event: Parameters<ChangeEventHandler<HTMLInputElement>>[0]) {
    applyChange(
      event.target.value,
      event.target.selectionStart ?? event.target.value.length,
    );
  }

  function handleKeyDown(event: Parameters<KeyboardEventHandler<HTMLInputElement>>[0]) {
    const el = ref.current;
    if (!el) return;

    const pos = el.selectionStart ?? 0;
    const selEnd = el.selectionEnd ?? 0;
    const val = el.value;

    if (pos !== selEnd) return;

    if (event.key === "Backspace" && pos > 0 && isSeparator(val[pos - 1] ?? "")) {
      event.preventDefault();
      applyChange(val.slice(0, pos - 2) + val.slice(pos), pos - 2);
    } else if (
      event.key === "Delete" &&
      pos < val.length &&
      isSeparator(val[pos] ?? "")
    ) {
      event.preventDefault();
      applyChange(val.slice(0, pos) + val.slice(pos + 2), pos);
    }
  }

  function handleFocus() {
    isFocusedRef.current = true;
  }

  function handleBlur(event: Parameters<FocusEventHandler<HTMLInputElement>>[0]) {
    isFocusedRef.current = false;
    const raw = sanitizeMoneyInput(displayValue);
    const formatted = formatMoneyInput(raw);
    setDisplayValue(formatted);
    onChange(raw);
    onBlur?.(event);
  }

  return {
    ref,
    displayValue,
    onChange: handleChange,
    onFocus: handleFocus,
    onKeyDown: handleKeyDown,
    onBlur: handleBlur,
  };
}
