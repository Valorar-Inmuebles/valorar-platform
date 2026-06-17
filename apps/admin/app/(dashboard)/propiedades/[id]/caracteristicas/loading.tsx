import { PropertyDetailSkeleton } from "@/components/property/property-detail-skeleton";
import { PageShell } from "@/components/shared/page-shell";

export default function PropiedadCaracteristicasLoading() {
  return (
    <PageShell title="Características">
      <PropertyDetailSkeleton />
    </PageShell>
  );
}
