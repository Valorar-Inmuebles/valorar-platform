import { SiteContainer } from "@/components/layout/site-container";

export function PropertyDetailSkeleton() {
  return (
    <>
      <div className="aspect-[16/10] w-full animate-pulse bg-slate-200" />

      <SiteContainer className="py-10 md:py-14">
        <div className="h-4 w-56 animate-pulse rounded bg-slate-200" />

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            <div className="h-8 w-3/4 animate-pulse rounded bg-slate-200" />
            <div className="h-5 w-1/2 animate-pulse rounded bg-slate-200" />
            <div className="h-24 w-full animate-pulse rounded-2xl bg-slate-200" />
            <div className="h-40 w-full animate-pulse rounded-2xl bg-slate-200" />
            <div className="h-56 w-full animate-pulse rounded-2xl bg-slate-200" />
          </div>

          <div className="h-56 animate-pulse rounded-2xl bg-slate-200 lg:sticky lg:top-24" />
        </div>
      </SiteContainer>
    </>
  );
}
