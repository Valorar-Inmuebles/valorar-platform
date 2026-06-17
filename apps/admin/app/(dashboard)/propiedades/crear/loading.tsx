import { PropertyFormSkeleton } from "@/components/property/property-form-skeleton";
import { PageShell } from "@/components/shared/page-shell";
import { propertyCreateBreadcrumbs } from "@/lib/property/breadcrumbs";

export default function PropiedadCrearLoading() {
  return (
    <PageShell
      title="Nueva propiedad"
      breadcrumbs={propertyCreateBreadcrumbs()}
    >
      <PropertyFormSkeleton />
    </PageShell>
  );
}
