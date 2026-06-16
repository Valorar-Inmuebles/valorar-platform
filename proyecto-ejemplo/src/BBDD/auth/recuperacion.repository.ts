import { queryOne } from "@/BBDD/base/query";
import sql from "@/BBDD/base/db";

export type RecuperacionRow = {
  id: string;
  usuario_id: string;
  token_hash: string;
  expires_at: string;
  usado_at: string | null;
};

export const recuperacionRepository = {
  async invalidatePendingForUser(usuarioId: string) {
    await sql.unsafe(
      `UPDATE usuario_recuperacion
       SET usado_at = now()
       WHERE usuario_id = $1 AND usado_at IS NULL`,
      [usuarioId],
    );
  },

  async create(payload: {
    usuario_id: string;
    token_hash: string;
    expires_at: string;
  }): Promise<{ id: string }> {
    const row = await queryOne<{ id: string }>(
      `INSERT INTO usuario_recuperacion (usuario_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [payload.usuario_id, payload.token_hash, payload.expires_at],
    );
    if (!row) throw new Error("Error al crear token de recuperación");
    return row;
  },

  async findValidByTokenHash(tokenHash: string): Promise<RecuperacionRow | null> {
    return queryOne<RecuperacionRow>(
      `SELECT id, usuario_id, token_hash, expires_at, usado_at
       FROM usuario_recuperacion
       WHERE token_hash = $1
         AND usado_at IS NULL
         AND expires_at > now()`,
      [tokenHash],
    );
  },

  async markUsed(id: string) {
    await sql.unsafe(
      `UPDATE usuario_recuperacion SET usado_at = now() WHERE id = $1`,
      [id],
    );
  },
};
