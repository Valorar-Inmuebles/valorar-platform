import { ApiError } from "@/lib/api/client";
import {
  formatPublicationChecklistMessage,
  isPublicationChecklistErrorBody,
} from "@/lib/property/publication-checklist-error";

const MESSAGE_RULES: Array<{ match: string | RegExp; message: string }> = [
  {
    match: "No podés desactivar tu propia cuenta",
    message: "No podés desactivar tu propia cuenta.",
  },
  {
    match: "No podés desactivar al único administrador activo del tenant",
    message: "No podés desactivar al único administrador activo del tenant.",
  },
  {
    match: "No podés eliminar tu propia cuenta",
    message: "No podés eliminar tu propia cuenta.",
  },
  {
    match: "No podés eliminar al único administrador activo del tenant",
    message: "No podés eliminar al único administrador activo del tenant.",
  },
  {
    match: "No se puede eliminar un superadministrador",
    message:
      "No se puede eliminar un superadministrador de plataforma desde el tenant.",
  },
  {
    match: "Cannot modify platform super admin",
    message: "No se puede modificar un superadministrador de plataforma.",
  },
  {
    match: "Cannot change slug while the property has an active listing",
    message:
      "No podés cambiar la URL mientras haya publicaciones activas. Pausalas o cerrálas primero.",
  },
  {
    match: "Cannot create a property listing for an archived property",
    message:
      "No podés crear publicaciones en una propiedad archivada. Restaurala primero.",
  },
  {
    match: "Cannot activate a property listing while the property is archived",
    message:
      "No podés activar publicaciones en una propiedad archivada. Restaurala primero.",
  },
  {
    match: "Cannot activate listing: publication checklist incomplete",
    message: "No se puede activar la publicación: checklist incompleto.",
  },
  {
    match: "Cannot transition listing status from",
    message: "No se puede cambiar la publicación a ese estado.",
  },
  {
    match: "A closed listing with type",
    message:
      "Ya existe una publicación cerrada de ese tipo. Reactivala en lugar de crear otra.",
  },
  {
    match: "A listing with type",
    message: "Ya existe una publicación de ese tipo para esta propiedad.",
  },
  {
    match: "Cannot delete the only price of a publishable",
    message:
      "No podés eliminar el único precio de una publicación activa, pausada o reservada.",
  },
  {
    match: "Cannot demote the only price",
    message: "Debe existir un precio principal mientras haya precios cargados.",
  },
  {
    match: "Cannot create a property image for an archived property",
    message:
      "No podés agregar imágenes a una propiedad archivada. Restaurala primero.",
  },
  {
    match: "Storage is not configured",
    message: "El almacenamiento no está configurado en el servidor.",
  },
  {
    match: /already has the maximum of \d+ images/,
    message: "Alcanzaste el límite máximo de imágenes para esta propiedad.",
  },
  {
    match: "Unable to reorder property images",
    message: "No se pudieron reordenar las imágenes. Intentá de nuevo.",
  },
  {
    match: "Unsupported mime type",
    message: "Formato de imagen no permitido.",
  },
  {
    match: "File size exceeds the maximum",
    message: "La imagen supera el tamaño máximo permitido.",
  },
  {
    match: "amount must not be less than 0.01",
    message: "El monto debe ser mayor a 0.",
  },
  {
    match: "endsOn is required to activate a rental contract",
    message:
      "La fecha de finalización es obligatoria para activar el contrato.",
  },
  {
    match: "endsOn must be after startsOn",
    message:
      "La fecha de finalización debe ser posterior a la fecha de inicio.",
  },
  {
    match: "A rental contract must last at least one calendar month",
    message: "El contrato debe tener una duración mínima de un mes.",
  },
  {
    match: "Terminal rental contracts cannot be edited",
    message: "El contrato ya no puede modificarse en su estado actual.",
  },
  {
    match: /Rental contract with id .* not found/,
    message: "No se encontró el contrato solicitado.",
  },
  {
    match: "Rental contract not found",
    message: "No se encontró el contrato solicitado.",
  },
  {
    match:
      "An active RENT obligation is required to activate a rental contract",
    message:
      "El contrato debe tener una obligación activa de alquiler para poder activarse.",
  },
  {
    match:
      "At least one active renter is required to activate a rental contract",
    message:
      "El contrato debe tener al menos un locatario activo para poder activarse.",
  },
  {
    match:
      "Exactly one primary renter is required to activate a rental contract",
    message:
      "El contrato debe tener exactamente un locatario principal para poder activarse.",
  },
  {
    match: "Every contract party must be an active contact in the same tenant",
    message:
      "Todas las partes deben ser contactos activos de esta inmobiliaria.",
  },
  {
    match: "A contact cannot repeat in the same contract role",
    message: "Una persona no puede repetirse en el mismo rol del contrato.",
  },
  {
    match: "Only one primary renter is allowed per rental contract",
    message: "El contrato puede tener un solo locatario principal.",
  },
  {
    match: "propertyStreetSnapshot is required",
    message: "La calle de la propiedad es obligatoria.",
  },
  {
    match: "Only a pending occurrence can be edited",
    message: "Sólo se puede editar un vencimiento pendiente.",
  },
  {
    match: "Only a pending occurrence can set dueDate",
    message: "Sólo se puede asignar el vencimiento a una ocurrencia pendiente.",
  },
  {
    match: "Rental occurrence not found",
    message: "No se encontró el vencimiento solicitado.",
  },
  {
    match: "Rental obligation not found",
    message: "No se encontró la obligación solicitada.",
  },
  {
    match: "Rental reminder policy not found",
    message: "No se encontró la configuración de avisos.",
  },
  {
    match: "Rental reminder delivery not found",
    message: "No se encontró el envío solicitado.",
  },
  {
    match: "amount is required",
    message: "El importe es obligatorio.",
  },
  {
    match: "reason is required",
    message: "El motivo es obligatorio.",
  },
  {
    match: "A fixed obligation occurrence must keep an amount",
    message: "Un vencimiento de importe fijo debe conservar un importe.",
  },
  {
    match:
      /^(?:startsOn|endsOn|dueDate|fulfilledOn|effectiveFrom|oneTimeDueDate) must be a valid date$/,
    message: "La fecha ingresada no es válida.",
  },
  {
    match:
      /^(?:startsOn|endsOn|dueDate|fulfilledOn|effectiveFrom|oneTimeDueDate)\s+(?:must|should)\b/,
    message: "La fecha ingresada no es válida.",
  },
  {
    match: "Rental fulfillment not found",
    message: "No se encontró el cumplimiento solicitado.",
  },
  {
    match: "Only a pending occurrence can be cancelled",
    message: "Sólo se puede cancelar un vencimiento pendiente.",
  },
  {
    match: "Occurrence already fulfilled or no longer pending",
    message: "El vencimiento ya fue cumplido o dejó de estar pendiente.",
  },
  {
    match: "Inactive obligations cannot materialize occurrences",
    message: "Sólo se pueden generar vencimientos para obligaciones activas.",
  },
  {
    match: "Terminal rental contracts cannot change obligations",
    message: "El contrato ya no permite modificar sus obligaciones.",
  },
  {
    match: "An active contract must keep an active RENT obligation",
    message:
      "Un contrato activo debe conservar una obligación activa de alquiler.",
  },
  {
    match: "A rent value revision already exists for effectiveFrom",
    message: "Ya existe una actualización del alquiler para esa fecha.",
  },
  {
    match: "Rent adjustments are only available for the RENT obligation",
    message:
      "Las actualizaciones de importe sólo están disponibles para la obligación de alquiler.",
  },
  {
    match: "Rental contract already renewed as",
    message: "Ya existe una renovación para este contrato.",
  },
  {
    match: "Rental contract cannot be renewed from",
    message: "El estado actual del contrato no permite renovarlo.",
  },
  {
    match: "Property with slug",
    message: "Ya existe una propiedad con esa URL.",
  },
  {
    match: "Property with internalCode",
    message: "Ese código interno ya está en uso.",
  },
  {
    match: "Property with id",
    message: "No se encontró la propiedad.",
  },
  {
    match: "Property listing with id",
    message: "No se encontró la publicación.",
  },
  {
    match: "Property price with id",
    message: "No se encontró el precio.",
  },
  {
    match: "Property image with id",
    message: "No se encontró la imagen.",
  },
  {
    match: "Property feature with id",
    message: "No se encontró la característica.",
  },
  {
    match: "Tenant with id",
    message: "No se encontró la inmobiliaria seleccionada.",
  },
  {
    match: "createdById must belong to the same tenant",
    message: "El usuario no pertenece a esta inmobiliaria.",
  },
];

