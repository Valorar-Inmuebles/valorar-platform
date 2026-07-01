import { SkeletonBar } from "@/components/shared/skeleton-bar";

type PropertyDetailSkeletonProps = {
  /** When true, skip sub-nav skeleton (provided by layout). */
  embedded?: boolean;
};

export function PropertyDetailSkeleton({
  embedded = false,
}: PropertyDetailSkeletonProps) {
  return (
    <div className="space-y-6">
      {!embedded ? (
        <div className="flex flex-wrap gap-2 border-b border-border pb-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBar key={index} className="h-8 w-24 rounded-md" />
          ))}
        </div>
      ) : null}

      <div className="space-y-4">
        <SkeletonBar className="h-5 w-32" />
        <SkeletonBar className="h-4 w-64" />
      </div>

      <div className="space-y-4 rounded-xl p-6 ring-1 ring-border/70">
        <SkeletonBar className="h-5 w-48" />
        <SkeletonBar className="h-4 w-full" />
        <SkeletonBar className="h-4 w-5/6" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonBar key={index} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
