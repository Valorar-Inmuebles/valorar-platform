import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@repo/ui/button";
import { PropertyEmptyState } from "@/components/property/property-empty-state";
import { PropertyListingTable } from "@/components/property/property-listing-table";
import { PropertyPageShell } from "@/components/property/property-page-shell";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { ApiError } from "@/lib/api/client";
import { propertyPublicacionesBreadcrumbs } from "@/lib/property/breadcrumbs";
import { loadPropertyPublishabilityContext } from "@/lib/property/load-publishability-context";

type PropiedadPublicacionesPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PropiedadPublicacionesPage({
  params,
}: PropiedadPublicacionesPageProps) {
  const { id } = await params;

  try {
    const { property, listings, summary: publishability } =
      await loadPropertyPublishabilityContext(id);

    const publishabilityByListingId = Object.fromEntries(
      publishability.listings.map((listing) => [listing.listingId, listing]),
    );

    return (
      <PropertyPageShell
        propertyId={id}
        title={property.title}
        description="Publicaciones comerciales de la propiedad."
        breadcrumbs={propertyPublicacionesBreadcrumbs(id, property.title)}
        actions={
          <Link href={`/propiedades/${id}/publicaciones/crear`}>
            <Button>Nueva publicación</Button>
          </Link>
        }
      >
        {listings.length === 0 ? (
          <PropertyEmptyState
            title="Sin publicaciones"
            description="Creá una publicación de venta, alquiler o temporario para esta propiedad."
            action={
              <Link href={`/propiedades/${id}/publicaciones/crear`}>
                <Button>Nueva publicación</Button>
              </Link>
            }
          />
        ) : (
          <PropertyListingTable
            propertyId={id}
            listings={listings}
            publishabilityByListingId={publishabilityByListingId}
          />
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
          : "No se pudieron cargar las publicaciones.";

    return (
      <PropertyPageShell
        propertyId={id}
        title="Publicaciones"
        breadcrumbs={propertyPublicacionesBreadcrumbs(id, "Propiedad")}
      >
        <ApiErrorPanel message={message} />
      </PropertyPageShell>
    );
  }
}
