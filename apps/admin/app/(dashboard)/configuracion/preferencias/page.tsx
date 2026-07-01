import { redirect } from "next/navigation";
import { Card } from "@repo/ui/card";
import { ConfigSubNav } from "@/components/config/config-sub-nav";
import { PageShell } from "@/components/shared/page-shell";
import { getSession } from "@/lib/auth/session";

export default async function ConfiguracionPreferenciasPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <PageShell
      title="Preferencias"
      description="Ajustes personales de la experiencia en el panel."
      breadcrumbs={[
        { label: "Inicio", href: "/" },
        { label: "Configuración", href: "/configuracion" },
        { label: "Preferencias" },
      ]}
      subNav={<ConfigSubNav />}
    >
      <Card className="space-y-3 p-6 text-sm">
        <p className="font-medium text-foreground">Notificaciones</p>
        <p className="text-muted">
          Alertas por email y resumen operativo — disponible en una próxima versión.
        </p>
      </Card>
    </PageShell>
  );
}
