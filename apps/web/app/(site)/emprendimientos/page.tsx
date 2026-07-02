import type { Metadata } from "next";
import { Suspense } from "react";
import { DevelopmentsListLayout } from "@/components/development/developments-list-layout";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { SiteContainer } from "@/components/layout/site-container";
import { Pagination } from "@/components/property/pagination";
import { PropertyEmptyState } from "@/components/property/property-empty-state";
import { PropertyGrid } from "@/components/property/property-grid";
import { PropertyGridSkeleton } from "@/components/property/property-grid-skeleton";
import { PropertyResultsCount } from "@/components/property/property-results-count";
import { PropertyUnavailableState } from "@/components/property/property-unavailable-state";
import { PublicPropertyCard } from "@/components/property/public-property-card";
import { getPublicDevelopments } from "@/lib/api/public-property";
import { createPageMetadata } from "@/lib/seo/metadata";
import {
  buildDevelopmentListUrl,
  hasActiveLocationFilters,
  parsePropertyListSearchParams,
} from "@/lib/url/search-params";

type DevelopmentsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function buildDevelopmentsDescription(
  filters: ReturnType<typeof parsePropertyListSearchParams>,
): string {
  if (filters.city) {
    return `Emprendimientos disponibles en ${filters.city}.`;
  }

  return "Explorá emprendimientos inmobiliarios disponibles.";
}

export async function generateMetadata({
  searchParams,
}: DevelopmentsPageProps): Promise<Metadata> {
  const params = await searchParams;
  const filters = parsePropertyListSearchParams(params);

  return createPageMetadata({
    title: filters.city ? `Emprendimientos en ${filters.city}` : "Emprendimientos",
    description: buildDevelopmentsDescription(filters),
    path: "/emprendimientos",
    noIndex: true,
  });
}

export const revalidate = 60;

function DevelopmentsListFallback() {
  return (
    <div className="space-y-6">
      <PropertyGridSkeleton count={6} columns="listing" />
    </div>
  );
}

async function DevelopmentsResults({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parsePropertyListSearchParams(searchParams);
  const { data, meta, unavailable } = await getPublicDevelopments(filters);

  return (
    <>
      <PropertyResultsCount total={meta.total} />

      <div className="mt-6">
        {unavailable ? (
          <PropertyUnavailableState />
        ) : data.length === 0 ? (
          <PropertyEmptyState
            title={
              hasActiveLocationFilters(filters)
                ? "No encontramos emprendimientos con estos filtros"
                : "No hay emprendimientos disponibles"
            }
            description={
              hasActiveLocationFilters(filters)
                ? "Probá ajustando los filtros o limpiá la búsqueda."
                : "Volvé a consultar más tarde para ver nuevos proyectos."
            }
          />
        ) : (
          <>
            <PropertyGrid columns="listing">
              {data.map((property) => (
                <PublicPropertyCard key={property.id} property={property} />
              ))}
            </PropertyGrid>

            <Pagination
              page={meta.page}
              totalPages={meta.totalPages}
              filters={filters}
              buildPageUrl={buildDevelopmentListUrl}
              ariaLabel="Paginación de emprendimientos"
            />
          </>
        )}
      </div>
    </>
  );
}

export default async function DevelopmentsPage({
  searchParams,
}: DevelopmentsPageProps) {
  const params = await searchParams;
  const filters = parsePropertyListSearchParams(params);
  const pageTitle = filters.city
    ? `Emprendimientos en ${filters.city}`
    : "Emprendimientos";

  return (
    <SiteContainer className="py-10 md:py-14">
      <Breadcrumbs
        items={[
          { label: "Inicio", href: "/" },
          { label: "Emprendimientos" },
        ]}
      />

      <header className="mt-6">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          {pageTitle}
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted">
          {buildDevelopmentsDescription(filters)}
        </p>
      </header>

      <div className="mt-10">
        <Suspense fallback={<DevelopmentsListFallback />}>
          <DevelopmentsListLayout>
            <DevelopmentsResults searchParams={params} />
          </DevelopmentsListLayout>
        </Suspense>
      </div>
    </SiteContainer>
  );
}
