import {
  buildComentarioMencionMensaje,
  comentarioEntidadPath,
} from "@/lib/comentarios/comentario-entidad-path";
import type {
  ComentarioDto,
  ComentarioEntidadTipo,
  ComentarioUsuarioMencionDto,
} from "@/lib/types/comentario";
import { comentarioAuditoriaRepository } from "@/BBDD/repositories/comentario-auditoria.repository";
import { comentarioRepository } from "@/BBDD/repositories/comentario.repository";
import { notificacionRepository } from "@/BBDD/repositories/notificacion.repository";
import {
  personaDisplayName,
  unwrapOne,
} from "../utils/persona-display-name";

import type { ServerContext } from "@/lib/server/context/types";

type Ctx = ServerContext;

type PersonaRow = {
  tipo?: string | null;
  nombre?: string | null;
  apellido?: string | null;
};

type UsuarioJoinRow = {
  id: string;
  foto_url?: string | null;
  persona?: PersonaRow | PersonaRow[] | null;
};

type MencionJoinRow = {
  usuario_id: string;
  usuario?: UsuarioJoinRow | UsuarioJoinRow[] | null;
};

type AdjuntoJoinRow = {
  id: string;
  documento_id: string;
  documento?:
    | { id: string; nombre: string | null; tipo: string | null }
    | { id: string; nombre: string | null; tipo: string | null }[]
    | null;
};

function auditoriaExpedienteIdFrom(
  entidadTipo: ComentarioEntidadTipo,
  entidadId: string,
): string | null {
  return entidadTipo === "expediente" ? entidadId : null;
}

type ComentarioRow = {
  id: string;
  entidad_tipo: ComentarioEntidadTipo;
  entidad_id: string;
  contenido: string;
  created_at: string;
  updated_at: string | null;
  editado_at: string | null;
  usuario_id: string;
  usuario?: UsuarioJoinRow | UsuarioJoinRow[] | null;
  comentario_mencion?: MencionJoinRow[] | null;
  comentario_adjunto?: AdjuntoJoinRow[] | null;
};

function isCommentAdmin(ctx: Ctx): boolean {
  return Boolean(ctx.is_superadmin || ctx.roles?.includes("admin"));
}

function mapAutor(usuario: UsuarioJoinRow | null): ComentarioDto["autor"] {
  const persona = unwrapOne(usuario?.persona ?? null);
  return {
    id: usuario?.id ?? "",
    nombre: personaDisplayName(persona),
    has_foto: Boolean(usuario?.foto_url),
  };
}

function mapRowToDto(row: ComentarioRow, ctx: Ctx): ComentarioDto {
  const autorUsuario = unwrapOne(row.usuario ?? null);
  const isAuthor = row.usuario_id === ctx.user.id;
  const admin = isCommentAdmin(ctx);

  const menciones = (row.comentario_mencion ?? []).map((m) => {
    const u = unwrapOne(m.usuario ?? null);
    return {
      usuarioId: m.usuario_id,
      nombre: personaDisplayName(unwrapOne(u?.persona ?? null)),
    };
  });

  const adjuntos = (row.comentario_adjunto ?? []).map((a) => {
    const doc = unwrapOne(a.documento ?? null);
    return {
      id: a.id,
      documentoId: a.documento_id,
      nombre: doc?.nombre ?? "Documento",
      tipo: doc?.tipo ?? null,
      tamanoBytes: null,
    };
  });

  return {
    id: row.id,
    contenido: row.contenido,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    editadoAt: row.editado_at,
    autor: mapAutor(autorUsuario),
    menciones,
    adjuntos,
    puedeEditar: isAuthor || admin,
    puedeEliminar: isAuthor || admin,
  };
}

