import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@repo/ui/button";
import { PropertyListingForm } from "@/components/property/property-listing-form";
import { PropertyPageShell } from "@/components/property/property-page-shell";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { ApiError } from "@/lib/api/client";
import { getProperty } from "@/lib/api/property";
import { propertyListingCreateBreadcrumbs } from "@/lib/property/breadcrumbs";

type PropiedadPublicacionCrearPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PropiedadPublicacionCrearPage({
  params,
}: PropiedadPublicacionCrearPageProps) {
  const { id } = await params;

  try {
    const property = await getProperty(id);

    return (
      <PropertyPageShell
        propertyId={id}
        title={property.title}
        description="Nueva operación comercial."
        breadcrumbs={propertyListingCreateBreadcrumbs(id, property.title)}
        actions={
          <Link href={`/propiedades/${id}/publicaciones`}>
            <Button variant="secondary">Volver a comercialización</Button>
          </Link>
        }
      >
        <PropertyListingForm
          propertyId={id}
          propertySlug={property.slug}
          mode="create"
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
          : "No se pudo cargar la propiedad.";

    return (
      <PropertyPageShell
        propertyId={id}
        title="Nueva publicación"
        breadcrumbs={propertyListingCreateBreadcrumbs(id, "Propiedad")}
      >
        <ApiErrorPanel message={message} />
      </PropertyPageShell>
    );
  }
}
