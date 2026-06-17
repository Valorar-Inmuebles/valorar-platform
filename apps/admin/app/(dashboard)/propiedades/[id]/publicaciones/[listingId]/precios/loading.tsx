import { PropertyDetailSkeleton } from "@/components/property/property-detail-skeleton";
import { PageShell } from "@/components/shared/page-shell";

export default function PropiedadPreciosLoading() {
  return (
    <PageShell title="Precios">
      <PropertyDetailSkeleton />
    </PageShell>
  );
}
