import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@repo/ui/button";
import { PropertyListView } from "@/components/property/property-list-view";
import { PropertyListError } from "@/components/property/property-list-error";
import { SuperAdminTenantEmptyState } from "@/components/shared/super-admin-tenant-empty-state";
import { PageShell } from "@/components/shared/page-shell";
import { mapUnknownError } from "@/lib/api/error-map";
import { getPropertyList } from "@/lib/api/property-list";
import { getProvinces } from "@/lib/api/geo";
import { resolveActiveTenantGate } from "@/lib/auth/require-active-tenant";
import { getActiveTenantId } from "@/lib/auth/active-tenant";
import { getSession } from "@/lib/auth/session";
import { sessionHasPermission } from "@/lib/auth/types";
import { propertyListBreadcrumbs } from "@/lib/property/breadcrumbs";
import { parsePropertyListQuery } from "@/lib/property/property-list-query";

export default async function PropiedadesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const [session, activeTenantId] = await Promise.all([
    getSession(),
    getActiveTenantId(),
  ]);
  if (!session) redirect("/login");
  if (!sessionHasPermission(session.user, "property.read")) redirect("/");

  const tenantGate = resolveActiveTenantGate(session.user, activeTenantId);
  const shell = (content: React.ReactNode) => (
    <PageShell
      title="Propiedades"
      breadcrumbs={propertyListBreadcrumbs()}
      actions={
        sessionHasPermission(session.user, "property.create") ? (
          <Link href="/propiedades/crear">
            <Button>Nueva propiedad</Button>
          </Link>
        ) : undefined
      }
    >
      {content}
    </PageShell>
  );
  if (!tenantGate.ok) return shell(<SuperAdminTenantEmptyState />);

  const filters = parsePropertyListQuery(raw);
  try {
    const [result, provinces] = await Promise.all([
      getPropertyList(filters),
      getProvinces()
        .then((value) => ({ value, error: false }))
        .catch(() => ({ value: [], error: true })),
    ]);
    return shell(
      <PropertyListView
        result={result}
        filters={filters}
        provinceOptions={provinces.value.map(({ id, name }) => ({
          value: id,
          label: name,
        }))}
        provinceError={
          provinces.error
            ? "No pudimos cargar las provincias. Intentá nuevamente."
            : undefined
        }
        canCreate={sessionHasPermission(session.user, "property.create")}
      />,
    );
  } catch (error) {
    return shell(<PropertyListError message={mapUnknownError(error)} />);
  }
}
