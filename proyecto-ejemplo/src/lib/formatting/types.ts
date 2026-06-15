/**
 * Contract for all formatted input formatters.
 *
 * A Formatter<T> encapsulates every transformation needed to bridge a typed
 * string input and a typed stored value:
 *
 *   keystroke  →  sanitize  →  format   →  displayValue
 *   blur       →  sanitize  →  finalize →  displayValue (canonical)
 *   any change →  sanitize  →  parse    →  onChange(T | undefined)
 *   init/sync  →  display   →  displayValue
 */
export interface Formatter<T = string> {
  /** Strip invalid characters; preserve partial/transitional states during typing. */
  sanitize(input: string): string;

  /** raw (sanitized) → display string applied on every keystroke. */
  format(raw: string): string;

  /** raw (sanitized) → canonical display string applied on blur. */
  finalize(raw: string): string;

  /** raw string → stored value emitted via onChange. Returns undefined for incomplete/invalid input. */
  parse(raw: string): T | undefined;

  /** stored value → display string used when initializing from form state. */
  display(value: T): string;

  /** Returns true for auto-inserted separator characters (dots, dashes, slashes, spaces). */
  isSeparator(char: string): boolean;
}
