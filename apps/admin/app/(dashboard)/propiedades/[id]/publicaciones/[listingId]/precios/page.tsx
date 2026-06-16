import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@repo/ui/button";
import { PropertyPageShell } from "@/components/property/property-page-shell";
import { PropertyPriceManager } from "@/components/property/property-price-manager";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { ApiError } from "@/lib/api/client";
import { listPropertyPrices } from "@/lib/api/property-price";
import { getPropertyListing } from "@/lib/api/property-listing";
import { getProperty } from "@/lib/api/property";
import { getListingTypeLabel } from "@/lib/format/listing-labels";
import { propertyPreciosBreadcrumbs } from "@/lib/property/breadcrumbs";

type PropiedadPreciosPageProps = {
  params: Promise<{ id: string; listingId: string }>;
};

export default async function PropiedadPreciosPage({
  params,
}: PropiedadPreciosPageProps) {
  const { id, listingId } = await params;

  try {
    const [property, listing, prices] = await Promise.all([
      getProperty(id),
      getPropertyListing(listingId),
      listPropertyPrices(listingId),
    ]);

    if (listing.propertyId !== id) {
      notFound();
    }

    const listingLabel = getListingTypeLabel(listing.listingType);

    return (
      <PropertyPageShell
        propertyId={id}
        title={property.title}
        description={`Precios — ${listingLabel}`}
        breadcrumbs={propertyPreciosBreadcrumbs(
          id,
          property.title,
          listingId,
          listingLabel,
        )}
        actions={
          <Link href={`/propiedades/${id}/publicaciones/${listingId}`}>
            <Button variant="secondary" size="sm">
              Volver a publicación
            </Button>
          </Link>
        }
      >
        <PropertyPriceManager
          propertyId={id}
          listingId={listingId}
          listingStatus={listing.status}
          prices={prices}
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
          : "No se pudo cargar el contexto de precios.";

    return (
      <PropertyPageShell
        propertyId={id}
        title="Precios"
        breadcrumbs={propertyPreciosBreadcrumbs(
          id,
          "Propiedad",
          listingId,
          "Publicación",
        )}
      >
        <ApiErrorPanel message={message} />
      </PropertyPageShell>
    );
  }
}
