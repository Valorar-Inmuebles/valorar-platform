import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@repo/ui/button";
import { PropertyListingForm } from "@/components/property/property-listing-form";
import { PropertyPageShell } from "@/components/property/property-page-shell";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { ApiError } from "@/lib/api/client";
import { getProperty } from "@/lib/api/property";

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
      <PropertyPageShell propertyId={id} embedded>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Nueva operación
              </h2>
              <p className="text-sm text-muted">Alta de operación comercial.</p>
            </div>
            <Link href={`/propiedades/${id}/publicaciones`}>
              <Button variant="secondary">Volver a comercialización</Button>
            </Link>
          </div>
          <PropertyListingForm
            propertyId={id}
            propertySlug={property.slug}
            mode="create"
          />
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
      <PropertyPageShell propertyId={id} embedded>
        <ApiErrorPanel message={message} />
      </PropertyPageShell>
    );
  }
}
