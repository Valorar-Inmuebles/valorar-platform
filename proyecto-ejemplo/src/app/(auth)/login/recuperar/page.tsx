import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorMessage } from "@/components/ui/form-field";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function RecuperarContrasenaPage({ searchParams }: Props) {
  const params = await searchParams;
  const linkError = params.error === "enlace-invalido";

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            J
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            Recuperar contraseña
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Te enviaremos un enlace por email
          </p>
        </div>

        <Card>
          <CardContent className="px-6 py-6">
            {linkError ? (
              <div className="mb-4">
                <ErrorMessage>
                  El enlace no es válido o ya expiró. Solicitá uno nuevo.
                </ErrorMessage>
              </div>
            ) : null}
            <ForgotPasswordForm />
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-zinc-400">
          <Link href="/login" className="hover:text-zinc-600">
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
