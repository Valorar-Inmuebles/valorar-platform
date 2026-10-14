import { redirect } from "next/navigation";
import { ConfigSubNav } from "@/components/config/config-sub-nav";
import { ProfileSettings } from "@/components/config/profile-settings";
import { PageShell } from "@/components/shared/page-shell";
import { getProfile } from "@/lib/api/users";
import { mapUnknownError } from "@/lib/api/error-map";
import { getSession } from "@/lib/auth/session";

export default async function ConfiguracionPerfilPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (!session.user.tenantId) {
    return (
      <PageShell
        title="Perfil"
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: "Configuración", href: "/configuracion" },
          { label: "Perfil" },
        ]}
        subNav={<ConfigSubNav />}
      >
        <ProfileSettings user={session.user} />
      </PageShell>
    );
  }

  try {
    const profile = await getProfile();

    return (
      <PageShell
        title="Perfil"
        description="Tu información personal y credenciales."
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: "Configuración", href: "/configuracion" },
          { label: "Perfil" },
        ]}
        subNav={<ConfigSubNav />}
      >
        <ProfileSettings user={session.user} profile={profile} />
      </PageShell>
    );
  } catch (error) {
    return (
      <PageShell title="Perfil" subNav={<ConfigSubNav />}>
        <ProfileSettings
          user={session.user}
          profileError={mapUnknownError(error)}
        />
      </PageShell>
    );
  }
}