function mapRawMessage(message: string): string {
  const normalized = message.trim();

  if (!normalized) {
    return "Ocurrió un error inesperado.";
  }

  for (const rule of MESSAGE_RULES) {
    const matches =
      typeof rule.match === "string"
        ? normalized.includes(rule.match)
        : rule.match.test(normalized);

    if (matches) {
      return rule.message;
    }
  }

  if (/^Error de API \(\d+\)$/.test(normalized)) {
    return "No se pudo completar la operación. Intentá de nuevo en unos minutos.";
  }

  if (/^[A-Za-z].*(not found|Cannot |Unable to |must not)/.test(normalized)) {
    return "No se pudo completar la operación. Revisá los datos e intentá de nuevo.";
  }

  return normalized;
}

function isNetworkErrorMessage(message: string): boolean {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("fetch failed") ||
    normalized.includes("econnrefused") ||
    normalized.includes("network") ||
    normalized.includes("failed to fetch")
  );
}

export function mapApiErrorMessage(body: unknown, status: number): string {
  if (isPublicationChecklistErrorBody(body)) {
    return formatPublicationChecklistMessage(body.missing);
  }

  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message: string | string[] }).message;

    if (Array.isArray(message)) {
      return mapRawMessage(message.join(". "));
    }

    if (typeof message === "string" && message.length > 0) {
      return mapRawMessage(message);
    }
  }

  if (status === 401) {
    return "Tu sesión expiró. Volvé a iniciar sesión.";
  }

  if (status === 403) {
    return "No tenés permiso para realizar esta acción.";
  }

  if (status === 404) {
    return "No se encontró el recurso solicitado.";
  }

  if (status >= 500) {
    return "El servidor no está disponible en este momento. Intentá de nuevo en unos minutos.";
  }

  return "No se pudo completar la operación. Intentá de nuevo.";
}

