import { PropertyDetailSkeleton } from "@/components/property/property-detail-skeleton";
import { PageShell } from "@/components/shared/page-shell";

export default function PropiedadListingDetalleLoading() {
  return (
    <PageShell title="Publicación">
      <PropertyDetailSkeleton />
    </PageShell>
  );
}
