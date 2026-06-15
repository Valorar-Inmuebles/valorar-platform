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
import { toRawPos, toFormattedPos } from "@/lib/formatting/cursor";
import type { Formatter } from "@/lib/formatting/types";

type Options<T> = {
  formatter: Formatter<T>;
  value: T | undefined;
  onChange?: (value: T | undefined) => void;
  onBlur?: () => void;
};

export type FormattedInputHandlers = {
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onKeyDown: KeyboardEventHandler<HTMLInputElement>;
  onFocus: FocusEventHandler<HTMLInputElement>;
  onBlur: FocusEventHandler<HTMLInputElement>;
};

export type UseFormattedInputReturn = {
  ref: RefObject<HTMLInputElement | null>;
  inputProps: FormattedInputHandlers;
};

/**
 * Shared primitive for all formatted inputs.
 *
 * Manages the display ↔ raw value split, stable caret positioning across
 * re-renders, separator-skipping for Backspace/Delete, and blur normalization.
 *
 * Formatters (Formatter<T>) are expected to be stable module-level constants,
 * not inline objects, to avoid unnecessary re-runs of the sync effect.
 */
export function useFormattedInput<T>({
  formatter,
  value,
  onChange,
  onBlur,
}: Options<T>): UseFormattedInputReturn {
  const ref = useRef<HTMLInputElement>(null);
  const isFocusedRef = useRef(false);
  const pendingCursor = useRef<number | null>(null);

  const [displayValue, setDisplayValue] = useState(() =>
    value != null ? formatter.display(value) : "",
  );

  // Sync external value changes while the field is not focused.
  // Skipped during editing to prevent fighting the user's keystrokes.
  useEffect(() => {
    if (!isFocusedRef.current) {
      setDisplayValue(value != null ? formatter.display(value) : "");
    }
  }, [value, formatter]);

  // Restore the computed caret position after React syncs the DOM.
  // Runs after every render; the ref guard makes it a no-op when not pending.
  useLayoutEffect(() => {
    if (pendingCursor.current !== null && ref.current) {
      const pos = pendingCursor.current;
      pendingCursor.current = null;
      ref.current.setSelectionRange(pos, pos);
    }
  });

  /**
   * Core pipeline shared by handleChange and the Backspace/Delete intercepts.
   *
   * @param typedValue  The raw string from the DOM input (may contain old separators).
   * @param typedCursor The cursor position inside typedValue before formatting.
   */
  function applyChange(typedValue: string, typedCursor: number) {
    const rawCursor = toRawPos(typedValue, typedCursor, formatter.isSeparator);
    const raw = formatter.sanitize(typedValue);
    const formatted = formatter.format(raw);
    pendingCursor.current = toFormattedPos(formatted, rawCursor, formatter.isSeparator);
    setDisplayValue(formatted);
    onChange?.(formatter.parse(raw));
  }

  function handleChange(e: Parameters<ChangeEventHandler<HTMLInputElement>>[0]) {
    applyChange(
      e.target.value,
      e.target.selectionStart ?? e.target.value.length,
    );
  }

  /**
   * Intercepts Backspace/Delete when the caret is adjacent to a separator.
   * Without this, the separator would be stripped and re-added by the formatter,
   * making the key feel like it did nothing.
   */
  function handleKeyDown(e: Parameters<KeyboardEventHandler<HTMLInputElement>>[0]) {
    const el = ref.current;
    if (!el) return;

    const pos = el.selectionStart ?? 0;
    const selEnd = el.selectionEnd ?? 0;
    const val = el.value;

    if (pos !== selEnd) return; // selection range active — let browser handle

    if (e.key === "Backspace" && pos > 0 && formatter.isSeparator(val[pos - 1])) {
      e.preventDefault();
      applyChange(val.slice(0, pos - 2) + val.slice(pos), pos - 2);
    } else if (e.key === "Delete" && pos < val.length && formatter.isSeparator(val[pos])) {
      e.preventDefault();
      applyChange(val.slice(0, pos) + val.slice(pos + 2), pos);
    }
  }

  function handleFocus(e: Parameters<FocusEventHandler<HTMLInputElement>>[0]) {
    isFocusedRef.current = true;
    requestAnimationFrame(() => e.target.select());
  }

  function handleBlur() {
    isFocusedRef.current = false;
    const raw = formatter.sanitize(displayValue);
    const finalized = formatter.finalize(raw);
    setDisplayValue(finalized);
    onChange?.(formatter.parse(raw));
    onBlur?.();
  }

  return {
    ref,
    inputProps: {
      value: displayValue,
      onChange: handleChange,
      onKeyDown: handleKeyDown,
      onFocus: handleFocus,
      onBlur: handleBlur as FocusEventHandler<HTMLInputElement>,
    },
  };
}
