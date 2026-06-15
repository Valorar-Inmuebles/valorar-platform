import { queryOne } from "@/BBDD/base/query";
import sql from "@/BBDD/base/db";

export type CredencialRow = {
  usuario_id: string;
  email: string;
  password_hash: string;
  email_verificado_at: string | null;
  ultimo_login_at: string | null;
  password_actualizado_at: string;
  intentos_fallidos: number;
  bloqueado_hasta: string | null;
  activo: boolean | null;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const credencialRepository = {
  async findByEmail(email: string): Promise<CredencialRow | null> {
    return queryOne<CredencialRow>(
      `SELECT
         u.id AS usuario_id,
         u.email,
         u.password_hash,
         u.email_verificado_at,
         u.ultimo_login_at,
         u.password_actualizado_at,
         u.intentos_fallidos,
         u.bloqueado_hasta,
         u.activo
       FROM usuario u
       WHERE u.email = $1
         AND u.password_hash IS NOT NULL`,
      [normalizeEmail(email)],
    );
  },

  async findByUsuarioId(usuarioId: string): Promise<CredencialRow | null> {
    return queryOne<CredencialRow>(
      `SELECT
         u.id AS usuario_id,
         u.email,
         u.password_hash,
         u.email_verificado_at,
         u.ultimo_login_at,
         u.password_actualizado_at,
         u.intentos_fallidos,
         u.bloqueado_hasta,
         u.activo
       FROM usuario u
       WHERE u.id = $1`,
      [usuarioId],
    );
  },

  async emailExists(email: string, excludeUsuarioId?: string): Promise<boolean> {
    const row = await queryOne<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1
         FROM usuario
         WHERE email = $1
           AND ($2::uuid IS NULL OR id <> $2)
       ) AS exists`,
      [normalizeEmail(email), excludeUsuarioId ?? null],
    );
    return row?.exists ?? false;
  },

  async create(payload: {
    usuario_id: string;
    email: string;
    password_hash: string;
    email_verificado_at?: string | null;
  }) {
    const row = await queryOne<{ id: string }>(
      `UPDATE usuario
       SET email = $2,
           password_hash = $3,
           email_verificado_at = $4,
           password_actualizado_at = now(),
           updated_at = now()
       WHERE id = $1
       RETURNING id`,
      [
        payload.usuario_id,
        normalizeEmail(payload.email),
        payload.password_hash,
        payload.email_verificado_at ?? new Date().toISOString(),
      ],
    );
    if (!row) throw new Error("Error al crear credencial");
    return { usuario_id: row.id };
  },

  async updateEmail(usuarioId: string, email: string) {
    await sql.unsafe(
      `UPDATE usuario
       SET email = $1, updated_at = now()
       WHERE id = $2`,
      [normalizeEmail(email), usuarioId],
    );
  },

  async updatePassword(usuarioId: string, passwordHash: string) {
    await sql.unsafe(
      `UPDATE usuario
       SET password_hash = $1,
           password_actualizado_at = now(),
           updated_at = now(),
           intentos_fallidos = 0,
           bloqueado_hasta = NULL
       WHERE id = $2`,
      [passwordHash, usuarioId],
    );
  },

  async recordSuccessfulLogin(usuarioId: string) {
    await sql.unsafe(
      `UPDATE usuario
       SET ultimo_login_at = now(),
           intentos_fallidos = 0,
           bloqueado_hasta = NULL,
           updated_at = now()
       WHERE id = $1`,
      [usuarioId],
    );
  },

  async recordFailedLogin(
    usuarioId: string,
    maxAttempts: number,
    lockoutMinutes: number,
  ): Promise<{ locked: boolean }> {
    const row = await queryOne<{ intentos_fallidos: number }>(
      `UPDATE usuario
       SET intentos_fallidos = intentos_fallidos + 1,
           bloqueado_hasta = CASE
             WHEN intentos_fallidos + 1 >= $2
               THEN now() + ($3 || ' minutes')::interval
             ELSE bloqueado_hasta
           END,
           updated_at = now()
       WHERE id = $1
       RETURNING intentos_fallidos`,
      [usuarioId, maxAttempts, String(lockoutMinutes)],
    );

    return { locked: (row?.intentos_fallidos ?? 0) >= maxAttempts };
  },

  async clearAuthByUsuarioId(usuarioId: string) {
    await sql.unsafe(
      `UPDATE usuario
       SET email = NULL,
           password_hash = NULL,
           email_verificado_at = NULL,
           ultimo_login_at = NULL,
           intentos_fallidos = 0,
           bloqueado_hasta = NULL,
           updated_at = now()
       WHERE id = $1`,
      [usuarioId],
    );
  },
};
