import { formatDisplayDateTime } from "@/lib/datetime/format-display-datetime";

export function formatComentarioDate(iso: string): string {
  return formatDisplayDateTime(iso);
}
