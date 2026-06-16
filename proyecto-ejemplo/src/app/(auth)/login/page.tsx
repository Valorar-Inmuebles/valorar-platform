import { redirect } from "next/navigation";

import { AUTH_LOGIN_ERROR_NOT_ENABLED } from "@/lib/auth/errors";
import { getAccessPayloadFromCookies } from "@/lib/auth/server-session";
import { authService } from "@/lib/server/services/auth.service";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  searchParams: Promise<{ recuperado?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const passwordUpdated = params.recuperado === "1";
  const notEnabled = params.error === AUTH_LOGIN_ERROR_NOT_ENABLED;

  const access = await getAccessPayloadFromCookies();

  if (notEnabled && access) {
    await authService.revokeCurrentSession();
  } else if (access) {
    redirect("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            J
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            Iniciar sesión
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Accedé a tu espacio de trabajo
          </p>
        </div>

        <Card>
          <CardContent className="px-6 py-6">
            {notEnabled ? (
              <p className="mb-4 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-sm text-amber-900">
                Tu usuario no se encuentra habilitado en el sistema. Contactá al
                administrador para solicitar el acceso.
              </p>
            ) : null}
            {passwordUpdated ? (
              <p className="mb-4 rounded-lg border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-800">
                Tu contraseña se actualizó correctamente. Ingresá con la nueva
                contraseña.
              </p>
            ) : null}
            <LoginForm />
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-zinc-400">
          JurilexIA &mdash; Plataforma de gestión jurídica
        </p>
      </div>
    </div>
  );
}
