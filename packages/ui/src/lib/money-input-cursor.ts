/**
 * Maps cursor positions between formatted display strings and raw digit strings.
 */

export function toRawPos(
  formatted: string,
  pos: number,
  isSeparator: (char: string) => boolean,
): number {
  let count = 0;
  for (let i = 0; i < pos; i++) {
    if (!isSeparator(formatted[i] ?? "")) count++;
  }
  return count;
}

export function toFormattedPos(
  formatted: string,
  rawPos: number,
  isSeparator: (char: string) => boolean,
): number {
  let count = 0;
  for (let i = 0; i <= formatted.length; i++) {
    if (count === rawPos) return i;
    if (i < formatted.length && !isSeparator(formatted[i] ?? "")) count++;
  }
  return formatted.length;
}
