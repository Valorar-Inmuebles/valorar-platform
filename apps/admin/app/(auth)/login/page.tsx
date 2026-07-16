import { Suspense } from "react";
import { Card } from "@repo/ui/card";
import { AdminBrandMark } from "@/components/branding/admin-brand-mark";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="relative z-10 w-full max-w-[448px]">
      <div className="mb-8 flex justify-center sm:mb-10">
        <AdminBrandMark variant="login" />
      </div>

      <Card className="overflow-hidden border-border bg-surface shadow-sm ring-1 ring-black/[0.04]">
        <div className="px-6 py-9 sm:px-8 sm:py-10">
          <div className="space-y-2 text-center">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Iniciar sesión
            </h1>
            <p className="text-sm leading-relaxed text-muted">
              Accedé al panel de gestión de la inmobiliaria.
            </p>
          </div>

          <Suspense
            fallback={
              <p className="mt-10 text-center text-sm text-muted">
                Cargando formulario…
              </p>
            }
          >
            <LoginForm className="mt-10" />
          </Suspense>
        </div>
      </Card>
    </div>
  );
}
