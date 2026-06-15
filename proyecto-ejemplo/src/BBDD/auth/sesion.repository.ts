import { queryOne } from "@/BBDD/base/query";
import sql from "@/BBDD/base/db";

const SESSION_ACTIVE_CACHE_TTL_MS = 30_000;

type SessionActiveCacheEntry = {
  active: boolean;
  expiresAt: number;
};

const sessionActiveCache = new Map<string, SessionActiveCacheEntry>();

function getCachedSessionActive(sessionId: string): boolean | null {
  const cached = sessionActiveCache.get(sessionId);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    sessionActiveCache.delete(sessionId);
    return null;
  }
  return cached.active;
}

function setCachedSessionActive(sessionId: string, active: boolean): void {
  sessionActiveCache.set(sessionId, {
    active,
    expiresAt: Date.now() + SESSION_ACTIVE_CACHE_TTL_MS,
  });
}

function clearSessionActiveCache(sessionId?: string): void {
  if (sessionId) {
    sessionActiveCache.delete(sessionId);
    return;
  }
  sessionActiveCache.clear();
}

export type SesionRow = {
  id: string;
  usuario_id: string;
  refresh_token_hash: string;
  expires_at: string;
  revocado_at: string | null;
};

export const sesionRepository = {
  async create(payload: {
    usuario_id: string;
    refresh_token_hash: string;
    expires_at: string;
    ip?: string | null;
    user_agent?: string | null;
  }): Promise<{ id: string }> {
    const row = await queryOne<{ id: string }>(
      `INSERT INTO usuario_sesion (
         usuario_id, refresh_token_hash, expires_at, ip, user_agent
       )
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        payload.usuario_id,
        payload.refresh_token_hash,
        payload.expires_at,
        payload.ip ?? null,
        payload.user_agent ?? null,
      ],
    );
    if (!row) throw new Error("Error al crear sesión");
    return row;
  },

  async findByRefreshTokenHash(
    refreshTokenHash: string,
  ): Promise<SesionRow | null> {
    return queryOne<SesionRow>(
      `SELECT id, usuario_id, refresh_token_hash, expires_at, revocado_at
       FROM usuario_sesion
       WHERE refresh_token_hash = $1`,
      [refreshTokenHash],
    );
  },

  async isActive(sessionId: string): Promise<boolean> {
    const cached = getCachedSessionActive(sessionId);
    if (cached !== null) {
      return cached;
    }

    const row = await queryOne<{ active: boolean }>(
      `SELECT EXISTS (
         SELECT 1
         FROM usuario_sesion
         WHERE id = $1
           AND revocado_at IS NULL
           AND expires_at > now()
       ) AS active`,
      [sessionId],
    );
    const active = row?.active ?? false;
    setCachedSessionActive(sessionId, active);
    return active;
  },

  async revoke(sessionId: string) {
    clearSessionActiveCache(sessionId);
    await sql.unsafe(
      `UPDATE usuario_sesion
       SET revocado_at = now(), ultimo_uso_at = now()
       WHERE id = $1 AND revocado_at IS NULL`,
      [sessionId],
    );
  },

  async revokeAllForUser(usuarioId: string) {
    clearSessionActiveCache();
    await sql.unsafe(
      `UPDATE usuario_sesion
       SET revocado_at = now(), ultimo_uso_at = now()
       WHERE usuario_id = $1 AND revocado_at IS NULL`,
      [usuarioId],
    );
  },

  async touch(sessionId: string) {
    await sql.unsafe(
      `UPDATE usuario_sesion SET ultimo_uso_at = now() WHERE id = $1`,
      [sessionId],
    );
  },
};
