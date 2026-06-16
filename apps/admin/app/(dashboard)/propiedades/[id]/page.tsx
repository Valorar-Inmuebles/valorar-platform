import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@repo/ui/button";
import { PropertyForm } from "@/components/property/property-form";
import { PropertyPageShell } from "@/components/property/property-page-shell";
import { PropertyPublishabilityPanel } from "@/components/property/property-publishability-panel";
import { PropertyStatusBadge } from "@/components/property/property-status-badge";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { ApiError } from "@/lib/api/client";
import { propertyGeneralBreadcrumbs } from "@/lib/property/breadcrumbs";
import { loadPropertyPublishabilityContext } from "@/lib/property/load-publishability-context";

type PropiedadDetallePageProps = {
  params: Promise<{ id: string }>;
};

export default async function PropiedadDetallePage({
  params,
}: PropiedadDetallePageProps) {
  const { id } = await params;

  try {
    const { property, summary: publishability } =
      await loadPropertyPublishabilityContext(id);

    return (
      <PropertyPageShell
        propertyId={id}
        title={property.title}
        description="Datos generales del inmueble."
        breadcrumbs={propertyGeneralBreadcrumbs(id, property.title)}
        actions={
          <div className="flex flex-wrap gap-2">
            <PropertyStatusBadge status={publishability.statusVariant} />
            <Link href="/propiedades">
              <Button variant="secondary" size="sm">
                Volver al listado
              </Button>
            </Link>
          </div>
        }
      >
        <div className="space-y-6">
          <PropertyPublishabilityPanel summary={publishability} />
          <PropertyForm mode="edit" property={property} />
        </div>
      </PropertyPageShell>
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    const message =
      error instanceof ApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "No se pudo cargar la propiedad.";

    return (
      <PropertyPageShell
        propertyId={id}
        title="Propiedad"
        breadcrumbs={propertyGeneralBreadcrumbs(id, "Propiedad")}
      >
        <ApiErrorPanel message={message} />
      </PropertyPageShell>
    );
  }
}
