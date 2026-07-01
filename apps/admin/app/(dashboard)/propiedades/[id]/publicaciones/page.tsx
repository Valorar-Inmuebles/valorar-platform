import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Button } from "@repo/ui/button";
import { PropertyCommercializationView } from "@/components/property/property-commercialization-view";
import { PropertyEmptyState } from "@/components/property/property-empty-state";
import { PropertyPageShell } from "@/components/property/property-page-shell";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { ApiError } from "@/lib/api/client";
import { propertyCommercializationBreadcrumbs } from "@/lib/property/breadcrumbs";
import { loadCommercializationContext } from "@/lib/property/load-commercialization-context";

type PropiedadComercializacionPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PropiedadComercializacionPage({
  params,
}: PropiedadComercializacionPageProps) {
  const { id } = await params;

  try {
    const { property, listings, publishabilityByListingId, pricesByListingId } =
      await loadCommercializationContext(id);

    return (
      <PropertyPageShell
        propertyId={id}
        title={property.title}
        description="Operaciones comerciales, precios y visibilidad en la web."
        breadcrumbs={propertyCommercializationBreadcrumbs(id, property.title)}
        actions={
          <Link href={`/propiedades/${id}/publicaciones/crear`}>
            <Button>Nueva operación</Button>
          </Link>
        }
      >
        {listings.length === 0 ? (
          <PropertyEmptyState
            title="Sin operaciones comerciales"
            description="Creá una operación de venta, alquiler o temporario para comercializar esta propiedad."
            action={
              <Link href={`/propiedades/${id}/publicaciones/crear`}>
                <Button>Nueva operación</Button>
              </Link>
            }
          />
        ) : (
          <Suspense fallback={null}>
            <PropertyCommercializationView
              propertyId={id}
              propertySlug={property.slug}
              listings={listings}
              pricesByListingId={pricesByListingId}
              publishabilityByListingId={publishabilityByListingId}
            />
          </Suspense>
        )}
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
          : "No se pudo cargar la comercialización.";

    return (
      <PropertyPageShell
        propertyId={id}
        title="Comercialización"
        breadcrumbs={propertyCommercializationBreadcrumbs(id, "Propiedad")}
      >
        <ApiErrorPanel message={message} />
      </PropertyPageShell>
    );
  }
}
