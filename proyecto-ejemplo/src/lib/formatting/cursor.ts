/**
 * Generalized caret mapping utilities for formatted inputs.
 *
 * Formatted strings contain auto-inserted separator characters (e.g. ".", "-",
 * "/") that shift cursor positions relative to the underlying raw digit string.
 * These two functions translate between the two coordinate spaces so the caret
 * can be restored to the correct position after React re-renders the input.
 */

/**
 * Counts non-separator characters before `pos` in `formatted`.
 * Converts a cursor position in the formatted string to the equivalent
 * position ignoring separators (raw space).
 */
export function toRawPos(
  formatted: string,
  pos: number,
  isSeparator: (char: string) => boolean,
): number {
  let count = 0;
  for (let i = 0; i < pos; i++) {
    if (!isSeparator(formatted[i])) count++;
  }
  return count;
}

/**
 * Finds the position in `formatted` where the `rawPos`-th non-separator
 * character lives. Converts a raw cursor position back to the formatted string.
 */
export function toFormattedPos(
  formatted: string,
  rawPos: number,
  isSeparator: (char: string) => boolean,
): number {
  let count = 0;
  for (let i = 0; i <= formatted.length; i++) {
    if (count === rawPos) return i;
    if (i < formatted.length && !isSeparator(formatted[i])) count++;
  }
  return formatted.length;
}
