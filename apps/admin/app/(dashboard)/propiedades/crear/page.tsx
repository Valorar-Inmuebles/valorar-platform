import Link from "next/link";
import { Button } from "@repo/ui/button";
import { PropertyForm } from "@/components/property/property-form";
import { PageShell } from "@/components/shared/page-shell";
import { propertyCreateBreadcrumbs } from "@/lib/property/breadcrumbs";

export default function PropiedadCrearPage() {
  return (
    <PageShell
      title="Nueva propiedad"
      description="Completá los datos principales del inmueble."
      breadcrumbs={propertyCreateBreadcrumbs()}
      actions={
        <Link href="/propiedades">
          <Button variant="secondary">Volver al listado</Button>
        </Link>
      }
    >
      <PropertyForm mode="create" />
    </PageShell>
  );
}
