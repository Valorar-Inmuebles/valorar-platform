import { notFound } from "next/navigation";
import { PropertyFeatureManager } from "@/components/property/property-feature-manager";
import { PropertyPageShell } from "@/components/property/property-page-shell";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import { ApiError } from "@/lib/api/client";
import { listPropertyFeatureAssignments } from "@/lib/api/property-feature-assignment";
import { listPropertyFeatures } from "@/lib/api/property-feature";
import { getProperty } from "@/lib/api/property";
import { propertyCaracteristicasBreadcrumbs } from "@/lib/property/breadcrumbs";

type PropiedadCaracteristicasPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PropiedadCaracteristicasPage({
  params,
}: PropiedadCaracteristicasPageProps) {
  const { id } = await params;

  try {
    const [property, catalog, assignments] = await Promise.all([
      getProperty(id),
      listPropertyFeatures({ isActive: true }),
      listPropertyFeatureAssignments(id),
    ]);

    return (
      <PropertyPageShell
        propertyId={id}
        title={property.title}
        description="Características y amenities del inmueble."
        breadcrumbs={propertyCaracteristicasBreadcrumbs(id, property.title)}
      >
        <PropertyFeatureManager
          propertyId={id}
          catalog={catalog}
          assignments={assignments}
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
          : "No se pudieron cargar las características.";

    return (
      <PropertyPageShell
        propertyId={id}
        title="Características"
        breadcrumbs={propertyCaracteristicasBreadcrumbs(id, "Propiedad")}
      >
        <ApiErrorPanel message={message} />
      </PropertyPageShell>
    );
  }
}
