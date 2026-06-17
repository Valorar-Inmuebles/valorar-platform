import { PropertyDetailSkeleton } from "@/components/property/property-detail-skeleton";
import { PageShell } from "@/components/shared/page-shell";

export default function PropiedadImagenesLoading() {
  return (
    <PageShell title="Imágenes">
      <PropertyDetailSkeleton />
    </PageShell>
  );
}
