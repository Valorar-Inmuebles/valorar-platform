export function insertTextAtCursor(
  textarea: HTMLTextAreaElement,
  currentValue: string,
  insert: string,
): { next: string; cursor: number } {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const next = currentValue.slice(0, start) + insert + currentValue.slice(end);
  return { next, cursor: start + insert.length };
}

export function focusTextareaAt(
  textarea: HTMLTextAreaElement,
  cursor: number,
): void {
  textarea.focus();
  textarea.setSelectionRange(cursor, cursor);
}
