export function nextEnabledIndex(
  current: number,
  direction: 1 | -1,
  disabled: readonly boolean[],
  wrap = true,
): number {
  if (disabled.length === 0 || disabled.every(Boolean)) return -1;
  let index = current;
  for (let checked = 0; checked < disabled.length; checked += 1) {
    index += direction;
    if (wrap) {
      index = (index + disabled.length) % disabled.length;
    } else if (index < 0 || index >= disabled.length) {
      return current;
    }
    if (!disabled[index]) return index;
  }
  return current;
}

export function firstEnabledIndex(disabled: readonly boolean[]): number {
  return disabled.findIndex((value) => !value);
}

export function lastEnabledIndex(disabled: readonly boolean[]): number {
  for (let index = disabled.length - 1; index >= 0; index -= 1) {
    if (!disabled[index]) return index;
  }
  return -1;
}
