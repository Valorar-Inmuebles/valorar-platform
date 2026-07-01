import { SkeletonBar } from "@/components/shared/skeleton-bar";

export function DashboardHomeSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <SkeletonBar className="h-4 w-24" />
        <SkeletonBar className="h-3 w-56" />
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBar key={index} className="h-[4.5rem] rounded-lg" />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <SkeletonBar className="h-4 w-36" />
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-5 lg:gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonBar key={index} className="h-[4.5rem] rounded-lg" />
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SkeletonBar className="h-40 rounded-lg" />
        <SkeletonBar className="h-40 rounded-lg" />
      </div>

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBar key={index} className="h-9 w-36 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
