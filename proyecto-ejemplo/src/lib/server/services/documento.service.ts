import type {
  DocumentoDto,
  DocumentoEntidadTipo,
} from "@/lib/types/documento";
import type { DocumentoCreateFieldsInput } from "@/lib/validation/schemas/documento.schema";
import { documentoRepository } from "@/BBDD/repositories/documento.repository";
import {
  buildDocumentStorageKey,
  documentStorage,
} from "@/lib/server/storage/document-storage";
import { getDocumentsBucketName } from "@/lib/server/storage/s3-config";
import { StorageObjectNotFoundError } from "@/lib/server/storage/errors";
import { NotFoundError } from "@/lib/server/not-found-error";
import {
  personaDisplayName,
  unwrapOne,
} from "@/lib/server/utils/persona-display-name";
import type { ServerContext } from "@/lib/server/context/types";

type Ctx = ServerContext;

const MAX_FILE_BYTES = 25 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.rar",
  "application/x-rar-compressed",
  "application/x-rar",
]);

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "zip",
  "rar",
]);

type PersonaRow = {
  tipo?: string | null;
  nombre?: string | null;
  apellido?: string | null;
};

type UsuarioJoinRow = {
  id: string;
  persona?: PersonaRow | PersonaRow[] | null;
};

type DocumentoRow = {
  id: string;
  entidad_tipo: DocumentoEntidadTipo;
  entidad_id: string;
  nombre_original: string | null;
  nombre_visible: string | null;
  descripcion: string | null;
  mime_type: string | null;
  extension: string | null;
  size_bytes: number | null;
  storage_bucket: string;
  storage_path: string;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  uploaded_by_usuario?: UsuarioJoinRow | UsuarioJoinRow[] | null;
};

export class DocumentoFieldError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "DocumentoFieldError";
  }
}

function isDocumentAdmin(ctx: Ctx): boolean {
  return Boolean(ctx.is_superadmin || ctx.roles?.includes("admin"));
}

function mapUploadedBy(usuario: UsuarioJoinRow | null): DocumentoDto["uploadedBy"] {
  if (!usuario?.id) return null;
  return {
    id: usuario.id,
    nombre: personaDisplayName(unwrapOne(usuario.persona ?? null)),
  };
}

function mapRowToDto(row: DocumentoRow, ctx: Ctx): DocumentoDto {
  const uploader = unwrapOne(row.uploaded_by_usuario ?? null);
  const isAuthor = row.uploaded_by === ctx.user.id;
  const admin = isDocumentAdmin(ctx);

  return {
    id: row.id,
    entidadTipo: row.entidad_tipo,
    entidadId: row.entidad_id,
    nombreVisible: row.nombre_visible ?? row.nombre_original ?? "Documento",
    nombreOriginal: row.nombre_original ?? row.nombre_visible ?? "Documento",
    mimeType: row.mime_type,
    extension: row.extension,
    sizeBytes: row.size_bytes,
    descripcion: row.descripcion,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    uploadedBy: mapUploadedBy(uploader),
    puedeEliminar: isAuthor || admin,
  };
}

function entidadNotFoundLabel(entidadTipo: DocumentoEntidadTipo): string {
  return entidadTipo.charAt(0).toUpperCase() + entidadTipo.slice(1) + " no encontrado.";
}

