import { Suspense } from "react";
import { Card } from "@repo/ui/card";
import { AdminBrandMark } from "@/components/branding/admin-brand-mark";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="relative z-10 w-full max-w-[540px]">
      <Card className="overflow-hidden border-border bg-surface shadow-sm ring-1 ring-black/[0.04]">
        <div className="px-6 py-7 sm:px-8 sm:py-8">
          <AdminBrandMark variant="login" />

          <div className="mt-7 space-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Iniciar sesión
            </h1>
            <p className="text-sm leading-relaxed text-muted">
              Accedé al panel de gestión de la inmobiliaria.
            </p>
          </div>

          <Suspense
            fallback={
              <p className="mt-6 text-sm text-muted">Cargando formulario…</p>
            }
          >
            <LoginForm className="mt-6" />
          </Suspense>
        </div>
      </Card>
    </div>
  );
}
