type PropertyGridSkeletonProps = {
  count?: number;
  columns?: "featured" | "recent" | "listing";
};

export function PropertyGridSkeleton({
  count = 3,
  columns = "featured",
}: PropertyGridSkeletonProps) {
  const gridClass =
    columns === "featured"
      ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      : columns === "listing"
        ? "grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
        : "grid gap-6 sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={gridClass} aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-2xl border border-border bg-background"
        >
          <div className="aspect-[4/3] animate-pulse bg-slate-200" />
          <div className="space-y-3 p-5">
            <div className="h-6 w-1/3 animate-pulse rounded bg-slate-200" />
            <div className="h-5 w-4/5 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
