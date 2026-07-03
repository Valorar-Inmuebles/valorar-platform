import type { Metadata } from "next";
import { Suspense } from "react";
import { DevelopmentsEditorialSection } from "@/components/development/developments-editorial-section";
import { DevelopmentsEditorialSkeleton } from "@/components/development/developments-editorial-skeleton";
import { DevelopmentsListLayout } from "@/components/development/developments-list-layout";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { SiteContainer } from "@/components/layout/site-container";
import { Pagination } from "@/components/property/pagination";
import { getPublicDevelopments } from "@/lib/api/public-development";
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
  return <DevelopmentsEditorialSkeleton count={3} />;
}

async function DevelopmentsEditorialList({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parsePropertyListSearchParams(searchParams);
  const hasActiveFilters = hasActiveLocationFilters(filters);
  const { data, meta, unavailable } = await getPublicDevelopments(filters);

  return (
    <>
      <DevelopmentsEditorialSection
        developments={data}
        unavailable={unavailable}
        hasActiveFilters={hasActiveFilters}
        total={meta.total}
      />

      {!unavailable && data.length > 0 ? (
        <Pagination
          page={meta.page}
          totalPages={meta.totalPages}
          filters={filters}
          buildPageUrl={buildDevelopmentListUrl}
          ariaLabel="Paginación de emprendimientos"
        />
      ) : null}
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
            <DevelopmentsEditorialList searchParams={params} />
          </DevelopmentsListLayout>
        </Suspense>
      </div>
    </SiteContainer>
  );
}
