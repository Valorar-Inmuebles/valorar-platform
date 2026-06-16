"use client";

import {
  Children,
  createContext,
  isValidElement,
  useContext,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import type { FieldState } from "@/components/ui/form-field";

// ── Context ───────────────────────────────────────────────────────────────────

type InputGroupContextValue = {
  state: FieldState;
  /**
   * Pre-computed Tailwind rounding class for any Input inside this group.
   * Derived at render time by inspecting the first and last children:
   *
   *   [Affix][Input]        → "rounded-l-none rounded-r-lg"
   *   [Input][Affix]        → "rounded-l-lg rounded-r-none"
   *   [Affix][Input][Affix] → "rounded-none"
   *   [Input] only          → "rounded-lg"
   */
  inputRounding: string;
};

const InputGroupContext = createContext<InputGroupContextValue | null>(null);

export function useInputGroupCtx() {
  return useContext(InputGroupContext);
}

// ── Border / text styles by state ─────────────────────────────────────────────

const affixBorderStyles: Record<FieldState, string> = {
  default: "border-zinc-200",
  error:   "border-red-300",
  success: "border-emerald-300",
};

const affixTextStyles: Record<FieldState, string> = {
  default: "text-zinc-400",
  error:   "text-red-400",
  success: "text-emerald-600",
};

// ── InputAffix ────────────────────────────────────────────────────────────────
// Defined first so InputGroup can use it as a type identity for child detection.

export type InputAffixSide = "left" | "right";

export type InputAffixProps = HTMLAttributes<HTMLDivElement> & {
  /**
   * "left"  → first in the group, rounded-l-lg, no right border.
   *           The adjacent Input's left border provides the separator line.
   * "right" → last in the group, rounded-r-lg, no left border.
   *           The adjacent Input's right border provides the separator line.
   */
  side: InputAffixSide;
  /**
   * Set to true when the affix wraps an interactive control (e.g. Select).
   *
   * In interactive mode the affix becomes a transparent sizing container.
   * Descendant CSS selectors reshape the child control's trigger button:
   *   - strips the adjacent border  (border-r-0 / border-l-0)
   *   - applies the correct rounded corners
   *   - raises z-index on focus so the open ring appears above siblings
   *
   * In static mode (default) the affix is a bordered, aria-hidden label cell.
   */
  interactive?: boolean;
  children: ReactNode;
};

/**
 * Label or interactive control attached to an Input inside an InputGroup.
 * Reads state from InputGroupContext for consistent border colors.
 *
 * Static:      "$", "ARS", "https://", ".com", "@", "%", "ext.", icons
 * Interactive: <Select />, any focusable control
 */
export function InputAffix({
  side,
  interactive = false,
  className = "",
  children,
  ...props
}: InputAffixProps) {
  const ctx   = useInputGroupCtx();
  const state = ctx?.state ?? "default";

  if (interactive) {
    const buttonOverrides =
      side === "left"
        ? "[&_button]:rounded-l-lg [&_button]:rounded-r-none [&_button]:border-r-0"
        : "[&_button]:rounded-l-none [&_button]:rounded-r-lg [&_button]:border-l-0";

    return (
      <div
        className={`relative z-[1] flex shrink-0 focus-within:z-[2] ${buttonOverrides} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }

  const border    = affixBorderStyles[state];
  const text      = affixTextStyles[state];
  const sideClass =
    side === "left"
      ? "rounded-l-lg rounded-r-none border-r-0"
      : "rounded-r-lg rounded-l-none border-l-0";

  return (
    <div
      aria-hidden="true"
      className={`flex h-8 shrink-0 select-none items-center border bg-zinc-50 px-3 text-xs font-medium ${border} ${text} ${sideClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

InputAffix.displayName = "InputAffix";

// ── InputGroup ────────────────────────────────────────────────────────────────

export type InputGroupProps = HTMLAttributes<HTMLDivElement> & {
  /**
   * Visual state shared across all children.
   * Individual Input/InputAffix state props take precedence.
   */
  state?: FieldState;
  children: ReactNode;
};

/**
 * Horizontal flex wrapper that joins Inputs and InputAffixes into a single
 * bordered control. Automatically resolves Input rounding based on child
 * position — no manual className overrides needed.
 *
 *   <InputGroup>
 *     <InputAffix side="left">https://</InputAffix>
 *     <Input placeholder="example.com" />          ← gets rounded-r-lg automatically
 *   </InputGroup>
 *
 *   <InputGroup>
 *     <Input placeholder="username" />              ← gets rounded-l-lg automatically
 *     <InputAffix side="right">.com</InputAffix>
 *   </InputGroup>
 *
 *   <InputGroup>
 *     <InputAffix side="left" interactive><Select ... /></InputAffix>
 *     <Input placeholder="1131716941" />            ← gets rounded-r-lg automatically
 *   </InputGroup>
 */
export function InputGroup({
  state = "default",
  className = "",
  children,
  ...props
}: InputGroupProps) {
  // Inspect the first and last real children to determine Input rounding.
  // React.Children.toArray filters out booleans / nulls so conditional
  // rendering like {flag && <InputAffix>} is handled correctly.
  const childArray   = Children.toArray(children);
  const firstChild   = childArray[0];
  const lastChild    = childArray[childArray.length - 1];

  const firstIsAffix =
    isValidElement(firstChild) && firstChild.type === InputAffix;
  const lastIsAffix  =
    isValidElement(lastChild)  && lastChild.type  === InputAffix;

  const inputRounding =
    firstIsAffix && lastIsAffix ? "rounded-none"              :
    firstIsAffix               ? "rounded-l-none rounded-r-lg":
    lastIsAffix                ? "rounded-l-lg rounded-r-none":
                                 "rounded-lg";

  return (
    <InputGroupContext.Provider value={{ state, inputRounding }}>
      <div role="group" className={`flex ${className}`} {...props}>
        {children}
      </div>
    </InputGroupContext.Provider>
  );
}

InputGroup.displayName = "InputGroup";
