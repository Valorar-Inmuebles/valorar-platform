import { ApiError } from "@/lib/api/client";
import {
  formatPublicationChecklistMessage,
  isPublicationChecklistErrorBody,
} from "@/lib/property/publication-checklist-error";

const MESSAGE_RULES: Array<{ match: string | RegExp; message: string }> = [
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
