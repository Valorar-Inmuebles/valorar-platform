import type { DbContext } from "@/BBDD/base/types";
import { pgQuery } from "@/BBDD/base/executor";

type AuditoriaCtx = DbContext & {
  user: { id: string };
};

type AuditoriaPayload = {
  accion: string;
  entidad: string;
  entidad_id: string;
  detalle?: Record<string, unknown> | null;
  expediente_id?: string | null;
};

export const comentarioAuditoriaRepository = {
  async log(ctx: AuditoriaCtx, payload: AuditoriaPayload) {
    if (!ctx.tenant_id) return;

    await pgQuery(
      `INSERT INTO auditoria (
         tenant_id, accion, entidad, entidad_id, detalle, expediente_id, usuario_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        ctx.tenant_id,
        payload.accion,
        payload.entidad,
        payload.entidad_id,
        payload.detalle ?? null,
        payload.expediente_id ?? null,
        ctx.user.id,
      ],
    );
  },
};
