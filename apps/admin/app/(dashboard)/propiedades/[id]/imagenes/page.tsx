import { notFound } from "next/navigation";
import { PropertyImageManager } from "@/components/property/property-image-manager";
import { PropertyPageShell } from "@/components/property/property-page-shell";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { ApiError } from "@/lib/api/client";
import { listPropertyImages } from "@/lib/api/property-image";
import { getProperty } from "@/lib/api/property";
import { propertyImagenesBreadcrumbs } from "@/lib/property/breadcrumbs";

type PropiedadImagenesPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PropiedadImagenesPage({
  params,
}: PropiedadImagenesPageProps) {
  const { id } = await params;

  try {
    const [property, images] = await Promise.all([
      getProperty(id),
      listPropertyImages(id),
    ]);

    return (
      <PropertyPageShell
        propertyId={id}
        title={property.title}
        description="Galería e imágenes de la propiedad."
        breadcrumbs={propertyImagenesBreadcrumbs(id, property.title)}
      >
        <PropertyImageManager
          propertyId={id}
          propertyIsActive={property.isActive}
          images={images}
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
          : "No se pudieron cargar las imágenes.";

    return (
      <PropertyPageShell
        propertyId={id}
        title="Imágenes"
        breadcrumbs={propertyImagenesBreadcrumbs(id, "Propiedad")}
      >
        <ApiErrorPanel message={message} />
      </PropertyPageShell>
    );
  }
}
