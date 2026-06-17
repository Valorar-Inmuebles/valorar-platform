import { Card, CardContent } from "@repo/ui/card";
import { SkeletonBar } from "@/components/shared/skeleton-bar";

export function PropertyDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBar key={index} className="h-8 w-24 rounded-md" />
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          <SkeletonBar className="h-5 w-48" />
          <SkeletonBar className="h-4 w-full" />
          <SkeletonBar className="h-4 w-5/6" />
          <SkeletonBar className="h-4 w-2/3" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <SkeletonBar className="h-5 w-40" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonBar key={index} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
