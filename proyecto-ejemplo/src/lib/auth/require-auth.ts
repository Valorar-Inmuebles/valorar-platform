import { redirect } from "next/navigation";

import {
  AUTH_LOGIN_ERROR_NOT_ENABLED,
  UsuarioNoHabilitadoError,
} from "@/lib/auth/errors";
import { authService } from "@/lib/server/services/auth.service";
import { getServerContext } from "@/lib/server/context/getServerContext";

export async function requireAuth() {
  try {
    return await getServerContext();
  } catch (error) {
    if (error instanceof UsuarioNoHabilitadoError) {
      await authService.revokeCurrentSession();
      redirect(`/login?error=${AUTH_LOGIN_ERROR_NOT_ENABLED}`);
    }

    redirect("/login");
  }
}
