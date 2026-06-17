import Link from "next/link";
import { Button } from "@repo/ui/button";
import { PropertyEmptyState } from "@/components/property/property-empty-state";
import { PageShell } from "@/components/shared/page-shell";
import { propertyListBreadcrumbs } from "@/lib/property/breadcrumbs";

export default function PropertyNotFound() {
  return (
    <PageShell
      title="Propiedad no encontrada"
      breadcrumbs={[
        ...propertyListBreadcrumbs(),
        { label: "No encontrada" },
      ]}
    >
      <PropertyEmptyState
        title="Propiedad no encontrada"
        description="La propiedad no existe o no pertenece a la inmobiliaria seleccionada."
        action={
          <Link href="/propiedades">
            <Button variant="secondary">Volver al listado</Button>
          </Link>
        }
      />
    </PageShell>
  );
}
