type DevelopmentsEditorialSkeletonProps = {
  count?: number;
};

export function DevelopmentsEditorialSkeleton({
  count = 3,
}: DevelopmentsEditorialSkeletonProps) {
  return (
    <div className="space-y-8">
      <div className="h-7 w-56 animate-pulse rounded bg-surface-alt" />
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col gap-6 border-b border-border pb-8 sm:flex-row"
        >
          <div className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-surface-alt sm:w-64 md:w-72 lg:w-80" />
          <div className="flex flex-1 flex-col justify-center gap-3">
            <div className="h-6 w-2/3 animate-pulse rounded bg-surface-alt" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-surface-alt" />
            <div className="h-4 w-full animate-pulse rounded bg-surface-alt" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-surface-alt" />
            <div className="mt-2 h-11 w-40 animate-pulse rounded-xl bg-surface-alt" />
          </div>
        </div>
      ))}
    </div>
  );
}
