import Link from "next/link";
import { Button } from "@repo/ui/button";
import { PropertyEmptyState } from "@/components/property/property-empty-state";
import { PropertyListView } from "@/components/property/property-list-view";
import { SuperAdminTenantEmptyState } from "@/components/shared/super-admin-tenant-empty-state";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { PageShell } from "@/components/shared/page-shell";
import { mapUnknownError } from "@/lib/api/error-map";
import { getDashboardSummary } from "@/lib/api/dashboard";
import { getPropertiesPublishabilitySummary } from "@/lib/api/property-publishability-summary";
import { listPropertyListings } from "@/lib/api/property-listing";
import { listProperties } from "@/lib/api/property";
import { buildActiveListingCountsByPropertyId } from "@/lib/property/active-listing-counts";
import { resolveActiveTenantGate } from "@/lib/auth/require-active-tenant";
import { getActiveTenantId } from "@/lib/auth/active-tenant";
import { getSession } from "@/lib/auth/session";
import { propertyListBreadcrumbs } from "@/lib/property/breadcrumbs";
import {
  parseAttentionFilter,
  parsePropertyListHref,
} from "@/lib/property/property-list-url";

type PropiedadesPageProps = {
  searchParams: Promise<{ estado?: string; atencion?: string }>;
};

export default async function PropiedadesPage({
  searchParams,
}: PropiedadesPageProps) {
  const { estado, atencion } = await searchParams;
  const initialCommercialFilter = parsePropertyListHref(estado);
  const initialAttentionFilter = parseAttentionFilter(atencion);

  const [session, activeTenantId] = await Promise.all([
    getSession(),
    getActiveTenantId(),
  ]);

  const tenantGate = session
    ? resolveActiveTenantGate(session.user, activeTenantId)
    : { ok: true as const };

  if (!tenantGate.ok) {
    return (
      <PageShell title="Propiedades" breadcrumbs={propertyListBreadcrumbs()}>
        <SuperAdminTenantEmptyState />
      </PageShell>
    );
  }

  let properties;
  let summaryByPropertyId: Record<
    string,
    Awaited<ReturnType<typeof getPropertiesPublishabilitySummary>>[number]
  > = {};
  let activeListingCountsByPropertyId = {};
  let attentionFilterSets = null;
  let errorMessage: string | null = null;

  try {
    const dataPromises: [
      ReturnType<typeof listProperties>,
      ReturnType<typeof getPropertiesPublishabilitySummary>,
      ReturnType<typeof listPropertyListings>,
      ReturnType<typeof getDashboardSummary> | Promise<null>,
    ] = [
      listProperties(),
      getPropertiesPublishabilitySummary(),
      listPropertyListings({ status: "ACTIVE" }),
      initialAttentionFilter ? getDashboardSummary() : Promise.resolve(null),
    ];

    const [propertyList, summaries, activeListings, dashboardSummary] =
      await Promise.all(dataPromises);

    properties = propertyList;
    summaryByPropertyId = Object.fromEntries(
      summaries.map((summary) => [summary.propertyId, summary]),
    );
    activeListingCountsByPropertyId =
      buildActiveListingCountsByPropertyId(activeListings);
    attentionFilterSets = dashboardSummary?.filterSets ?? null;
  } catch (error) {
    errorMessage = mapUnknownError(error);
  }

  return (
    <PageShell
      title="Propiedades"
      breadcrumbs={propertyListBreadcrumbs()}
      actions={
        <Link href="/propiedades/crear">
          <Button>Nueva propiedad</Button>
        </Link>
      }
    >
      {errorMessage ? (
        <ApiErrorPanel message={errorMessage} />
      ) : properties && properties.length === 0 ? (
        <PropertyEmptyState
          title="Sin propiedades todavía"
          description="Creá la primera propiedad del tenant para comenzar a gestionar publicaciones e imágenes."
          action={
            <Link href="/propiedades/crear">
              <Button>Nueva propiedad</Button>
            </Link>
          }
        />
      ) : properties ? (
        <PropertyListView
          properties={properties}
          summaryByPropertyId={summaryByPropertyId}
          activeListingCountsByPropertyId={activeListingCountsByPropertyId}
          initialCommercialFilter={initialCommercialFilter}
          initialAttentionFilter={initialAttentionFilter}
          attentionFilterSets={attentionFilterSets}
        />
      ) : null}
    </PageShell>
  );
}
