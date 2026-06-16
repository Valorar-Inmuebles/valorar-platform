import type { DocumentoEntidadTipo } from "@/lib/types/documento";
import type { DbContext } from "@/BBDD/base/types";
import { requireTenantId } from "@/BBDD/base/BaseRepository";
import { nowIso } from "@/BBDD/base/helpers";
import { queryOne, queryRows } from "@/BBDD/base/query";
import { pgQuery } from "@/BBDD/base/executor";

const DOCUMENTO_SELECT = `
  d.id, d.tenant_id, d.entidad_tipo, d.entidad_id,
  d.nombre, d.nombre_original, d.nombre_visible, d.descripcion,
  d.mime_type, d.extension, d.size_bytes,
  d.storage_provider, d.storage_bucket, d.storage_path,
  d.estado, d.uploaded_by, d.created_at, d.updated_at,
  (
    SELECT json_build_object(
      'id', u.id,
      'persona', json_build_object('tipo', p.tipo, 'nombre', p.nombre, 'apellido', p.apellido)
    )
    FROM usuario u
    LEFT JOIN persona p ON p.id = u.persona_id
    WHERE u.id = d.uploaded_by
  ) AS uploaded_by_usuario`;

export type DocumentoCreatePayload = {
  id: string;
  entidad_tipo: DocumentoEntidadTipo;
  entidad_id: string;
  nombre: string;
  nombre_original: string;
  nombre_visible: string;
  descripcion: string | null;
  mime_type: string;
  extension: string;
  size_bytes: number;
  storage_provider: string;
  storage_bucket: string;
  storage_path: string;
  uploaded_by: string;
};

export const documentoRepository = {
  async listByEntidad(
    ctx: DbContext,
    entidadTipo: DocumentoEntidadTipo,
    entidadId: string,
  ) {
    const tenantId = requireTenantId(ctx);
    return queryRows(
      `SELECT ${DOCUMENTO_SELECT}
       FROM documento d
       WHERE d.tenant_id = $1
         AND d.entidad_tipo = $2
         AND d.entidad_id = $3
         AND d.estado = 'activo'
       ORDER BY d.created_at DESC`,
      [tenantId, entidadTipo, entidadId],
    );
  },

  async getById(ctx: DbContext, id: string) {
    const tenantId = requireTenantId(ctx);
    return queryOne(
      `SELECT ${DOCUMENTO_SELECT}
       FROM documento d
       WHERE d.id = $1 AND d.tenant_id = $2 AND d.estado = 'activo'`,
      [id, tenantId],
    );
  },

  async create(ctx: DbContext, payload: DocumentoCreatePayload) {
    const tenantId = requireTenantId(ctx);
    const now = nowIso();
    const row = await queryOne<{ id: string }>(
      `INSERT INTO documento (
         id, tenant_id, entidad_tipo, entidad_id,
         nombre, nombre_original, nombre_visible, descripcion,
         mime_type, extension, size_bytes,
         storage_provider, storage_bucket, storage_path,
         uploaded_by, estado, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4,
         $5, $6, $7, $8,
         $9, $10, $11,
         $12, $13, $14,
         $15, 'activo', $16, $16
       )
       RETURNING id`,
      [
        payload.id,
        tenantId,
        payload.entidad_tipo,
        payload.entidad_id,
        payload.nombre,
        payload.nombre_original,
        payload.nombre_visible,
        payload.descripcion,
        payload.mime_type,
        payload.extension,
        payload.size_bytes,
        payload.storage_provider,
        payload.storage_bucket,
        payload.storage_path,
        payload.uploaded_by,
        now,
      ],
    );
    if (!row) throw new Error("Error al crear documento");
    return row;
  },

  async markEliminado(ctx: DbContext, id: string) {
    const tenantId = requireTenantId(ctx);
    await pgQuery(
      `UPDATE documento
       SET estado = 'eliminado', updated_at = $1
       WHERE id = $2 AND tenant_id = $3 AND estado = 'activo'`,
      [nowIso(), id, tenantId],
    );
  },

  async assertEntidadExists(
    ctx: DbContext,
    entidadTipo: DocumentoEntidadTipo,
    entidadId: string,
  ): Promise<boolean> {
    const tenantId = requireTenantId(ctx);

    // PostgreSQL (documento_entidad_tipo_check) también permite "tarea", pero no se
    // integra todavía: la tabla tarea no posee tenant_id ni deleted_at.
    const tableByTipo: Record<DocumentoEntidadTipo, string> = {
      caso: "caso",
      expediente: "expediente",
      cliente: "cliente",
      comentario: "comentario",
    };

    const table = tableByTipo[entidadTipo];
    const row = await queryOne(
      `SELECT id FROM ${table}
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       LIMIT 1`,
      [entidadId, tenantId],
    );
    return row != null;
  },
};
