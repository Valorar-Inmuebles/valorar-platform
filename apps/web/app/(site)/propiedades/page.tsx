import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { SiteContainer } from "@/components/layout/site-container";
import { Pagination } from "@/components/property/pagination";
import { PropertiesListLayout } from "@/components/property/properties-list-layout";
import { PropertyEmptyState } from "@/components/property/property-empty-state";
import { PropertyGrid } from "@/components/property/property-grid";
import { PropertyGridSkeleton } from "@/components/property/property-grid-skeleton";
import { PublicPropertyCard } from "@/components/property/public-property-card";
import {
  buildPropertiesListTitle,
  PropertyResultsCount,
} from "@/components/property/property-results-count";
import { getPublicProperties } from "@/lib/api/public-property";
import { getListingTypeLabel } from "@/lib/format/labels";
import { createPageMetadata } from "@/lib/seo/metadata";
import {
  hasActivePropertyListFilters,
  parsePropertyListSearchParams,
} from "@/lib/url/search-params";

type PropertiesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function buildPropertiesDescription(
  filters: ReturnType<typeof parsePropertyListSearchParams>,
): string {
  const parts = ["Explorá propiedades en venta, alquiler y temporario."];

  if (filters.city) {
    parts.push(`Resultados en ${filters.city}.`);
  }

  if (filters.listingType) {
    parts.push(`Operación: ${getListingTypeLabel(filters.listingType)}.`);
  }

  return parts.join(" ");
}

export async function generateMetadata({
  searchParams,
}: PropertiesPageProps): Promise<Metadata> {
  const params = await searchParams;
  const filters = parsePropertyListSearchParams(params);
  const title = buildPropertiesListTitle(filters);
  const description = buildPropertiesDescription(filters);

  return createPageMetadata({
    title,
    description,
    path: "/propiedades",
  });
}

export const revalidate = 60;

function PropertiesListFallback() {
  return (
    <div className="space-y-6">
      <PropertyGridSkeleton count={6} columns="listing" />
    </div>
  );
}

async function PropertiesResults({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parsePropertyListSearchParams(searchParams);
  const { data, meta } = await getPublicProperties(filters);

  return (
    <>
      <PropertyResultsCount total={meta.total} />

      <div className="mt-6">
        {data.length === 0 ? (
          <PropertyEmptyState
            title={
              hasActivePropertyListFilters(filters)
                ? "No encontramos propiedades con estos filtros"
                : "No hay propiedades disponibles"
            }
            description={
              hasActivePropertyListFilters(filters)
                ? "Probá ajustando los filtros o limpiá la búsqueda."
                : "Volvé a consultar más tarde para ver nuevas publicaciones."
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
            />
          </>
        )}
      </div>
    </>
  );
}

export default async function PropertiesPage({
  searchParams,
}: PropertiesPageProps) {
  const params = await searchParams;
  const filters = parsePropertyListSearchParams(params);
  const pageTitle = buildPropertiesListTitle(filters);

  return (
    <SiteContainer className="py-10 md:py-14">
      <Breadcrumbs
        items={[
          { label: "Inicio", href: "/" },
          { label: "Propiedades" },
        ]}
      />

      <header className="mt-6">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          {pageTitle}
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted">
          {buildPropertiesDescription(filters)}
        </p>
      </header>

      <div className="mt-10">
        <Suspense fallback={<PropertiesListFallback />}>
          <PropertiesListLayout>
            <PropertiesResults searchParams={params} />
          </PropertiesListLayout>
        </Suspense>
      </div>
    </SiteContainer>
  );
}
