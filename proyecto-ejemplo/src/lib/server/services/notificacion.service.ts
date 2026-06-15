import {
  AGENDA_EVENTO_AVISO_TIPO,
  agendaEventoNotificacionId,
  buildAgendaEventoAvisoLink,
  buildAgendaEventoAvisoMensaje,
  parseAgendaEventoNotificacionId,
} from "@/lib/agenda/agenda-evento-notificacion";
import { extractNotificacionHref } from "@/lib/notificaciones/notificacion-link";
import type {
  NotificacionDto,
  NotificacionesPollDto,
  NotificacionesSummaryDto,
} from "@/lib/types/notificacion";
import type { getServerContext } from "../context/getServerContext";
import {
  agendaEventoParticipanteRepository,
  type AgendaEventoAvisoPendienteRow,
} from "@/BBDD/repositories/agenda-evento-participante.repository";
import {
  notificacionRepository,
  type NotificacionRow,
} from "@/BBDD/repositories/notificacion.repository";

type Ctx = Awaited<ReturnType<typeof getServerContext>>;

const SUMMARY_LIMIT = 20;
const POLL_LIMIT = 20;

function mapRowToDto(row: NotificacionRow): NotificacionDto {
  return {
    id: row.id,
    tipo: row.tipo,
    titulo: row.titulo,
    mensaje: row.mensaje,
    leida: row.leida,
    createdAt: row.created_at,
    link: row.link ?? extractNotificacionHref(row.mensaje),
  };
}

function mapAgendaAvisoToDto(row: AgendaEventoAvisoPendienteRow): NotificacionDto {
  return {
    id: agendaEventoNotificacionId(row.evento_id),
    tipo: AGENDA_EVENTO_AVISO_TIPO,
    titulo: row.titulo.trim() || "Evento en agenda",
    mensaje: buildAgendaEventoAvisoMensaje({
      titulo: row.titulo,
      inicioAt: row.inicio_at,
      finAt: row.fin_at,
      todoElDia: row.todo_el_dia,
    }),
    leida: false,
    createdAt: row.aviso_at,
    link: buildAgendaEventoAvisoLink(row.evento_id, row.inicio_at),
  };
}

function sortByCreatedAtDesc(items: NotificacionDto[]): NotificacionDto[] {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/** Prioriza no leídas (tabla + agenda); completa con leídas recientes hasta el límite. */
function mergeNotificationItems(
  tableItems: NotificacionDto[],
  agendaItems: NotificacionDto[],
  limit: number,
  options?: { unreadOnly?: boolean },
): NotificacionDto[] {
  const tableUnread = tableItems.filter((item) => !item.leida);
  const tableRead = options?.unreadOnly
    ? []
    : tableItems.filter((item) => item.leida);

  const seen = new Set<string>();
  const result: NotificacionDto[] = [];

  for (const item of sortByCreatedAtDesc([...tableUnread, ...agendaItems])) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }

  for (const item of sortByCreatedAtDesc(tableRead)) {
    if (result.length >= limit) break;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }

  return result.slice(0, limit);
}

async function listAgendaAvisosPendientes(ctx: Ctx): Promise<NotificacionDto[]> {
  const rows = await agendaEventoParticipanteRepository.listPendientesAvisoForUsuario(
    ctx,
    ctx.user.id,
  );
  return rows.map(mapAgendaAvisoToDto);
}

export const notificacionService = {
  async poll(ctx: Ctx): Promise<NotificacionesPollDto> {
    const [{ unreadCount, items }, agendaAvisos, agendaUnreadCount] =
      await Promise.all([
        notificacionRepository.pollUnread(ctx, ctx.user.id, POLL_LIMIT),
        listAgendaAvisosPendientes(ctx),
        agendaEventoParticipanteRepository.countPendientesAvisoForUsuario(
          ctx,
          ctx.user.id,
        ),
      ]);

    const tableUnread = items.map(mapRowToDto);
    const unreadItems = mergeNotificationItems(
      tableUnread,
      agendaAvisos,
      POLL_LIMIT,
      { unreadOnly: true },
    );

    return {
      unreadCount: unreadCount + agendaUnreadCount,
      unreadItems,
    };
  },

  async summary(ctx: Ctx): Promise<NotificacionesSummaryDto> {
    const [{ unreadCount, items }, agendaAvisos, agendaUnreadCount] =
      await Promise.all([
        notificacionRepository.listSummary(ctx, ctx.user.id, SUMMARY_LIMIT),
        listAgendaAvisosPendientes(ctx),
        agendaEventoParticipanteRepository.countPendientesAvisoForUsuario(
          ctx,
          ctx.user.id,
        ),
      ]);

    const mergedItems = mergeNotificationItems(
      items.map(mapRowToDto),
      agendaAvisos,
      SUMMARY_LIMIT,
    );

    return {
      unreadCount: unreadCount + agendaUnreadCount,
      items: mergedItems,
    };
  },

  async markAsRead(ctx: Ctx, id: string): Promise<NotificacionDto> {
    const eventoId = parseAgendaEventoNotificacionId(id);
    if (eventoId) {
      const pendientes =
        await agendaEventoParticipanteRepository.listPendientesAvisoForUsuario(
          ctx,
          ctx.user.id,
        );
      const row = pendientes.find((item) => item.evento_id === eventoId);
      if (!row) throw new Error("Notificación no encontrada");

      const notificadoAt = new Date().toISOString();
      await agendaEventoParticipanteRepository.markNotificado(
        ctx,
        eventoId,
        ctx.user.id,
        notificadoAt,
      );

      return { ...mapAgendaAvisoToDto(row), leida: true };
    }

    const updated = await notificacionRepository.markAsRead(
      ctx,
      ctx.user.id,
      id,
    );

    if (!updated) throw new Error("Notificación no encontrada");
    return mapRowToDto(updated);
  },

  async markAllAsRead(ctx: Ctx): Promise<void> {
    const notificadoAt = new Date().toISOString();
    await Promise.all([
      notificacionRepository.markAllAsRead(ctx, ctx.user.id),
      agendaEventoParticipanteRepository.markAllPendientesAvisoNotificado(
        ctx,
        ctx.user.id,
        notificadoAt,
      ),
    ]);
  },
};
