import { SiteContainer } from "@/components/layout/site-container";
import { PropertyGridSkeleton } from "@/components/property/property-grid-skeleton";

export default function PropertiesLoading() {
  return (
    <SiteContainer className="py-10 md:py-14">
      <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
      <div className="mt-6 h-10 w-72 max-w-full animate-pulse rounded bg-slate-200" />
      <div className="mt-3 h-5 w-full max-w-xl animate-pulse rounded bg-slate-200" />

      <div className="mt-10 grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="hidden space-y-4 lg:block">
          <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
        </div>
        <div>
          <div className="mb-6 h-4 w-48 animate-pulse rounded bg-slate-200" />
          <PropertyGridSkeleton count={6} columns="listing" />
        </div>
      </div>
    </SiteContainer>
  );
}
