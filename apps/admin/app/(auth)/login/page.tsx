import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted">
          Accedé al panel administrativo con tu cuenta.
        </p>
        <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
          <LoginForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
