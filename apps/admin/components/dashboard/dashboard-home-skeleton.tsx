import { SkeletonBar } from "@/components/shared/skeleton-bar";

export function DashboardHomeSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <SkeletonBar className="h-4 w-24" />
        <SkeletonBar className="h-3 w-56" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBar key={index} className="h-[5.25rem] rounded-xl" />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <SkeletonBar className="h-4 w-36" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonBar key={index} className="h-[5.25rem] rounded-xl" />
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2 xl:gap-5">
        <SkeletonBar className="h-[22rem] rounded-xl" />
        <SkeletonBar className="h-[22rem] rounded-xl" />
      </div>

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBar key={index} className="h-9 w-36 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
