import { PropertyListSkeleton } from "@/components/property/property-list-skeleton";
import { PageShell } from "@/components/shared/page-shell";

export default function PropiedadPublicacionesLoading() {
  return (
    <PageShell title="Publicaciones">
      <PropertyListSkeleton />
    </PageShell>
  );
}
