import { redirect } from "next/navigation";
import { ConfigSubNav } from "@/components/config/config-sub-nav";
import { RolesOverview } from "@/components/config/roles-overview";
import { PageShell } from "@/components/shared/page-shell";
import { getSession } from "@/lib/auth/session";
import { sessionHasPermission } from "@/lib/auth/types";

export default async function ConfiguracionRolesPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (!sessionHasPermission(session.user, "user.read")) {
    redirect("/");
  }

  return (
    <PageShell
      title="Roles y permisos"
      description="Matriz de roles predefinidos de la plataforma."
      breadcrumbs={[
        { label: "Inicio", href: "/" },
        { label: "Configuración", href: "/configuracion" },
        { label: "Roles y permisos" },
      ]}
      subNav={<ConfigSubNav />}
    >
      <RolesOverview />
    </PageShell>
  );
}
