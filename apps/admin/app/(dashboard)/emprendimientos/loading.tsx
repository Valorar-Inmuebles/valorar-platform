import { DevelopmentListSkeleton } from "@/components/development/development-list-skeleton";
import { PageShell } from "@/components/shared/page-shell";
import { developmentListBreadcrumbs } from "@/lib/development/breadcrumbs";

export default function EmprendimientosLoading() {
  return (
    <PageShell title="Emprendimientos" breadcrumbs={developmentListBreadcrumbs()}>
      <DevelopmentListSkeleton />
    </PageShell>
  );
}
