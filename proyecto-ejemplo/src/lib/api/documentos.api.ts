import { apiFetch } from "@/lib/api/fetch";
import type {
  DocumentoDto,
  DocumentoUiEntidadTipo,
} from "@/lib/types/documento";

export type DocumentoUploadInput = {
  file: File;
  entidad_tipo: DocumentoUiEntidadTipo;
  entidad_id: string;
  nombre_visible?: string;
  descripcion?: string;
};

export type DocumentoUploadError = {
  message: string;
  field?: string;
  code?: string;
};

async function parseError(res: Response): Promise<string> {
  const err = await res.json().catch(() => ({}));
  const body = err as { error?: string; message?: string };
  return body.message ?? body.error ?? "Error en la solicitud";
}

async function parseUploadError(res: Response): Promise<DocumentoUploadError> {
  const body = await res.json().catch(() => ({}));
  const parsed = body as {
    error?: string;
    message?: string;
    field?: string;
    code?: string;
  };

  if (typeof parsed.message === "string") {
    return {
      message: parsed.message,
      field: parsed.field,
      code: parsed.code,
    };
  }

  return { message: parsed.error ?? "Error al subir documento" };
}

export function getDocumentoDownloadUrl(id: string): string {
  return `/api/documentos/${id}/download`;
}

export async function getDocumentos(
  entidadTipo: DocumentoUiEntidadTipo,
  entidadId: string,
): Promise<DocumentoDto[]> {
  const params = new URLSearchParams({
    entidad_tipo: entidadTipo,
    entidad_id: entidadId,
  });
  const res = await apiFetch(`/api/documentos?${params}`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function uploadDocumento(
  payload: DocumentoUploadInput,
): Promise<DocumentoDto> {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("entidad_tipo", payload.entidad_tipo);
  formData.append("entidad_id", payload.entidad_id);
  if (payload.nombre_visible?.trim()) {
    formData.append("nombre_visible", payload.nombre_visible.trim());
  }
  if (payload.descripcion?.trim()) {
    formData.append("descripcion", payload.descripcion.trim());
  }

  const res = await apiFetch("/api/documentos", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await parseUploadError(res);
    throw err;
  }

  return res.json();
}

export async function deleteDocumento(id: string): Promise<void> {
  const res = await apiFetch(`/api/documentos/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function fetchDocumentoBlob(
  id: string,
): Promise<{ blob: Blob; contentType: string | null; filename: string | null }> {
  const res = await apiFetch(getDocumentoDownloadUrl(id));
  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  const contentType = res.headers.get("content-type");
  const disposition = res.headers.get("content-disposition");
  let filename: string | null = null;
  const quoted = /filename="([^"]+)"/i.exec(disposition ?? "");
  if (quoted?.[1]) filename = quoted[1];

  const blob = await res.blob();
  return { blob, contentType, filename };
}
