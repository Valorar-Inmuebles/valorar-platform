import { notFound } from "next/navigation";
import { TenantDetailHeader } from "@/components/platform/tenant-detail-header";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { PageShell } from "@/components/shared/page-shell";
import { getPlatformTenant } from "@/lib/api/platform-tenants";
import { mapUnknownError } from "@/lib/api/error-map";
import { ApiError } from "@/lib/api/client";
import { requireSuperAdminSession } from "@/lib/auth/require-super-admin";

type TenantDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PlataformaTenantDetailPage({
  params,
}: TenantDetailPageProps) {
  await requireSuperAdminSession();
  const { id } = await params;

  try {
    const tenant = await getPlatformTenant(id);

    return (
      <PageShell
        title={tenant.name}
        description="Resumen de la inmobiliaria."
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: "Plataforma", href: "/plataforma/tenants" },
          { label: "Tenants", href: "/plataforma/tenants" },
          { label: tenant.name },
        ]}
      >
        <TenantDetailHeader tenant={tenant} />
      </PageShell>
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    return (
      <PageShell title="Tenant">
        <ApiErrorPanel message={mapUnknownError(error)} />
      </PageShell>
    );
  }
}
