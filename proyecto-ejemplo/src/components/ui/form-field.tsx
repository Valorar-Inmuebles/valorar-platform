"use client";

import {
  createContext,
  useContext,
  useId,
  useState,
  type ChangeEvent,
  type HTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
} from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type FieldState = "default" | "error" | "success";

// ── Context ───────────────────────────────────────────────────────────────────

type FormFieldContextValue = {
  id: string;
  errorId: string;
  state: FieldState;
};

const FormFieldContext = createContext<FormFieldContextValue | null>(null);

export function useFormFieldCtx() {
  return useContext(FormFieldContext);
}

// ── FormField ─────────────────────────────────────────────────────────────────

export type FormFieldProps = Omit<HTMLAttributes<HTMLDivElement>, "id"> & {
  /**
   * Explicit field id. Auto-generated via useId when omitted.
   * Passed to Label (htmlFor) and ErrorMessage (id) via context.
   */
  id?: string;
  state?: FieldState;
  children: ReactNode;
};

export function FormField({
  id: idProp,
  state = "default",
  className = "",
  children,
  ...props
}: FormFieldProps) {
  const generated = useId();
  const id = idProp ?? generated;
  const errorId = `${id}-error`;

  return (
    <FormFieldContext.Provider value={{ id, errorId, state }}>
      <div className={`flex flex-col gap-1.5 ${className}`} {...props}>
        {children}
      </div>
    </FormFieldContext.Provider>
  );
}

// ── Label ─────────────────────────────────────────────────────────────────────

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  children: ReactNode;
  /** Appends a red asterisk */
  required?: boolean;
};

export function Label({
  children,
  required,
  htmlFor,
  className = "",
  ...props
}: LabelProps) {
  const ctx = useFormFieldCtx();

  return (
    <label
      htmlFor={htmlFor ?? ctx?.id}
      className={`text-xs font-medium text-zinc-600 ${className}`}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-0.5 text-red-500" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

// ── HelperText ────────────────────────────────────────────────────────────────

export type HelperTextProps = HTMLAttributes<HTMLParagraphElement> & {
  children: ReactNode;
};

export function HelperText({
  children,
  className = "",
  ...props
}: HelperTextProps) {
  return (
    <p
      className={`text-xs leading-snug text-zinc-400 ${className}`}
      {...props}
    >
      {children}
    </p>
  );
}

// ── useField ──────────────────────────────────────────────────────────────────
// Manages value, touched state, and validation for a single input field.

export type ValidationRules = {
  /** Field must be non-empty. Pass a string to customise the message. */
  required?: boolean | string;
  /** Value must match a basic e-mail pattern. */
  email?: boolean | string;
  /** Minimum character length. */
  minLength?: number | { value: number; message: string };
};

export type UseFieldReturn = {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  /** Mark the field as touched programmatically (e.g. on form submit). */
  touch: () => void;
  /** Run validation against the current value without mutating state. */
  getError: () => string | undefined;
  state: FieldState;
  error: string | undefined;
};

export function useField(
  initialValue = "",
  rules?: ValidationRules,
): UseFieldReturn {
  const [value, setValue] = useState(initialValue);
  const [touched, setTouched] = useState(false);

  function validate(val: string): string | undefined {
    if (rules?.required && !val.trim()) {
      return typeof rules.required === "string"
        ? rules.required
        : "This field is required.";
    }
    if (rules?.email && val.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        return typeof rules.email === "string"
          ? rules.email
          : "Enter a valid email address.";
      }
    }
    if (rules?.minLength && val) {
      const min =
        typeof rules.minLength === "number"
          ? rules.minLength
          : rules.minLength.value;
      const msg =
        typeof rules.minLength === "object"
          ? rules.minLength.message
          : `Must be at least ${min} characters.`;
      if (val.length < min) return msg;
    }
    return undefined;
  }

  const error = touched ? validate(value) : undefined;
  const state: FieldState =
    touched && error
      ? "error"
      : touched && !error && value.trim()
      ? "success"
      : "default";

  return {
    value,
    onChange: (e) => setValue(e.target.value),
    onBlur: () => setTouched(true),
    touch: () => setTouched(true),
    getError: () => validate(value),
    state,
    error,
  };
}

// ── ErrorMessage ──────────────────────────────────────────────────────────────

export type ErrorMessageProps = HTMLAttributes<HTMLParagraphElement> & {
  children: ReactNode;
};

export function ErrorMessage({
  children,
  className = "",
  id,
  ...props
}: ErrorMessageProps) {
  const ctx = useFormFieldCtx();

  return (
    <p
      id={id ?? ctx?.errorId}
      role="alert"
      className={`flex items-center gap-1 text-xs leading-snug text-red-500 ${className}`}
      {...props}
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="size-3 shrink-0"
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="6.5" />
        <line x1="8" y1="5.5" x2="8" y2="9" />
        <circle cx="8" cy="11" r="0.6" fill="currentColor" stroke="none" />
      </svg>
      {children}
    </p>
  );
}
