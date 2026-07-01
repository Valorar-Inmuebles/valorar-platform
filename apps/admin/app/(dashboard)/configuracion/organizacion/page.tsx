import { redirect } from "next/navigation";
import { ConfigSubNav } from "@/components/config/config-sub-nav";
import { OrganizationForm } from "@/components/config/organization-form";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { PageShell } from "@/components/shared/page-shell";
import { SuperAdminTenantEmptyState } from "@/components/shared/super-admin-tenant-empty-state";
import { getOrganization } from "@/lib/api/organization";
import { mapUnknownError } from "@/lib/api/error-map";
import { resolveActiveTenantGate } from "@/lib/auth/require-active-tenant";
import { getActiveTenantId } from "@/lib/auth/active-tenant";
import { getSession } from "@/lib/auth/session";
import { sessionHasPermission } from "@/lib/auth/types";

export default async function ConfiguracionOrganizacionPage() {
  const [session, activeTenantId] = await Promise.all([
    getSession(),
    getActiveTenantId(),
  ]);

  if (!session) {
    redirect("/login");
  }

  const tenantGate = resolveActiveTenantGate(session.user, activeTenantId);
  if (!tenantGate.ok) {
    return (
      <PageShell
        title="Organización"
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: "Configuración", href: "/configuracion" },
          { label: "Organización" },
        ]}
        subNav={<ConfigSubNav />}
      >
        <SuperAdminTenantEmptyState />
      </PageShell>
    );
  }

  const canEdit = sessionHasPermission(session.user, "organization.update");

  try {
    const organization = await getOrganization();

    return (
      <PageShell
        title="Organización"
        description="Datos comerciales, branding y permisos de propiedades."
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: "Configuración", href: "/configuracion" },
          { label: "Organización" },
        ]}
        subNav={<ConfigSubNav />}
      >
        <OrganizationForm organization={organization} readOnly={!canEdit} />
      </PageShell>
    );
  } catch (error) {
    return (
      <PageShell title="Organización" subNav={<ConfigSubNav />}>
        <ApiErrorPanel message={mapUnknownError(error)} />
      </PageShell>
    );
  }
}
