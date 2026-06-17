import { Card, CardContent } from "@repo/ui/card";
import { SkeletonBar } from "@/components/shared/skeleton-bar";

export function PropertyListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SkeletonBar className="h-8 w-full max-w-sm" />
        <SkeletonBar className="h-9 w-full max-w-xl" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
              >
                <div className="space-y-2">
                  <SkeletonBar className="w-3/4" />
                  <SkeletonBar className="h-3 w-1/3" />
                </div>
                <SkeletonBar className="w-2/3" />
                <SkeletonBar className="w-3/4" />
                <SkeletonBar className="h-6 w-24 rounded-full" />
                <SkeletonBar className="h-8 w-40 justify-self-end" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
