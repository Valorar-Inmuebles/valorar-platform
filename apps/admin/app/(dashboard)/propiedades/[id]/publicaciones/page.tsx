import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Button } from "@repo/ui/button";
import { PropertyCommercializationView } from "@/components/property/property-commercialization-view";
import { PropertyEmptyState } from "@/components/property/property-empty-state";
import { PropertyPageShell } from "@/components/property/property-page-shell";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { ApiError } from "@/lib/api/client";
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
      <PropertyPageShell propertyId={id} embedded>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Comercialización
              </h2>
              <p className="text-sm text-muted">
                Operaciones comerciales, precios y visibilidad en la web.
              </p>
            </div>
            <Link href={`/propiedades/${id}/publicaciones/crear`}>
              <Button>Nueva operación</Button>
            </Link>
          </div>

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
          : "No se pudo cargar la comercialización.";

    return (
      <PropertyPageShell propertyId={id} embedded>
        <ApiErrorPanel message={message} />
      </PropertyPageShell>
    );
  }
}
