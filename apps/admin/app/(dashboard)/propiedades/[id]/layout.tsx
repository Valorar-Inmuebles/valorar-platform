import type { ReactNode } from "react";
import { PropertySubNav } from "@/components/property/property-sub-nav";
import { SuperAdminTenantEmptyState } from "@/components/shared/super-admin-tenant-empty-state";
import { PageShell } from "@/components/shared/page-shell";
import { resolveActiveTenantGate } from "@/lib/auth/require-active-tenant";
import { getActiveTenantId } from "@/lib/auth/active-tenant";
import { getSession } from "@/lib/auth/session";
import { propertyListBreadcrumbs } from "@/lib/property/breadcrumbs";

type PropertyDetailLayoutProps = {
  children: ReactNode;
  params: Promise<{ id: string }>;
};

export default async function PropertyDetailLayout({
  children,
  params,
}: PropertyDetailLayoutProps) {
  const [{ id }, session, activeTenantId] = await Promise.all([
    params,
    getSession(),
    getActiveTenantId(),
  ]);

  if (!session) {
    return null;
  }

  const tenantGate = resolveActiveTenantGate(session.user, activeTenantId);

  if (!tenantGate.ok) {
    return (
      <PageShell
        title="Propiedad"
        breadcrumbs={[
          ...propertyListBreadcrumbs(),
          { label: "Detalle" },
        ]}
        subNav={<PropertySubNav propertyId={id} />}
      >
        <SuperAdminTenantEmptyState />
      </PageShell>
    );
  }

  return children;
}
