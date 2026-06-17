import type { PublicationCheckKey } from "@repo/property-rules";
import type { PublicationChecklistErrorBody } from "@/lib/api/types/property-publishability";
import { getPublicationCheckLabel } from "@repo/property-rules";

export function isPublicationChecklistErrorBody(
  body: unknown,
): body is PublicationChecklistErrorBody {
  if (!body || typeof body !== "object") {
    return false;
  }

  const record = body as Record<string, unknown>;

  return (
    record.code === "PUBLICATION_CHECKLIST_INCOMPLETE" &&
    Array.isArray(record.missing)
  );
}

export function formatPublicationChecklistMessage(
  missing: PublicationCheckKey[],
): string {
  if (missing.length === 0) {
    return "No se puede activar la publicación: checklist incompleto.";
  }

  const labels = missing.map((key) => getPublicationCheckLabel(key));

  if (labels.length === 1) {
    return `No se puede activar la publicación: falta ${labels[0]!.toLowerCase()}.`;
  }

  const last = labels.pop();
  return `No se puede activar la publicación: faltan ${labels.join(", ").toLowerCase()} y ${last!.toLowerCase()}.`;
}
