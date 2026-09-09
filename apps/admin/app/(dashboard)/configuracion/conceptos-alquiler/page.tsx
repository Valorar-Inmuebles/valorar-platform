import { redirect } from "next/navigation";
import { ConfigSubNav } from "@/components/config/config-sub-nav";
import { RentalConceptManager } from "@/components/rental/rental-concept-manager";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { PageShell } from "@/components/shared/page-shell";
import { mapUnknownError } from "@/lib/api/error-map";
import { listRentalConcepts } from "@/lib/api/rental";
import { getActiveTenantId } from "@/lib/auth/active-tenant";
import { resolveActiveTenantGate } from "@/lib/auth/require-active-tenant";
import { getSession } from "@/lib/auth/session";
import { sessionHasPermission } from "@/lib/auth/types";
import { SuperAdminTenantEmptyState } from "@/components/shared/super-admin-tenant-empty-state";

export default async function ConceptosAlquilerPage() {
  const [session, activeTenantId] = await Promise.all([
    getSession(),
    getActiveTenantId(),
  ]);
  if (!session) redirect("/login");
  if (!sessionHasPermission(session.user, "rental.contract.update"))
    redirect("/");
  const gate = resolveActiveTenantGate(session.user, activeTenantId);
  if (!gate.ok) {
    return (
      <PageShell title="Conceptos de alquiler" subNav={<ConfigSubNav />}>
        <SuperAdminTenantEmptyState />
      </PageShell>
    );
  }
  try {
    const concepts = await listRentalConcepts(true);
    return (
      <PageShell
        title="Conceptos de alquiler"
        description="Conceptos base y personalizados del tenant."
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: "Configuración", href: "/configuracion" },
          { label: "Conceptos de alquiler" },
        ]}
        subNav={<ConfigSubNav />}
      >
        <RentalConceptManager initialConcepts={concepts} />
      </PageShell>
    );
  } catch (error) {
    return (
      <PageShell title="Conceptos de alquiler" subNav={<ConfigSubNav />}>
        <ApiErrorPanel message={mapUnknownError(error)} />
      </PageShell>
    );
  }
}
