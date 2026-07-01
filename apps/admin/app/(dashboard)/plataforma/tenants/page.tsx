import { TenantsManager } from "@/components/platform/tenants-manager";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { PageShell } from "@/components/shared/page-shell";
import { listPlatformTenants } from "@/lib/api/platform-tenants";
import { mapUnknownError } from "@/lib/api/error-map";
import { requireSuperAdminSession } from "@/lib/auth/require-super-admin";

export default async function PlataformaTenantsPage() {
  await requireSuperAdminSession();

  try {
    const { stats, items } = await listPlatformTenants();

    return (
      <PageShell
        title="Tenants"
        description="Administración global de inmobiliarias en la plataforma."
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: "Plataforma", href: "/plataforma/tenants" },
          { label: "Tenants" },
        ]}
      >
        <TenantsManager tenants={items} stats={stats} />
      </PageShell>
    );
  } catch (error) {
    return (
      <PageShell title="Tenants">
        <ApiErrorPanel message={mapUnknownError(error)} />
      </PageShell>
    );
  }
}
