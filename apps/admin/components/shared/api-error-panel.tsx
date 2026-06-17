import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";

type ApiErrorPanelProps = {
  title?: string;
  message: string;
};

export function ApiErrorPanel({
  title = "No se pudo cargar la información",
  message,
}: ApiErrorPanelProps) {
  const showTechnicalHint = process.env.NODE_ENV === "development";

  return (
    <Card className="border-red-200 bg-red-50/40">
      <CardHeader>
        <CardTitle className="text-red-700">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-red-700">{message}</p>
        {showTechnicalHint ? (
          <p className="mt-3 text-xs text-muted">
            Modo desarrollo: verificá que la API esté corriendo, que{" "}
            <code className="rounded bg-zinc-100 px-1">API_URL</code> apunte a{" "}
            <code className="rounded bg-zinc-100 px-1">apps/api</code> y que tu
            sesión esté activa. Si expiró, volvé a{" "}
            <a href="/login" className="underline">
              iniciar sesión
            </a>
            .
          </p>
        ) : (
          <p className="mt-3 text-xs text-muted">
            Si el problema persiste, contactá al administrador del sistema.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