export function mapUnknownError(error: unknown): string {
  if (error instanceof ApiError) {
    if (isPublicationChecklistErrorBody(error.body)) {
      return formatPublicationChecklistMessage(error.body.missing);
    }

    return mapRawMessage(error.message);
  }

  if (error instanceof Error) {
    if (isNetworkErrorMessage(error.message)) {
      return "No se pudo conectar con el servidor. Verificá tu conexión e intentá de nuevo.";
    }

    return mapRawMessage(error.message);
  }

  return "Ocurrió un error inesperado.";
}

const RENTAL_SAFE_FALLBACK =
  "Ocurrió un error al procesar la solicitud. Intentá nuevamente.";

function rawErrorMessage(error: ApiError): string {
  if (error.body && typeof error.body === "object" && "message" in error.body) {
    const message = (error.body as { message?: unknown }).message;
    if (Array.isArray(message))
      return message.filter((item) => typeof item === "string").join(". ");
    if (typeof message === "string") return message;
  }
  return error.message;
}

/** Maps errors from the Rental Admin boundary without exposing technical details. */
export function mapRentalError(error: unknown): string {
  if (error instanceof ApiError) {
    const raw = rawErrorMessage(error).trim();
    const mapped = mapRawMessage(raw);
    if (mapped !== raw) return mapped;
    if (error.status === 401)
      return "Tu sesión expiró. Volvé a iniciar sesión.";
    if (error.status === 403)
      return "No tenés permiso para realizar esta acción.";
    if (error.status === 404) return "No se encontró el recurso solicitado.";
    if (error.status >= 500) {
      return "El servidor no está disponible en este momento. Intentá de nuevo en unos minutos.";
    }
    return RENTAL_SAFE_FALLBACK;
  }

  if (error instanceof Error && isNetworkErrorMessage(error.message)) {
    return "No se pudo conectar con el servidor. Verificá tu conexión e intentá de nuevo.";
  }

  return RENTAL_SAFE_FALLBACK;
}