function extractExtension(filename: string): string {
  const base = filename.replace(/[/\\]/g, "").trim();
  const dot = base.lastIndexOf(".");
  if (dot < 0 || dot === base.length - 1) return "";
  return base
    .slice(dot + 1)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function deriveNombreVisible(filename: string, nombreVisible?: string): string {
  if (nombreVisible?.trim()) return nombreVisible.trim();
  const base = filename.replace(/[/\\]/g, "").trim();
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return base || "Documento";
  return base.slice(0, dot).trim() || "Documento";
}

function validateFile(file: File): { mimeType: string; extension: string } {
  if (file.size === 0) {
    throw new DocumentoFieldError("El archivo está vacío.", "file", "EMPTY");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new DocumentoFieldError(
      "El archivo no puede superar 25 MB.",
      "file",
      "INVALID_SIZE",
    );
  }

  const extension = extractExtension(file.name);
  if (!extension || !ALLOWED_EXTENSIONS.has(extension)) {
    throw new DocumentoFieldError(
      "El archivo debe tener una extensión válida.",
      "file",
      "INVALID_EXTENSION",
    );
  }

  const mimeType = file.type.trim() || "application/octet-stream";
  if (
    !ALLOWED_MIME_TYPES.has(mimeType) &&
    mimeType !== "application/octet-stream"
  ) {
    throw new DocumentoFieldError(
      "Tipo de archivo no permitido.",
      "file",
      "INVALID_TYPE",
    );
  }

  return { mimeType, extension };
}

export const documentoService = {
  async list(
    ctx: Ctx,
    entidadTipo: DocumentoEntidadTipo,
    entidadId: string,
  ): Promise<DocumentoDto[]> {
    if (!ctx.tenant_id) throw new Error("Tenant no definido");

    const exists = await documentoRepository.assertEntidadExists(
      ctx,
      entidadTipo,
      entidadId,
    );
    if (!exists) throw new Error(entidadNotFoundLabel(entidadTipo));

    const rows = (await documentoRepository.listByEntidad(
      ctx,
      entidadTipo,
      entidadId,
    )) as unknown as DocumentoRow[];

    return rows.map((row) => mapRowToDto(row, ctx));
  },

  async create(
    ctx: Ctx,
    payload: DocumentoCreateFieldsInput & { file: File },
  ): Promise<DocumentoDto> {
    if (!ctx.tenant_id) throw new Error("Tenant no definido");

    const exists = await documentoRepository.assertEntidadExists(
      ctx,
      payload.entidad_tipo,
      payload.entidad_id,
    );
    if (!exists) throw new Error("Entidad no encontrada");

    const { mimeType, extension } = validateFile(payload.file);
    const nombreOriginal = payload.file.name.replace(/[/\\]/g, "").trim() || "documento";
    const nombreVisible = deriveNombreVisible(
      payload.file.name,
      payload.nombre_visible,
    );

    const documentoId = crypto.randomUUID();
    const storagePath = buildDocumentStorageKey({
      tenantId: ctx.tenant_id,
      entidadTipo: payload.entidad_tipo,
      entidadId: payload.entidad_id,
      documentoId,
      extension,
    });
    const storageBucket = getDocumentsBucketName();
    const bytes = new Uint8Array(await payload.file.arrayBuffer());

    await documentStorage.putObject(storagePath, bytes, mimeType);

    try {
      const created = await documentoRepository.create(ctx, {
        id: documentoId,
        entidad_tipo: payload.entidad_tipo,
        entidad_id: payload.entidad_id,
        nombre: nombreVisible,
        nombre_original: nombreOriginal,
        nombre_visible: nombreVisible,
        descripcion: payload.descripcion ?? null,
        mime_type: mimeType,
        extension,
        size_bytes: payload.file.size,
        storage_provider: "s3",
        storage_bucket: storageBucket,
        storage_path: storagePath,
        uploaded_by: ctx.user.id,
      });

      const row = (await documentoRepository.getById(
        ctx,
        created.id,
      )) as unknown as DocumentoRow | null;
      if (!row) throw new Error("No se pudo cargar el documento creado");
      return mapRowToDto(row, ctx);
    } catch (error) {
      try {
        await documentStorage.deleteObject(storagePath, storageBucket);
      } catch {
        /* compensación best-effort */
      }
      throw error;
    }
  },

  async remove(ctx: Ctx, id: string): Promise<void> {
    if (!ctx.tenant_id) throw new Error("Tenant no definido");

    const existing = (await documentoRepository.getById(
      ctx,
      id,
    )) as unknown as DocumentoRow | null;
    if (!existing) throw new Error("Documento no encontrado");

    const canDelete =
      existing.uploaded_by === ctx.user.id || isDocumentAdmin(ctx);
    if (!canDelete) {
      throw new Error("No tenés permiso para eliminar este documento");
    }

    await documentStorage.deleteObject(
      existing.storage_path,
      existing.storage_bucket,
    );

    await documentoRepository.markEliminado(ctx, id);
  },

  async download(
    ctx: Ctx,
    id: string,
  ): Promise<{ content: Uint8Array; contentType: string; filename: string }> {
    if (!ctx.tenant_id) throw new Error("Tenant no definido");

    const row = (await documentoRepository.getById(
      ctx,
      id,
    )) as unknown as DocumentoRow | null;
    if (!row) throw new Error("Documento no encontrado");

    try {
      const stored = await documentStorage.getFile(
        row.storage_path,
        row.storage_bucket,
      );
      const nombreVisible =
        row.nombre_visible ?? row.nombre_original ?? "documento";
      const ext = row.extension ? `.${row.extension}` : "";
      const filename = nombreVisible.endsWith(ext)
        ? nombreVisible
        : `${nombreVisible}${ext}`;

      return {
        content: stored.content,
        contentType: stored.contentType ?? row.mime_type ?? "application/octet-stream",
        filename,
      };
    } catch (error) {
      if (error instanceof StorageObjectNotFoundError) {
        throw new NotFoundError("Archivo no encontrado");
      }
      throw error;
    }
  },
};