function normalizeSearchTerm(term: string): string {
  return term
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function extractMentionedUserIds(
  contenido: string,
  candidatos: ComentarioUsuarioMencionDto[],
): string[] {
  const ids = new Set<string>();
  for (const c of candidatos) {
    const token = `@${c.nombre}`;
    if (contenido.includes(token)) {
      ids.add(c.id);
    }
  }
  return [...ids];
}

const NOTIFICACION_TIPO_MENCION = "comentario.mencion";

async function notifyMencionesEnComentario(
  ctx: Ctx,
  params: {
    entidadTipo: ComentarioEntidadTipo;
    entidadId: string;
    autorNombre: string;
    usuarioIds: string[];
  },
): Promise<void> {
  const recipientIds = params.usuarioIds.filter((id) => id !== ctx.user.id);
  if (recipientIds.length === 0) return;

  const titulo = "Te mencionaron en un comentario";
  const mensaje = buildComentarioMencionMensaje(
    params.autorNombre,
    params.entidadTipo,
  );
  const link = comentarioEntidadPath(params.entidadTipo, params.entidadId);

  await notificacionRepository.createMany(
    ctx,
    recipientIds.map((usuario_id) => ({
      usuario_id,
      tipo: NOTIFICACION_TIPO_MENCION,
      titulo,
      mensaje,
      link,
    })),
  );
}

export const comentarioService = {
  async list(
    ctx: Ctx,
    entidadTipo: ComentarioEntidadTipo,
    entidadId: string,
  ): Promise<ComentarioDto[]> {
    if (!ctx.tenant_id) throw new Error("Tenant no definido");

    const exists = await comentarioRepository.assertEntidadExists(
      ctx,
      entidadTipo,
      entidadId,
    );
    if (!exists) throw new Error(entidadTipo.charAt(0).toUpperCase() + entidadTipo.slice(1) + " no encontrado.");

    const rows = (await comentarioRepository.listByEntidad(
      ctx,
      entidadTipo,
      entidadId,
    )) as unknown as ComentarioRow[];

    return rows.map((row) => mapRowToDto(row, ctx));
  },

  async create(
    ctx: Ctx,
    payload: {
      entidad_tipo: ComentarioEntidadTipo;
      entidad_id: string;
      contenido: string;
    },
  ): Promise<ComentarioDto> {
    if (!ctx.tenant_id) throw new Error("Tenant no definido");

    const exists = await comentarioRepository.assertEntidadExists(
      ctx,
      payload.entidad_tipo,
      payload.entidad_id,
    );
    if (!exists) throw new Error("Entidad no encontrada");

    const candidatos = await this.listUsuariosMencion(ctx, "");
    const mencionIds = extractMentionedUserIds(payload.contenido, candidatos);

    const created = await comentarioRepository.create(ctx, {
      entidad_tipo: payload.entidad_tipo,
      entidad_id: payload.entidad_id,
      contenido: payload.contenido,
      usuario_id: ctx.user.id,
    });

    await comentarioRepository.replaceMenciones(ctx, created.id, mencionIds);

    const rowAfterCreate = (await comentarioRepository.getById(
      ctx,
      created.id,
    )) as unknown as ComentarioRow | null;
    const autorNombre = rowAfterCreate
      ? mapAutor(unwrapOne(rowAfterCreate.usuario ?? null)).nombre
      : "Un usuario";

    await notifyMencionesEnComentario(ctx, {
      entidadTipo: payload.entidad_tipo,
      entidadId: payload.entidad_id,
      autorNombre,
      usuarioIds: mencionIds,
    });

    await comentarioAuditoriaRepository.log(ctx, {
      accion: "comentario.crear",
      entidad: "comentario",
      entidad_id: created.id,
      expediente_id: auditoriaExpedienteIdFrom(
        payload.entidad_tipo,
        payload.entidad_id,
      ),
      detalle: {
        entidad_tipo: payload.entidad_tipo,
        entidad_id: payload.entidad_id,
        menciones: mencionIds,
      },
    });

    if (!rowAfterCreate) throw new Error("No se pudo cargar el comentario creado");
    return mapRowToDto(rowAfterCreate, ctx);
  },

  async update(
    ctx: Ctx,
    id: string,
    payload: { contenido: string },
  ): Promise<ComentarioDto> {
    if (!ctx.tenant_id) throw new Error("Tenant no definido");

    const existing = (await comentarioRepository.getById(ctx, id)) as unknown as ComentarioRow | null;
    if (!existing) throw new Error("Comentario no encontrado");

    const canEdit =
      existing.usuario_id === ctx.user.id || isCommentAdmin(ctx);
    if (!canEdit) throw new Error("No tenés permiso para editar este comentario");

    await comentarioRepository.insertEdicion(ctx, {
      comentario_id: id,
      contenido_anterior: existing.contenido,
      editado_por: ctx.user.id,
    });

    const candidatos = await this.listUsuariosMencion(ctx, "");
    const mencionIds = extractMentionedUserIds(payload.contenido, candidatos);
    const previousMencionIds = (existing.comentario_mencion ?? []).map(
      (m) => m.usuario_id,
    );
    const newMencionIds = mencionIds.filter(
      (usuarioId) => !previousMencionIds.includes(usuarioId),
    );

    await comentarioRepository.updateContenido(ctx, id, payload.contenido);
    await comentarioRepository.replaceMenciones(ctx, id, mencionIds);

    const autorNombre = mapAutor(unwrapOne(existing.usuario ?? null)).nombre;
    await notifyMencionesEnComentario(ctx, {
      entidadTipo: existing.entidad_tipo,
      entidadId: existing.entidad_id,
      autorNombre,
      usuarioIds: newMencionIds,
    });

    await comentarioAuditoriaRepository.log(ctx, {
      accion: "comentario.editar",
      entidad: "comentario",
      entidad_id: id,
      expediente_id: auditoriaExpedienteIdFrom(
        existing.entidad_tipo,
        existing.entidad_id,
      ),
      detalle: { contenido_anterior: existing.contenido, menciones: mencionIds },
    });

    const row = await comentarioRepository.getById(ctx, id);
    if (!row) throw new Error("Comentario no encontrado");
    return mapRowToDto(row as unknown as ComentarioRow, ctx);
  },

  async remove(ctx: Ctx, id: string): Promise<void> {
    if (!ctx.tenant_id) throw new Error("Tenant no definido");

    const existing = (await comentarioRepository.getById(ctx, id)) as unknown as ComentarioRow | null;
    if (!existing) throw new Error("Comentario no encontrado");

    const canDelete =
      existing.usuario_id === ctx.user.id || isCommentAdmin(ctx);
    if (!canDelete) throw new Error("No tenés permiso para eliminar este comentario");

    await comentarioRepository.softDelete(ctx, id, ctx.user.id);

    await comentarioAuditoriaRepository.log(ctx, {
      accion: "comentario.eliminar",
      entidad: "comentario",
      entidad_id: id,
      expediente_id: auditoriaExpedienteIdFrom(
        existing.entidad_tipo,
        existing.entidad_id,
      ),
      detalle: { deleted_by: ctx.user.id },
    });
  },

  async listUsuariosMencion(
    ctx: Ctx,
    query: string,
  ): Promise<ComentarioUsuarioMencionDto[]> {
    if (!ctx.tenant_id) return [];

    const rows = await comentarioRepository.listUsuariosParaMencion(ctx, "");
    const term = normalizeSearchTerm(query);

    const mapped = (rows as UsuarioJoinRow[]).map((row) => ({
      id: row.id,
      nombre: personaDisplayName(unwrapOne(row.persona ?? null)),
    }));

    if (!term) return mapped;

    return mapped.filter((u) => normalizeSearchTerm(u.nombre).includes(term));
  },
};
