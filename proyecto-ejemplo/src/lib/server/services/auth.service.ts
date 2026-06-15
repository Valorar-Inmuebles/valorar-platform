import {
  getRefreshTtlSeconds,
  getResetTtlMinutes,
  LOGIN_LOCKOUT_MINUTES,
  MAX_FAILED_LOGIN_ATTEMPTS,
} from "@/lib/auth/config";
import {
  clearAuthCookies,
  getRefreshTokenFromCookies,
  setAuthCookies,
} from "@/lib/auth/cookies";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signAccessToken, signServiceToken } from "@/lib/auth/session";
import { generateOpaqueToken, hashToken } from "@/lib/auth/tokens";
import { credencialRepository } from "@/BBDD/auth/credencial.repository";
import { recuperacionRepository } from "@/BBDD/auth/recuperacion.repository";
import { sesionRepository } from "@/BBDD/auth/sesion.repository";
import { sendPasswordResetLink } from "@/lib/server/services/email.service";

const GENERIC_LOGIN_ERROR = "Email o contraseña incorrectos.";
const ACCOUNT_LOCKED_ERROR =
  "Demasiados intentos fallidos. Probá de nuevo en unos minutos.";

type SessionMeta = {
  ip?: string | null;
  userAgent?: string | null;
};

function refreshExpiresAt(): string {
  return new Date(Date.now() + getRefreshTtlSeconds() * 1000).toISOString();
}

function resetExpiresAt(): string {
  return new Date(
    Date.now() + getResetTtlMinutes() * 60 * 1000,
  ).toISOString();
}

async function createSession(
  usuarioId: string,
  email: string,
  meta?: SessionMeta,
): Promise<void> {
  const refreshToken = generateOpaqueToken();
  const refreshTokenHash = hashToken(refreshToken);
  const session = await sesionRepository.create({
    usuario_id: usuarioId,
    refresh_token_hash: refreshTokenHash,
    expires_at: refreshExpiresAt(),
    ip: meta?.ip,
    user_agent: meta?.userAgent,
  });

  const accessToken = await signAccessToken({
    sub: usuarioId,
    sid: session.id,
    email,
  });

  await setAuthCookies(accessToken, refreshToken);
}

export const authService = {
  async login(
    email: string,
    password: string,
    meta?: SessionMeta,
  ): Promise<{ error?: string }> {
    const credencial = await credencialRepository.findByEmail(email);

    if (!credencial) {
      return { error: GENERIC_LOGIN_ERROR };
    }

    if (credencial.bloqueado_hasta) {
      const lockedUntil = new Date(credencial.bloqueado_hasta).getTime();
      if (lockedUntil > Date.now()) {
        return { error: ACCOUNT_LOCKED_ERROR };
      }
    }

    if (credencial.activo === false) {
      return { error: GENERIC_LOGIN_ERROR };
    }

    const valid = await verifyPassword(password, credencial.password_hash);
    if (!valid) {
      await credencialRepository.recordFailedLogin(
        credencial.usuario_id,
        MAX_FAILED_LOGIN_ATTEMPTS,
        LOGIN_LOCKOUT_MINUTES,
      );
      return { error: GENERIC_LOGIN_ERROR };
    }

    await credencialRepository.recordSuccessfulLogin(credencial.usuario_id);
    await createSession(credencial.usuario_id, credencial.email, meta);

    return {};
  },

  async logout(): Promise<void> {
    const refreshToken = await getRefreshTokenFromCookies();
    if (refreshToken) {
      const session = await sesionRepository.findByRefreshTokenHash(
        hashToken(refreshToken),
      );
      if (session) {
        await sesionRepository.revoke(session.id);
      }
    }
    await clearAuthCookies();
  },

  async revokeCurrentSession(): Promise<void> {
    await authService.logout();
  },

  async requestPasswordReset(email: string): Promise<void> {
    const credencial = await credencialRepository.findByEmail(email);
    if (!credencial || credencial.activo === false) {
      return;
    }

    const token = generateOpaqueToken();
    const tokenHash = hashToken(token);

    await recuperacionRepository.invalidatePendingForUser(credencial.usuario_id);
    await recuperacionRepository.create({
      usuario_id: credencial.usuario_id,
      token_hash: tokenHash,
      expires_at: resetExpiresAt(),
    });

    await sendPasswordResetLink(credencial.email, token);
  },

  async resetPassword(
    token: string,
    password: string,
  ): Promise<{ error?: string }> {
    const tokenHash = hashToken(token);
    const recovery = await recuperacionRepository.findValidByTokenHash(tokenHash);

    if (!recovery) {
      return { error: "El enlace de recuperación es inválido o expiró." };
    }

    const credencial = await credencialRepository.findByUsuarioId(
      recovery.usuario_id,
    );
    if (!credencial || credencial.activo === false) {
      return { error: "El enlace de recuperación es inválido o expiró." };
    }

    const passwordHash = await hashPassword(password);
    await credencialRepository.updatePassword(recovery.usuario_id, passwordHash);
    await recuperacionRepository.markUsed(recovery.id);
    await sesionRepository.revokeAllForUser(recovery.usuario_id);

    return {};
  },

  async issueServiceToken(userId: string): Promise<string> {
    return signServiceToken(userId);
  },

  async createCredential(payload: {
    usuario_id: string;
    email: string;
    password: string;
  }): Promise<void> {
    const passwordHash = await hashPassword(payload.password);
    await credencialRepository.create({
      usuario_id: payload.usuario_id,
      email: payload.email,
      password_hash: passwordHash,
    });
  },

  async updateCredential(payload: {
    usuario_id: string;
    email?: string;
    password?: string;
  }): Promise<void> {
    if (payload.email) {
      await credencialRepository.updateEmail(payload.usuario_id, payload.email);
    }

    if (payload.password) {
      const passwordHash = await hashPassword(payload.password);
      await credencialRepository.updatePassword(
        payload.usuario_id,
        passwordHash,
      );
      await sesionRepository.revokeAllForUser(payload.usuario_id);
    }
  },

  async deleteCredential(usuarioId: string): Promise<void> {
    await sesionRepository.revokeAllForUser(usuarioId);
    await credencialRepository.clearAuthByUsuarioId(usuarioId);
  },
};
