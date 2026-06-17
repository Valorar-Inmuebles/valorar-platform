import { PropertyListSkeleton } from "@/components/property/property-list-skeleton";
import { PageShell } from "@/components/shared/page-shell";
import { propertyListBreadcrumbs } from "@/lib/property/breadcrumbs";

export default function PropiedadesLoading() {
  return (
    <PageShell title="Propiedades" breadcrumbs={propertyListBreadcrumbs()}>
      <PropertyListSkeleton />
    </PageShell>
  );
}
