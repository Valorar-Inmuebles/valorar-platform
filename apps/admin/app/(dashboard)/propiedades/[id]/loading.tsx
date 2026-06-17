import { PropertyDetailSkeleton } from "@/components/property/property-detail-skeleton";
import { PageShell } from "@/components/shared/page-shell";

export default function PropiedadDetalleLoading() {
  return (
    <PageShell title="Propiedad">
      <PropertyDetailSkeleton />
    </PageShell>
  );
}
