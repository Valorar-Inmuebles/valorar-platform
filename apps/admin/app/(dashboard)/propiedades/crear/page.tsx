import Link from "next/link";
import { Button } from "@repo/ui/button";
import { PropertyForm } from "@/components/property/property-form";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { PageShell } from "@/components/shared/page-shell";
import { SuperAdminTenantEmptyState } from "@/components/shared/super-admin-tenant-empty-state";
import { listUsers } from "@/lib/api/users";
import type { AssignableUserOption } from "@/lib/api/types/organization";
import { mapUnknownError } from "@/lib/api/error-map";
import { resolveActiveTenantGate } from "@/lib/auth/require-active-tenant";
import { getActiveTenantId } from "@/lib/auth/active-tenant";
import { getSession } from "@/lib/auth/session";
import { propertyCreateBreadcrumbs } from "@/lib/property/breadcrumbs";

function toAssignableUsers(
  users: Awaited<ReturnType<typeof listUsers>>,
): AssignableUserOption[] {
  return users
    .filter((user) => user.isActive)
    .map((user) => ({ id: user.id, name: user.name }));
}

export default async function PropiedadCrearPage() {
  const [session, activeTenantId] = await Promise.all([
    getSession(),
    getActiveTenantId(),
  ]);

  if (!session) {
    return null;
  }

  const tenantGate = resolveActiveTenantGate(session.user, activeTenantId);
  if (!tenantGate.ok) {
    return (
      <PageShell title="Nueva propiedad" breadcrumbs={propertyCreateBreadcrumbs()}>
        <SuperAdminTenantEmptyState />
      </PageShell>
    );
  }

  try {
    const assignableUsers = toAssignableUsers(await listUsers());

    return (
      <PageShell
        title="Nueva propiedad"
        description="Completá los datos principales del inmueble."
        breadcrumbs={propertyCreateBreadcrumbs()}
        actions={
          <Link href="/propiedades">
            <Button variant="secondary">Volver al listado</Button>
          </Link>
        }
      >
        <PropertyForm mode="create" assignableUsers={assignableUsers} />
      </PageShell>
    );
  } catch (error) {
    return (
      <PageShell title="Nueva propiedad" breadcrumbs={propertyCreateBreadcrumbs()}>
        <ApiErrorPanel message={mapUnknownError(error)} />
      </PageShell>
    );
  }
}
