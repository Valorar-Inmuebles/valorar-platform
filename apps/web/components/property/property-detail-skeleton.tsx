import { SiteContainer } from "@/components/layout/site-container";

export function PropertyDetailSkeleton() {
  return (
    <>
      <SiteContainer className="py-4 md:py-6">
        <div className="aspect-[16/10] w-full animate-pulse rounded-2xl bg-surface-alt" />
      </SiteContainer>

      <SiteContainer className="py-10 md:py-14">
        <div className="h-4 w-56 animate-pulse rounded bg-surface-alt" />

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            <div className="h-8 w-3/4 animate-pulse rounded bg-surface-alt" />
            <div className="h-5 w-1/2 animate-pulse rounded bg-surface-alt" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-2xl bg-surface-alt"
                />
              ))}
            </div>
            <div className="h-40 w-full animate-pulse rounded-2xl bg-surface-alt" />
            <div className="h-56 w-full animate-pulse rounded-2xl bg-surface-alt" />
          </div>

          <div className="space-y-4">
            <div className="h-64 animate-pulse rounded-2xl bg-surface-alt lg:sticky lg:top-24" />
            <div className="h-40 animate-pulse rounded-2xl bg-surface-alt" />
          </div>
        </div>
      </SiteContainer>
    </>
  );
}
