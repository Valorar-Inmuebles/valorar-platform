import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@repo/ui/button";
import { PropertyListingForm } from "@/components/property/property-listing-form";
import { PropertyListingStatusBadge } from "@/components/property/property-listing-status-badge";
import { PropertyPageShell } from "@/components/property/property-page-shell";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { ApiError } from "@/lib/api/client";
import { getPropertyListing } from "@/lib/api/property-listing";
import { getProperty } from "@/lib/api/property";
import { getListingTypeLabel } from "@/lib/format/listing-labels";
import { propertyListingEditBreadcrumbs } from "@/lib/property/breadcrumbs";

type PropiedadListingDetallePageProps = {
  params: Promise<{ id: string; listingId: string }>;
};

export default async function PropiedadListingDetallePage({
  params,
}: PropiedadListingDetallePageProps) {
  const { id, listingId } = await params;

  try {
    const [property, listing] = await Promise.all([
      getProperty(id),
      getPropertyListing(listingId),
    ]);

    if (listing.propertyId !== id) {
      notFound();
    }

    const listingLabel = getListingTypeLabel(listing.listingType);

    return (
      <PropertyPageShell
        propertyId={id}
        title={property.title}
        description={`Publicación — ${listingLabel}`}
        breadcrumbs={propertyListingEditBreadcrumbs(
          id,
          property.title,
          listingLabel,
        )}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PropertyListingStatusBadge status={listing.status} />
            <Link
              href={`/propiedades/${id}/publicaciones/${listingId}/precios`}
            >
              <Button variant="secondary" size="sm">
                Precios
              </Button>
            </Link>
            <Link href={`/propiedades/${id}/publicaciones`}>
              <Button variant="secondary" size="sm">
                Volver al listado
              </Button>
            </Link>
          </div>
        }
      >
        <PropertyListingForm
          propertyId={id}
          mode="edit"
          listing={listing}
        />
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
          : "No se pudo cargar la publicación.";

    return (
      <PropertyPageShell
        propertyId={id}
        title="Publicación"
        breadcrumbs={propertyListingEditBreadcrumbs(
          id,
          "Propiedad",
          "Publicación",
        )}
      >
        <ApiErrorPanel message={message} />
      </PropertyPageShell>
    );
  }
}
