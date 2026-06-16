import { redirect } from "next/navigation";

import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function NuevaContrasenaPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = params.token?.trim();

  if (!token) {
    redirect("/login/recuperar?error=enlace-invalido");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            J
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            Nueva contraseña
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Definí una contraseña segura para tu cuenta
          </p>
        </div>

        <Card>
          <CardContent className="px-6 py-6">
            <UpdatePasswordForm token={token} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
