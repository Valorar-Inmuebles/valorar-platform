import { Card, CardContent } from "@repo/ui/card";
import { SkeletonBar } from "@/components/shared/skeleton-bar";

export function DashboardHomeSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <SkeletonBar className="h-7 w-48" />
        <SkeletonBar className="h-4 w-72" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="space-y-3 p-5">
              <SkeletonBar className="h-4 w-24" />
              <SkeletonBar className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 p-5">
            <SkeletonBar className="h-5 w-40" />
            <SkeletonBar className="h-4 w-full" />
            <SkeletonBar className="h-4 w-5/6" />
            <SkeletonBar className="h-4 w-2/3" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-5">
            <SkeletonBar className="h-5 w-32" />
            <SkeletonBar className="h-10 w-full" />
            <SkeletonBar className="h-10 w-full" />
            <SkeletonBar className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
