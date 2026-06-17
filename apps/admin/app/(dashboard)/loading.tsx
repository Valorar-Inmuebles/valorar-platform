import { DashboardHomeSkeleton } from "@/components/dashboard/dashboard-home-skeleton";
import { PageShell } from "@/components/shared/page-shell";

export default function DashboardHomeLoading() {
  return (
    <PageShell title="Inicio">
      <DashboardHomeSkeleton />
    </PageShell>
  );
}
