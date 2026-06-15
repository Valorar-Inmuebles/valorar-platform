import { Suspense } from "react";

import { requireAuth } from "@/lib/auth/require-auth";
import { needsViewTenantSelection } from "@/lib/auth/view-tenant";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { AgendaPage } from "@/components/modules/agenda/AgendaPage";

export default async function AgendaRoutePage() {
  const ctx = await requireAuth();
  const needsTenantSelection = needsViewTenantSelection(ctx);

  return (
    <div className="space-y-3">
      <PageHeader
        // title="Agenda"
        breadcrumb={[
          { label: "Inicio", href: "/" },
          { label: "Agenda" },
        ]}
      />

      {needsTenantSelection ? (
        <EmptyState
          title="Seleccioná un tenant"
          description="Usá el selector del encabezado para elegir un tenant y ver la agenda."
        />
      ) : (
        <Suspense
          fallback={
            <div className="flex justify-center py-16">
              <Spinner className="size-6" />
            </div>
          }
        >
          <AgendaPage />
        </Suspense>
      )}
    </div>
  );
}
