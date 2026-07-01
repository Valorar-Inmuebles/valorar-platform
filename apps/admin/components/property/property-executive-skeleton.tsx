import { SkeletonBar } from "@/components/shared/skeleton-bar";

export function PropertyExecutiveSkeleton() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl px-4 py-3 ring-1 ring-border/60 sm:px-5 sm:py-3.5">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBar key={index} className="h-5 w-16 rounded-md" />
          ))}
        </div>
        <SkeletonBar className="mt-3 h-6 w-2/3 max-w-md" />
        <SkeletonBar className="mt-2 h-4 w-1/2 max-w-sm" />
        <SkeletonBar className="mt-3 h-3 w-3/4 max-w-lg" />
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonBar key={index} className="h-16 rounded-lg" />
        ))}
      </div>

      <div className="flex gap-1 border-b border-border pb-0">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBar key={index} className="mb-[-1px] h-9 w-24 rounded-none" />
        ))}
      </div>
    </div>
  );
}
