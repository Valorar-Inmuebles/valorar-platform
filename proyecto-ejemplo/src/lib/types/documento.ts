/** Dominio utilizable del módulo Documentos (multi-tenant). Fuente de verdad en aplicación. */
export const DOCUMENTO_ENTIDAD_TIPOS = [
  "caso",
  "expediente",
  "cliente",
  "comentario",
] as const;

export type DocumentoEntidadTipo = (typeof DOCUMENTO_ENTIDAD_TIPOS)[number];

/** Primera ola de integración UI (DocumentosCard). Subconjunto deliberado del dominio. */
export const DOCUMENTO_UI_ENTIDAD_TIPOS = [
  "caso",
  "expediente",
  "cliente",
] as const satisfies readonly DocumentoEntidadTipo[];

export type DocumentoUiEntidadTipo =
  (typeof DOCUMENTO_UI_ENTIDAD_TIPOS)[number];

export function isDocumentoUiEntidadTipo(
  value: DocumentoEntidadTipo,
): value is DocumentoUiEntidadTipo {
  return (DOCUMENTO_UI_ENTIDAD_TIPOS as readonly string[]).includes(value);
}

export type DocumentoDto = {
  id: string;
  entidadTipo: DocumentoEntidadTipo;
  entidadId: string;
  nombreVisible: string;
  nombreOriginal: string;
  mimeType: string | null;
  extension: string | null;
  sizeBytes: number | null;
  descripcion: string | null;
  createdAt: string;
  updatedAt: string;
  uploadedBy: {
    id: string;
    nombre: string;
  } | null;
  puedeEliminar: boolean;
};
