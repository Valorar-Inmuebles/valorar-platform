import { ApiError, apiFetch } from "@/lib/api/client";
import type { AdminSession, AuthUser } from "@/lib/auth/types";

export async function getSession(): Promise<AdminSession | null> {
  try {
    const user = await apiFetch<AuthUser>("/auth/me", { cache: "no-store" });
    return { user };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }

    throw error;
  }
}

export async function requireSession(): Promise<AdminSession> {
  const session = await getSession();

  if (!session) {
    throw new Error("Sesión no disponible.");
  }

  return session;
}
